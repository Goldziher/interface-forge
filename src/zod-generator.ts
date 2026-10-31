import {
    type ZodArray,
    type ZodDate,
    type ZodEnum,
    type ZodLiteral,
    type ZodMap,
    type ZodNumber,
    type ZodObject,
    type ZodRecord,
    type ZodSet,
    type ZodString,
    type ZodTuple,
    type ZodType,
} from 'zod/v4';
import type { $ZodCheckRegex, $ZodChecks } from 'zod/v4/core';
import { isFunction, isNotNullish, isObject, isRecord } from '@tool-belt/type-predicates';
import {
    COLLECTION_SIZES,
    DEFAULT_MAX_DEPTH,
    NUMBER_CONSTRAINTS,
    STRING_LENGTHS,
    ULID_EPOCH_FROM,
    ULID_EPOCH_TO,
} from './constants';
import { getProperty, merge } from './utils';
import {
    builtinTypeMapping,
    getSchemaTypeName,
    hasZodV3Structure,
    isGreaterThanCheck,
    isLengthEqualsCheck,
    isLessThanCheck,
    isMaxLengthCheck,
    isMinLengthCheck,
    isMultipleOfCheck,
    isNumberFormatCheck,
    isRegexCheck,
    isStringFormatCheck,
    type NumberConstraints,
    primitiveTypeHandlers,
    type SchemaGeneratorFunction,
    schemaHelpers,
    type SizeConstraints,
    zodDateFormats,
    zodStringFormats,
    zodTypeGuards,
    type ZodTypeHandler,
} from './zod-schema';
import type { ZodFactory } from './zod';

function collectNumberConstraints(checks: unknown[]): NumberConstraints {
    const constraints: NumberConstraints = { isInt: false };

    for (const check of checks) {
        if (isLessThanCheck(check)) {
            const inclusive = schemaHelpers.getCheckInclusive(check);
            const value = schemaHelpers.getCheckValue(check);
            if (typeof value === 'number') {
                constraints.max = inclusive ? value : value - NUMBER_CONSTRAINTS.PRECISION_OFFSET;
            }
        } else if (isGreaterThanCheck(check)) {
            const inclusive = schemaHelpers.getCheckInclusive(check);
            const value = schemaHelpers.getCheckValue(check);
            if (typeof value === 'number') {
                constraints.min = inclusive ? value : value + NUMBER_CONSTRAINTS.PRECISION_OFFSET;
            }
        } else if (isMultipleOfCheck(check)) {
            const value = schemaHelpers.getCheckValue(check);
            if (typeof value === 'number') {
                constraints.step = value;
            }
        } else if (isNumberFormatCheck(check)) {
            const format = schemaHelpers.getCheckFormat(check);
            if (format === 'int32' || format === 'uint32' || format === 'safeint') {
                constraints.isInt = true;
            }
        } else if ((getProperty(check, ['kind']) as string | undefined) === 'int') {
            constraints.isInt = true;
        }
    }

    return constraints;
}

function resolveNumberBounds({ isInt, max, min, step }: NumberConstraints): { max: number; min: number } {
    let safeMin: number;
    if (min !== undefined && Number.isFinite(min)) {
        safeMin = min;
    } else if (step && min === undefined) {
        safeMin = 0;
    } else {
        safeMin = isInt ? NUMBER_CONSTRAINTS.DEFAULT_INT_MIN : NUMBER_CONSTRAINTS.DEFAULT_MIN;
    }

    let safeMax: number;
    if (max !== undefined && Number.isFinite(max)) {
        safeMax = max;
    } else {
        safeMax = isInt ? NUMBER_CONSTRAINTS.DEFAULT_INT_MAX : NUMBER_CONSTRAINTS.DEFAULT_MAX;
    }

    return { max: safeMax, min: safeMin };
}

function roundToStep(value: number, step: number): number {
    let result = Math.round(value / step) * step;
    if (step < 1) {
        const precision = Math.ceil(-Math.log10(step));
        result = Math.round(result * Math.pow(10, precision)) / Math.pow(10, precision);
    }
    return Object.is(result, -0) ? 0 : result;
}

/**
 * Schema generator class that handles recursive generation of values from any ZodType.
 * This class is responsible for all the complex schema traversal and generation logic.
 */
export class ZodSchemaGenerator {
    public readonly factory: ZodFactory<never>;
    private dateFormatGenerators = {
        date: () => new Date().toISOString().split('T')[0],
        datetime: () => new Date().toISOString(),
        duration: (generator: ZodSchemaGenerator) => {
            const hours = generator.factory.number.int({ max: 23, min: 0 });
            const minutes = generator.factory.number.int({ max: 59, min: 0 });
            const seconds = generator.factory.number.int({ max: 59, min: 0 });
            return `PT${hours}H${minutes}M${seconds}S`;
        },
        time: () => {
            const date = new Date();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        },
    } as const;
    private readonly NOT_FOUND = Symbol('NOT_FOUND');

    private stringFormatGenerators = {
        base64: (generator: ZodSchemaGenerator) => Buffer.from(generator.factory.string.alpha(16)).toString('base64'),
        base64url: (generator: ZodSchemaGenerator) =>
            Buffer.from(generator.factory.string.alpha(16)).toString('base64url'),
        cidrv4: (generator: ZodSchemaGenerator) =>
            `${generator.factory.internet.ipv4()}/${generator.factory.number.int({ max: 32, min: 0 })}`,
        cidrv6: (generator: ZodSchemaGenerator) =>
            `${generator.factory.internet.ipv6()}/${generator.factory.number.int({ max: 128, min: 0 })}`,
        cuid: (generator: ZodSchemaGenerator) => `c${generator.factory.string.alphanumeric(24).toLowerCase()}`,
        cuid2: (generator: ZodSchemaGenerator) => generator.factory.string.alphanumeric(24).toLowerCase(),
        e164: (generator: ZodSchemaGenerator) => {
            const countryCode = generator.factory.string.numeric({
                exclude: ['0'],
                length: 1,
            });
            const length = generator.factory.number.int({ max: 14, min: 10 });
            const number = generator.factory.string.numeric({ length });
            return `+${countryCode}${number}`;
        },
        email: (generator: ZodSchemaGenerator) => generator.factory.internet.email(),
        emoji: (generator: ZodSchemaGenerator) =>
            generator.factory.helpers.arrayElement(['😀', '😎', '🚀', '🌟', '❤️', '🔥', '✨', '🎉']),
        ipv4: (generator: ZodSchemaGenerator) => generator.factory.internet.ipv4(),
        ipv6: (generator: ZodSchemaGenerator) => generator.factory.internet.ipv6(),
        jwt: (generator: ZodSchemaGenerator) => {
            const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
            const payload = Buffer.from(
                `{"sub":"${generator.factory.string.uuid()}","iat":${Math.floor(Date.now() / 1000)}}`,
            ).toString('base64url');
            const signature = generator.factory.string.alphanumeric(43);
            return `${header}.${payload}.${signature}`;
        },
        ksuid: (generator: ZodSchemaGenerator) => generator.factory.string.alphanumeric(27),
        nanoid: (generator: ZodSchemaGenerator) => generator.factory.string.nanoid(),
        // faker's ulid() stamps the wall clock unless given a refDate; draw it from the seeded generator ~keep
        // so a seeded factory yields the same ULIDs on every run. ~keep
        ulid: (generator: ZodSchemaGenerator) =>
            generator.factory.string.ulid({
                refDate: generator.factory.date.between({ from: ULID_EPOCH_FROM, to: ULID_EPOCH_TO }),
            }),
        url: (generator: ZodSchemaGenerator) => generator.factory.internet.url(),
        uuid: (generator: ZodSchemaGenerator) => generator.factory.string.uuid(),
        xid: (generator: ZodSchemaGenerator) => {
            const chars = '0123456789abcdefghijklmnopqrstuv';
            let xid = '';
            for (let i = 0; i < STRING_LENGTHS.XID; i++) {
                xid += generator.factory.helpers.arrayElement([...chars]);
            }
            return xid;
        },
    } as const;

    private readonly typeHandlers = new Map<string, ZodTypeHandler>();

    constructor(factory: ZodFactory<never>) {
        this.factory = factory;
        this.initializeBuiltinHandlers();
    }

    /**
     * Generate a value from any ZodType schema.
     *
     * @param schema
     * @param currentDepth
     *
     * @returns The generated value
     */
    generateFromSchema(schema: ZodType, currentDepth = 0): unknown {
        const metadataResult = this.tryGenerateFromMetadata(schema);
        if (metadataResult !== undefined) {
            return metadataResult;
        }

        const handlerResult = this.tryGenerateFromTypeHandler(schema, currentDepth);
        if (handlerResult !== undefined) {
            return handlerResult;
        }

        return this.generateFromZodType(schema, currentDepth);
    }

    getDepthLimitFallback(schema: ZodType): unknown {
        if (zodTypeGuards.optional(schema)) {
            return undefined;
        }
        if (zodTypeGuards.array(schema)) {
            return [];
        }
        if (zodTypeGuards.string(schema)) {
            const checks = schemaHelpers.getChecks(schema);
            for (const check of checks) {
                if (schemaHelpers.isStringFormatCheck(check)) {
                    const format = schemaHelpers.getCheckFormat(check);
                    if (format === 'email') {
                        return this.factory.internet.email();
                    }
                    if (format === 'uuid' || format === 'guid') {
                        return this.factory.string.uuid();
                    }
                    if (format === 'url') {
                        return this.factory.internet.url();
                    }
                }
            }
            return '';
        }
        if (zodTypeGuards.number(schema)) {
            return 0;
        }
        if (zodTypeGuards.object(schema)) {
            return {};
        }
        return this.factory.lorem.word();
    }

    /**
     * Register a custom handler for a specific Zod type.
     *
     * @param typeName
     * @param handler
     *
     * @returns The factory instance
     */
    registerTypeHandler(typeName: string, handler: ZodTypeHandler): this {
        this.typeHandlers.set(typeName, handler);
        return this;
    }

    /**
     * Register multiple type handlers at once.
     *
     * @param handlers
     *
     * @returns The factory instance
     */
    registerTypeHandlers(handlers: Record<string, ZodTypeHandler>): this {
        Object.entries(handlers).forEach(([typeName, handler]) => {
            this.typeHandlers.set(typeName, handler);
        });
        return this;
    }

    private calculateArrayLength(constraints: SizeConstraints): number {
        const { exactLength, maxLength, minLength } = constraints;

        if (exactLength !== undefined) {
            return exactLength;
        }

        return this.calculateTargetLength(minLength, maxLength, 0, 10);
    }

    private calculateTargetLength(
        min: number | undefined,
        max: number | undefined,
        defaultMin: number,
        defaultMax: number,
    ): number {
        if (min !== undefined && max !== undefined) {
            return this.factory.number.int({ max, min });
        }

        if (min !== undefined) {
            return min + this.factory.number.int({ max: 10, min: 0 });
        }

        if (max !== undefined) {
            return this.factory.number.int({ max, min: 1 });
        }

        return this.factory.number.int({ max: defaultMax, min: defaultMin });
    }

    private extractSizeConstraints(checks: $ZodChecks[] | undefined): SizeConstraints {
        const constraints: SizeConstraints = {};

        if (!checks || !Array.isArray(checks)) {
            return constraints;
        }

        for (const check of checks) {
            if (isMinLengthCheck(check)) {
                const value = schemaHelpers.getCheckValue(check);
                if (typeof value === 'number') {
                    constraints.minLength = value;
                }
            } else if (isMaxLengthCheck(check)) {
                const value = schemaHelpers.getCheckValue(check);
                if (typeof value === 'number') {
                    constraints.maxLength = value;
                }
            } else if (isLengthEqualsCheck(check)) {
                const value = schemaHelpers.getCheckValue(check);
                if (typeof value === 'number') {
                    constraints.exactLength = value;
                }
            }
        }

        return constraints;
    }

    private generateArray(schema: ZodArray, currentDepth: number): unknown[] {
        const maxDepth = this.factory.options?.maxDepth ?? DEFAULT_MAX_DEPTH;

        if (currentDepth >= maxDepth) {
            return [];
        }

        const def = schemaHelpers.getDef(schema);
        const itemSchema = schemaHelpers.getArrayElement(schema);

        const checks = getProperty(def, ['checks']) as $ZodChecks[] | undefined;
        const constraints = this.extractSizeConstraints(checks);
        if (constraints.exactLength === undefined) {
            const v3ExactLength = getProperty(def, ['exactLength', 'value']) as number | undefined;
            if (v3ExactLength !== undefined) {
                constraints.exactLength = v3ExactLength;
            }
        }
        if (constraints.minLength === undefined) {
            const v3MinLength = getProperty(def, ['minLength', 'value']) as number | undefined;
            if (v3MinLength !== undefined) {
                constraints.minLength = v3MinLength;
            }
        }
        if (constraints.maxLength === undefined) {
            const v3MaxLength = getProperty(def, ['maxLength', 'value']) as number | undefined;
            if (v3MaxLength !== undefined) {
                constraints.maxLength = v3MaxLength;
            }
        }

        const length = this.calculateArrayLength(constraints);

        if (!itemSchema) {
            return [];
        }

        return Array.from({ length }, () => {
            return this.generateFromSchema(itemSchema, currentDepth + 1);
        });
    }

    private generateDate(schema: ZodDate): Date {
        const checks = schemaHelpers.getChecks(schema);

        let minDate: Date | undefined;
        let maxDate: Date | undefined;

        for (const check of checks) {
            const checkType = schemaHelpers.getCheckType(check);
            const checkValue = schemaHelpers.getCheckValue(check);
            if (checkType === 'greater_than' || checkType === 'min') {
                if (checkValue instanceof Date || typeof checkValue === 'string' || typeof checkValue === 'number') {
                    minDate = new Date(checkValue);
                }
            } else if (
                (checkType === 'less_than' || checkType === 'max') &&
                (checkValue instanceof Date || typeof checkValue === 'string' || typeof checkValue === 'number')
            ) {
                maxDate = new Date(checkValue);
            }
        }

        const yearInMs = 365 * 24 * 60 * 60 * 1000;

        if (minDate && maxDate) {
            return this.factory.date.between({ from: minDate, to: maxDate });
        } else if (minDate) {
            const defaultMaxDate = new Date(Date.now() + yearInMs);
            return this.factory.date.between({
                from: minDate,
                to: defaultMaxDate > minDate ? defaultMaxDate : new Date(minDate.getTime() + yearInMs),
            });
        } else if (maxDate) {
            const defaultMinDate = new Date(Date.now() - yearInMs);
            return this.factory.date.between({
                from: defaultMinDate < maxDate ? defaultMinDate : new Date(maxDate.getTime() - yearInMs),
                to: maxDate,
            });
        }

        return this.factory.date.recent();
    }

    private generateFromRegex(check: $ZodCheckRegex): string {
        const v4Pattern = getProperty(check, ['_zod', 'def', 'pattern']) as RegExp | undefined;
        const v3Regex = getProperty(check, ['regex']) as RegExp | undefined;
        const v3Pattern = getProperty(check, ['pattern']) as RegExp | undefined;

        const pattern = v4Pattern ?? v3Regex ?? v3Pattern;
        if (pattern instanceof RegExp) {
            const { source } = pattern;
            if (source.includes('@')) {
                return this.factory.internet.email();
            }

            if (source === '^[a-zA-Z0-9_]+$') {
                return this.factory.string.alphanumeric(10);
            }
            if (source === '^[A-Z]{3}-\\d{3}$') {
                return `${this.factory.string.alpha({
                    casing: 'upper',
                    length: 3,
                })}-${this.factory.string.numeric({ length: 3 })}`;
            }

            if (
                source.includes('+') &&
                source.includes('\\d') &&
                (source.includes('-') || source.includes('\\-')) &&
                source.includes('(')
            ) {
                return `+${this.factory.string.numeric({ length: 1 })} (${this.factory.string.numeric({ length: 3 })}) ${this.factory.string.numeric({ length: 3 })}-${this.factory.string.numeric({ length: 4 })}`;
            }

            if (source === '^\\d{5}$') {
                return this.factory.string.numeric({ length: 5 });
            }

            if (source === '^key_') {
                return `key_${this.factory.string.alphanumeric(10)}`;
            }
        }

        return this.factory.string.alphanumeric(10);
    }

    private generateFromZodType(schema: ZodType, currentDepth: number): unknown {
        const handlers = [
            () => this.generateFromFormatOrPrimitive(schema),
            () => this.generateFromCollection(schema, currentDepth),
            () => this.generateFromWrapper(schema, currentDepth),
            () => this.generateFromComposite(schema, currentDepth),
            () => this.generateFromPipeline(schema, currentDepth),
        ];
        for (const handler of handlers) {
            const result = handler();
            if (result !== this.NOT_FOUND) {
                return result;
            }
        }
        return this.factory.lorem.word();
    }

    private generateFromFormatOrPrimitive(schema: ZodType): unknown {
        const isV3String = hasZodV3Structure(schema) && getSchemaTypeName(schema) === 'ZodString';

        if (!isV3String) {
            const stringFormatResult = this.tryGenerateFromMapping(
                schema,
                zodStringFormats,
                this.stringFormatGenerators,
            );
            if (stringFormatResult !== this.NOT_FOUND) {
                return stringFormatResult;
            }

            const dateFormatResult = this.tryGenerateFromMapping(schema, zodDateFormats, this.dateFormatGenerators);
            if (dateFormatResult !== this.NOT_FOUND) {
                return dateFormatResult;
            }
        }

        return this.tryGenerateFromMapping(schema, zodTypeGuards, {
            ...primitiveTypeHandlers,
            date: (generator: ZodSchemaGenerator, schema: ZodDate) => generator.generateDate(schema),
            enum: (generator: ZodSchemaGenerator, schema: ZodEnum) => {
                const values = schemaHelpers.getEnumValues(schema);
                return generator.factory.helpers.arrayElement(values);
            },
            literal: (_: ZodSchemaGenerator, schema: ZodLiteral) => {
                return schemaHelpers.getLiteralValue(schema);
            },
            number: (generator: ZodSchemaGenerator, schema: ZodNumber) => generator.generateNumber(schema),
            string: (generator: ZodSchemaGenerator, schema: ZodString) => generator.generateString(schema),
        } as unknown as Record<string, SchemaGeneratorFunction>);
    }

    private generateFromCollection(schema: ZodType, currentDepth: number): unknown {
        if (zodTypeGuards.tuple(schema)) {
            return this.generateTuple(schema, currentDepth);
        }
        if (zodTypeGuards.map(schema)) {
            return this.generateMap(schema, currentDepth);
        }
        if (zodTypeGuards.set(schema)) {
            return this.generateSet(schema, currentDepth);
        }
        if (zodTypeGuards.array(schema)) {
            return this.generateArray(schema, currentDepth);
        }
        if (zodTypeGuards.object(schema)) {
            return this.generateObject(schema, currentDepth);
        }
        if (zodTypeGuards.record(schema)) {
            return this.generateRecord(schema, currentDepth);
        }
        return this.NOT_FOUND;
    }

    private generateFromWrapper(schema: ZodType, currentDepth: number): unknown {
        if (zodTypeGuards.default(schema) || zodTypeGuards.catch(schema)) {
            const innerType = schemaHelpers.getInnerType(schema);
            if (!innerType) {
                return this.factory.lorem.word();
            }
            return this.generateFromSchema(innerType, currentDepth + 1);
        }
        if (zodTypeGuards.optional(schema)) {
            const innerType = schemaHelpers.getInnerType(schema);
            if (!innerType) {
                return undefined;
            }
            return this.factory.datatype.boolean({ probability: 0.7 })
                ? this.generateFromSchema(innerType, currentDepth + 1)
                : undefined;
        }
        if (zodTypeGuards.nullable(schema)) {
            const innerType = schemaHelpers.getInnerType(schema);
            if (!innerType) {
                return null;
            }
            return this.factory.datatype.boolean({ probability: 0.8 })
                ? this.generateFromSchema(innerType, currentDepth + 1)
                : null;
        }
        return this.NOT_FOUND;
    }

    private generateFromComposite(schema: ZodType, currentDepth: number): unknown {
        if (zodTypeGuards.union(schema)) {
            const options = schemaHelpers.getUnionOptions(schema);
            if (options.length === 0) {
                return this.factory.lorem.word();
            }
            const randomOption = this.factory.helpers.arrayElement(options);
            return this.generateFromSchema(randomOption, currentDepth + 1);
        }
        if (zodTypeGuards.discriminatedUnion(schema)) {
            const def = schemaHelpers.getDef(schema);
            const options = getProperty(def, ['options']) as Record<string, ZodType> | undefined | ZodType[];
            if (!options) {
                return this.factory.lorem.word();
            }
            const optionsArray = Array.isArray(options) ? options : Object.values(options);
            const randomOption = this.factory.helpers.arrayElement(optionsArray);
            return this.generateFromSchema(randomOption, currentDepth + 1);
        }
        if (zodTypeGuards.intersection(schema)) {
            return this.generateIntersection(schema, currentDepth);
        }
        return this.NOT_FOUND;
    }

    private generateIntersection(schema: ZodType, currentDepth: number): unknown {
        const def = schemaHelpers.getDef(schema);
        const left = getProperty(def, ['left']) as undefined | ZodType;
        const right = getProperty(def, ['right']) as undefined | ZodType;

        if (!left || !right) {
            return this.factory.lorem.word();
        }

        const leftResult = this.generateFromSchema(left, currentDepth + 1);
        const rightResult = this.generateFromSchema(right, currentDepth + 1);

        if (isObject(leftResult) && isNotNullish(leftResult) && isObject(rightResult) && isNotNullish(rightResult)) {
            return merge(leftResult, rightResult);
        }
        return leftResult;
    }

    private generateFromPipeline(schema: ZodType, currentDepth: number): unknown {
        if (zodTypeGuards.pipe(schema)) {
            const def = schemaHelpers.getDef(schema);
            const out = getProperty(def, ['out']) as undefined | ZodType;
            if (out) {
                return this.generateFromSchema(out, currentDepth + 1);
            }
        }
        if (zodTypeGuards.transform(schema)) {
            return this.factory.lorem.word();
        }
        if (zodTypeGuards.promise(schema)) {
            throw new Error(
                'z.promise() schemas require custom type handlers. Use .withTypeHandler("ZodPromise", yourHandler) to provide a custom promise generator.',
            );
        }
        return this.NOT_FOUND;
    }

    private generateMap(schema: ZodMap, currentDepth: number): Map<unknown, unknown> {
        const def = schemaHelpers.getDef(schema);
        const keyType = getProperty(def, ['keyType']) as undefined | ZodType;
        const valueType = getProperty(def, ['valueType']) as undefined | ZodType;
        const map = new Map();
        const size = this.factory.number.int({
            max: COLLECTION_SIZES.DEFAULT_MAP_MAX,
            min: COLLECTION_SIZES.DEFAULT_MAP_MIN,
        });

        if (!keyType || !valueType) {
            return map;
        }

        for (let i = 0; i < size; i++) {
            const key = this.generateFromSchema(keyType, currentDepth + 1);
            const value = this.generateFromSchema(valueType, currentDepth + 1);
            map.set(key, value);
        }

        return map;
    }

    private generateNumber(schema: ZodNumber): number {
        const constraints = collectNumberConstraints(schemaHelpers.getChecks(schema));
        const { isInt, step } = constraints;

        const options = resolveNumberBounds(constraints);
        let result = isInt ? this.factory.number.int(options) : this.factory.number.float(options);

        if (step && step > 0) {
            result = roundToStep(result, step);
        }

        if (isInt) {
            result = Math.floor(result);
        }

        if (Object.is(result, -0)) {
            result = 0;
        }

        if (step && result === 0) {
            result = step;
        }

        return Number.isFinite(result) ? result : 0;
    }

    private generateObject(schema: ZodObject, currentDepth: number): Record<string, unknown> {
        const maxDepth = this.factory.options?.maxDepth ?? DEFAULT_MAX_DEPTH;
        const result: Record<string, unknown> = {};

        if (currentDepth >= maxDepth) {
            return {};
        }

        const shape = schemaHelpers.getObjectShape(schema);
        if (!shape) {
            return {};
        }

        for (const [key, fieldSchema] of Object.entries(shape)) {
            result[key] = this.generateFromSchema(fieldSchema, currentDepth + 1);
        }

        return result;
    }

    private generateRecord(schema: ZodRecord, currentDepth: number): Record<string, unknown> {
        const def = schemaHelpers.getDef(schema);
        const keyType = getProperty(def, ['keyType']) as undefined | ZodType;
        const valueType = schemaHelpers.getRecordValueType(schema);
        const numKeys = this.factory.number.int({
            max: COLLECTION_SIZES.DEFAULT_RECORD_MAX,
            min: COLLECTION_SIZES.DEFAULT_RECORD_MIN,
        });
        const result: Record<string, unknown> = {};

        if (!valueType) {
            return result;
        }

        for (let i = 0; i < numKeys; i++) {
            const key = keyType
                ? String(this.generateFromSchema(keyType, currentDepth + 1))
                : this.factory.lorem.word();
            result[key] = this.generateFromSchema(valueType, currentDepth + 1);
        }

        return result;
    }

    private generateSet(schema: ZodSet, currentDepth: number): Set<unknown> {
        const def = schemaHelpers.getDef(schema);
        const valueType = getProperty(def, ['valueType']) as undefined | ZodType;
        const set = new Set();
        const size = this.factory.number.int({
            max: COLLECTION_SIZES.DEFAULT_SET_MAX,
            min: COLLECTION_SIZES.DEFAULT_SET_MIN,
        });

        if (!valueType) {
            return set;
        }

        for (let i = 0; i < size; i++) {
            const value = this.generateFromSchema(valueType, currentDepth + 1);
            set.add(value);
        }

        return set;
    }

    private generateString(schema: ZodString): string {
        const checks = schemaHelpers.getChecks(schema);

        for (const check of checks) {
            if (isStringFormatCheck(check)) {
                const format = schemaHelpers.getCheckFormat(check);
                switch (format) {
                    case 'email': {
                        return this.factory.internet.email();
                    }
                    case 'guid':
                    case 'uuid': {
                        return this.factory.string.uuid();
                    }
                    case 'regex': {
                        if (isRegexCheck(check)) {
                            return this.generateFromRegex(check);
                        }
                        break;
                    }
                    case undefined: {
                        break;
                    }
                    case 'url': {
                        return this.factory.internet.url();
                    }
                    default: {
                        break;
                    }
                }
            }
        }

        const constraints = this.extractSizeConstraints(checks);
        return this.generateStringWithConstraints(constraints);
    }

    private generateStringWithConstraints(constraints: SizeConstraints): string {
        const { exactLength, maxLength, minLength } = constraints;

        if (exactLength !== undefined) {
            return this.factory.string.alphanumeric(exactLength);
        }

        const targetLength = this.calculateTargetLength(minLength, maxLength, 5, 20);
        return this.factory.string.alphanumeric(targetLength);
    }

    private generateTuple(schema: ZodTuple, currentDepth: number): unknown[] {
        const def = schemaHelpers.getDef(schema);
        const items = getProperty(def, ['items']) as undefined | ZodType[];
        const rest = getProperty(def, ['rest']) as undefined | ZodType;

        if (!items || !Array.isArray(items)) {
            return [];
        }

        const result = items.map((itemSchema) => this.generateFromSchema(itemSchema, currentDepth + 1));

        if (rest) {
            const restCount = this.factory.number.int({ max: 3, min: 0 });
            for (let i = 0; i < restCount; i++) {
                result.push(this.generateFromSchema(rest, currentDepth + 1));
            }
        }

        return result;
    }

    private initializeBuiltinHandlers(): void {
        const builtinHandlers: Record<string, ZodTypeHandler> = {
            ZodBigInt: (_schema, generator) => BigInt(generator.factory.number.int({ max: 1_000_000, min: 0 })),

            ZodCustom: () => {
                throw new Error(
                    'ZodFactory cannot generate data for z.custom() schemas without additional configuration',
                );
            },

            ZodFunction: () => {
                throw new Error(
                    'z.function() schemas require custom type handlers. Use .withTypeHandler("ZodFunction", yourHandler) to provide a custom function generator.',
                );
            },

            ZodLazy: (schema, generator, currentDepth) => {
                const def = schemaHelpers.getDef(schema);
                const getter = getProperty(def, ['getter']) as (() => ZodType) | undefined;
                const maxDepth = generator.factory.options?.maxDepth ?? DEFAULT_MAX_DEPTH;

                if (!getter || !isFunction(getter)) {
                    return {};
                }

                if (currentDepth >= maxDepth) {
                    try {
                        const innerSchema = getter();
                        return generator.getDepthLimitFallback(innerSchema);
                    } catch {
                        return {};
                    }
                }

                try {
                    const innerSchema = getter();
                    return generator.generateFromSchema(innerSchema, currentDepth + 1);
                } catch {
                    return {};
                }
            },

            ZodNaN: () => Number.NaN,

            ZodNever: () => {
                throw new Error('ZodNever should never be reached in factory generation');
            },

            ZodPromise: () => {
                throw new Error(
                    'z.promise() schemas require custom type handlers. Use .withTypeHandler("ZodPromise", yourHandler) to provide a custom promise generator.',
                );
            },

            ZodUnknown: (_schema, generator) => generator.factory.lorem.word(),

            ZodVoid: () => undefined,
        };

        this.registerTypeHandlers(builtinHandlers);
    }

    private tryGenerateFromMapping<T extends Record<string, (value: unknown) => boolean>>(
        schema: ZodType,
        guards: T,
        generators: Record<keyof T, SchemaGeneratorFunction>,
    ): unknown {
        for (const [key, guard] of Object.entries(guards)) {
            if (guard(schema)) {
                const generator = generators[key as keyof T] as
                    | ((generator: ZodSchemaGenerator, schema?: unknown) => unknown)
                    | undefined;
                return generator ? generator(this, schema) : this.NOT_FOUND;
            }
        }
        return this.NOT_FOUND;
    }

    private tryGenerateFromMetadata(schema: ZodType): unknown {
        const metadata = isFunction(schema.meta) ? schema.meta() : undefined;
        if (!metadata) {
            return undefined;
        }

        const { description } = metadata;
        if (description && this.factory.options?.generators?.[description]) {
            return this.factory.options.generators[description]();
        }

        if (metadata.example !== undefined) {
            return metadata.example;
        }

        if (metadata.examples) {
            const examples = Array.isArray(metadata.examples)
                ? metadata.examples
                : Object.values(metadata.examples).map((ex: { value?: string } | string) =>
                      isRecord(ex) ? (ex.value ?? '') : ex,
                  );

            if (examples.length > 0) {
                return this.factory.helpers.arrayElement(examples);
            }
        }

        return undefined;
    }

    private tryGenerateFromTypeHandler(schema: ZodType, currentDepth: number): unknown {
        const def = schemaHelpers.getDef(schema);
        if (!def) {
            return undefined;
        }

        const type = getProperty(def, ['type']) as string | undefined;
        if (!type) {
            return undefined;
        }

        const typeName = builtinTypeMapping[type as keyof typeof builtinTypeMapping];

        if (this.typeHandlers.has(typeName)) {
            return this.typeHandlers.get(typeName)!(schema, this, currentDepth);
        }

        return undefined;
    }
}
