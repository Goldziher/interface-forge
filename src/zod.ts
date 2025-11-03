import {
    z,
    ZodAny,
    ZodArray as ZodArrayClass,
    ZodBase64,
    ZodBase64URL,
    ZodBoolean,
    ZodCatch,
    ZodCIDRv4,
    ZodCIDRv6,
    ZodCUID,
    ZodCUID2,
    ZodDate as ZodDateClass,
    ZodDefault,
    ZodDiscriminatedUnion,
    ZodE164,
    ZodEmail,
    ZodEmoji,
    ZodEnum as ZodEnumClass,
    ZodIntersection,
    ZodIPv4,
    ZodIPv6,
    ZodISODate,
    ZodISODateTime,
    ZodISODuration,
    ZodISOTime,
    ZodJWT,
    ZodKSUID,
    ZodLiteral as ZodLiteralClass,
    ZodMap as ZodMapClass,
    ZodNanoID,
    ZodNull,
    ZodNullable,
    ZodNumber as ZodNumberClass,
    ZodObject as ZodObjectClass,
    ZodOptional,
    ZodPipe,
    ZodPromise,
    ZodRecord as ZodRecordClass,
    ZodSet as ZodSetClass,
    ZodString as ZodStringClass,
    ZodTransform,
    ZodTuple as ZodTupleClass,
    ZodULID,
    ZodUndefined,
    ZodUnion,
    ZodUnknown,
    ZodURL,
    ZodUUID,
    ZodVoid,
    ZodXID,
} from 'zod/v4';
import type {
    ZodArray,
    ZodDate,
    ZodEnum,
    ZodLiteral,
    ZodMap,
    ZodNumber,
    ZodObject,
    ZodRecord,
    ZodSet,
    ZodString,
    ZodTuple,
    ZodType,
} from 'zod/v4';
import type { ZodType as ZodV3Type } from 'zod';
import type {
    $ZodCheckGreaterThan,
    $ZodCheckLengthEquals,
    $ZodCheckLessThan,
    $ZodCheckMaxLength,
    $ZodCheckMinLength,
    $ZodCheckMultipleOf,
    $ZodCheckNumberFormat,
    $ZodCheckRegex,
    $ZodChecks,
    $ZodCheckStringFormat,
    $ZodType,
} from 'zod/v4/core';
import { Factory, FactoryFunction, type FactoryOptions } from './index';
import { ConfigurationError, FixtureError } from './errors';
import {
    createTypeGuard,
    isAsyncFunction,
    isFunction,
    isNotNullish,
    isObject,
    isRecord,
} from '@tool-belt/type-predicates';
// Node.js modules - only available in Node.js environment
let createHash: typeof import('node:crypto').createHash | undefined;

// Conditionally import Node.js modules for fixture functionality
/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, prefer-destructuring */
if (typeof process !== 'undefined' && process.versions?.node) {
    try {
        createHash = require('node:crypto').createHash;
    } catch {
        // Ignore import errors in environments where Node.js modules aren't available
    }
}
/* eslint-enable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, prefer-destructuring */
import { PartialFactoryFunction } from '.';
import {
    COLLECTION_SIZES,
    DEFAULT_MAX_DEPTH,
    NUMBER_CONSTRAINTS,
    STRING_LENGTHS,
} from './constants';
import { getProperty, hasMethod, hasProperty, merge } from './utils';

/**
 * Helper functions to handle both Zod v3 and v4 schema structures
 */
const schemaHelpers = {
    /**
     * Get items schema for array types
     *
     * @param schema
     * @returns The array element type or undefined
     */
    getArrayElement(schema: ZodArray): undefined | ZodType {
        const def = schemaHelpers.getDef(schema);
        return (getProperty(def, ['element']) ?? getProperty(def, ['type'])) as
            | undefined
            | ZodType;
    },

    /**
     * Get format from a string check, handling both v3 and v4
     *
     * @param check
     * @returns The check format or undefined
     */
    getCheckFormat(check: $ZodChecks): string | undefined {
        const v4Format = getProperty(check, ['_zod', 'def', 'format']) as
            | string
            | undefined;
        if (v4Format) {
            return v4Format;
        }

        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        if (
            v3Kind &&
            ['cuid', 'cuid2', 'email', 'regex', 'ulid', 'url', 'uuid'].includes(
                v3Kind,
            )
        ) {
            return v3Kind;
        }
        return getProperty(check, ['format']) as string | undefined;
    },

    /**
     * Get inclusive flag from a check, handling both v3 and v4
     *
     * @param check
     * @returns The inclusive flag or false as default
     */
    getCheckInclusive(check: unknown): boolean {
        const v4Inclusive = getProperty(check, ['_zod', 'def', 'inclusive']) as
            | boolean
            | undefined;
        const v3Inclusive = getProperty(check, ['inclusive']) as
            | boolean
            | undefined;
        return v4Inclusive ?? v3Inclusive ?? false;
    },

    /**
     * Get checks array from a schema definition
     *
     * @param schema
     * @returns Array of checks
     */
    getChecks(schema: ZodType): $ZodChecks[] {
        const def = schemaHelpers.getDef(schema);
        return (getProperty(def, ['checks']) as $ZodChecks[] | undefined) ?? [];
    },

    /**
     * Get check type/kind
     *
     * @param check
     * @returns The check type or undefined
     */
    getCheckType(check: $ZodChecks): string | undefined {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        if (v4CheckType) {
            return v4CheckType;
        }

        return getProperty(check, ['kind']) as string | undefined;
    },

    /**
     * Get the value from a check (for min/max/length checks)
     *
     * @param check
     * @returns The check value
     */
    getCheckValue(check: $ZodChecks): unknown {
        const v4Value = getProperty(check, ['_zod', 'def', 'value']);
        if (v4Value !== undefined) {
            return v4Value;
        }

        const v4Minimum = getProperty(check, ['_zod', 'def', 'minimum']);
        if (v4Minimum !== undefined) {
            return v4Minimum;
        }

        const v4Maximum = getProperty(check, ['_zod', 'def', 'maximum']);
        if (v4Maximum !== undefined) {
            return v4Maximum;
        }

        const v4Length = getProperty(check, ['_zod', 'def', 'length']);
        if (v4Length !== undefined) {
            return v4Length;
        }

        const v3Value = getProperty(check, ['value']);
        if (v3Value !== undefined) {
            return v3Value;
        }

        const v3Minimum = getProperty(check, ['minimum']);
        if (v3Minimum !== undefined) {
            return v3Minimum;
        }

        const v3Maximum = getProperty(check, ['maximum']);
        if (v3Maximum !== undefined) {
            return v3Maximum;
        }

        return getProperty(check, ['length']);
    },

    /**
     * Get the definition object from a schema, handling both v3 and v4
     *
     * @param schema
     * @returns The schema definition
     */
    getDef(schema: ZodType  ): unknown {
        const v4Def = getProperty(schema, ['_zod', 'def']);
        if (v4Def !== undefined) {
            return v4Def;
        }

        return getProperty(schema, ['_def']);
    },

    /**
     * Get enum values
     *
     * @param schema
     * @returns Array of enum values
     */
    getEnumValues(schema: ZodEnum): unknown[] {
        const def = schemaHelpers.getDef(schema);
        const v4Entries = getProperty(def, ['entries']) as
            | Record<string, unknown>
            | undefined;
        if (v4Entries) {
            const values = Object.entries(v4Entries)
                .filter(([key]) => Number.isNaN(Number(key)))
                .map(([, value]) => value);
            return values.length > 0 ? values : Object.values(v4Entries);
        }
        return (getProperty(def, ['values']) as undefined | unknown[]) ?? [];
    },

    /**
     * Get inner type for optional/nullable schemas
     *
     * @param schema
     * @returns The inner type or undefined
     */
    getInnerType(schema: ZodType): undefined | ZodType {
        const def = schemaHelpers.getDef(schema);
        return getProperty(def, ['innerType']) as undefined | ZodType;
    },

    /**
     * Get literal value
     *
     * @param schema
     * @returns The literal value
     */
    getLiteralValue(schema: ZodLiteral): unknown {
        const def = schemaHelpers.getDef(schema);
        const v4Values = getProperty(def, ['values']) as undefined | unknown[];
        if (v4Values && Array.isArray(v4Values) && v4Values.length > 0) {
            return v4Values[0];
        }
        return getProperty(def, ['value']);
    },

    /**
     * Get the shape of an object schema
     *
     * @param schema
     * @returns The object shape or undefined
     */
    getObjectShape(schema: ZodObject): Record<string, ZodType> | undefined {
        const def = schemaHelpers.getDef(schema);

        if (hasMethod(def, 'shape')) {
            return def.shape() as Record<string, ZodType>;
        }

        const shape = getProperty(def, ['shape']);
        if (shape) {
            return shape as Record<string, ZodType>;
        }

        if (hasProperty(schema, 'shape') && isObject(schema.shape)) {
            return schema.shape as Record<string, ZodType>;
        }

        return undefined;
    },

    /**
     * Get value type for record schemas
     *
     * @param schema
     * @returns The record value type or undefined
     */
    getRecordValueType(schema: ZodRecord): undefined | ZodType {
        const def = schemaHelpers.getDef(schema);
        return getProperty(def, ['valueType']) as undefined | ZodType;
    },

    /**
     * Get the type name from a schema definition
     *
     * @param schema
     * @returns The type name or undefined
     */
    getTypeName(schema: ZodType): string | undefined {
        const def = schemaHelpers.getDef(schema);
        const type = getProperty(def, ['type']) as string | undefined;
        if (type) {
            return type;
        }

        return getProperty(def, ['typeName']) as string | undefined;
    },

    /**
     * Get options for union types
     *
     * @param schema
     * @returns Array of union options
     */
    getUnionOptions(schema: ZodUnion): ZodType[] {
        const def = schemaHelpers.getDef(schema);
        return (getProperty(def, ['options']) as undefined | ZodType[]) ?? [];
    },

    /**
     * Check if a check is a string format check
     *
     * @param check
     * @returns True if the check is a string format check
     */
    isStringFormatCheck(check: $ZodChecks): boolean {
        const format = schemaHelpers.getCheckFormat(check);
        return format !== undefined;
    },
};

/**
 * Options for configuring ZodFactory behavior.
 *
 */
export interface ZodFactoryOptions extends FactoryOptions {
    /**
     * Custom generator functions for specific field types.
     *
     * Generators are matched by the field's description metadata.
     *
     * @example
     * ```typescript
     * const factory = new ZodFactory(schema, {
     *   generators: {
     *     // Schema field must have .describe('userId')
     *     userId: () => `USR_${Date.now()}`,
     *     customEmail: () => `test_${Date.now()}@example.com`
     *   }
     * });
     * ```
     */
    generators?: Record<string, () => unknown>;
}

type ZodTypeHandler = (
    schema: ZodType,
    generator: ZodSchemaGenerator,
    currentDepth: number,
) => unknown;

const hasZodV4Structure = (schema: unknown): schema is $ZodType => {
    return isObject(schema) && '_zod' in schema && isObject(schema._zod);
};

const hasZodV3Structure = (schema: unknown): schema is ZodV3Type => {
    return isObject(schema) && '_def' in schema;
};

const getSchemaTypeName = (schema: ZodType  ): string | undefined => {
    if (hasZodV4Structure(schema)) {
        return (
            (schema._zod.def as { type?: string } | undefined)?.type ??
            (schema._zod.def as { typeName?: string } | undefined)?.typeName
        );
    }
    if (hasZodV3Structure(schema)) {
        return (
            // @ts-expect-error, v3 type compatibility
            (schema._def as { type?: string } | undefined)?.type ??
            // @ts-expect-error, v3 type compatibility
            (schema._def as { typeName?: string } | undefined)?.typeName
        );
    }
    return undefined;
};

const createZodTypeGuard = <T extends ZodType>(
    constructor: new (...args: never[]) => T,
    typeName?: string,
) => {
    return createTypeGuard<T>((value: unknown): value is T => {
        try {
            if (value instanceof constructor) {
                return true;
            }

            if (typeName) {
                if (hasZodV3Structure(value)) {
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    const v3TypeName = Reflect.get(value._def, 'typeName') as
                        | string
                        | undefined;
                    if (v3TypeName === typeName) {
                        return true;
                    }
                }

                if (hasZodV4Structure(value)) {
                    const schemaTypeName = getSchemaTypeName(value as ZodType);
                    if (schemaTypeName === typeName) {
                        return true;
                    }
                }
            }

            return false;
        } catch {
            return false;
        }
    });
};

const zodTypeGuards = {
    any: createZodTypeGuard(ZodAny, 'ZodAny'),
    array: createZodTypeGuard(ZodArrayClass, 'ZodArray'),
    boolean: createZodTypeGuard(ZodBoolean, 'ZodBoolean'),
    catch: createZodTypeGuard(ZodCatch, 'ZodCatch'),
    date: createZodTypeGuard(ZodDateClass, 'ZodDate'),
    default: createZodTypeGuard(ZodDefault, 'ZodDefault'),
    discriminatedUnion: createZodTypeGuard(
        ZodDiscriminatedUnion,
        'ZodDiscriminatedUnion',
    ),
    enum: createZodTypeGuard(ZodEnumClass, 'ZodEnum'),
    intersection: createZodTypeGuard(ZodIntersection, 'ZodIntersection'),
    literal: createZodTypeGuard(ZodLiteralClass, 'ZodLiteral'),
    map: createZodTypeGuard(ZodMapClass, 'ZodMap'),
    null: createZodTypeGuard(ZodNull, 'ZodNull'),
    nullable: createZodTypeGuard(ZodNullable, 'ZodNullable'),
    number: createZodTypeGuard(ZodNumberClass, 'ZodNumber'),
    object: createZodTypeGuard(ZodObjectClass, 'ZodObject'),
    optional: createZodTypeGuard(ZodOptional, 'ZodOptional'),
    pipe: createZodTypeGuard(ZodPipe, 'ZodPipeline'),
    promise: createZodTypeGuard(ZodPromise, 'ZodPromise'),
    record: createZodTypeGuard(ZodRecordClass, 'ZodRecord'),
    set: createZodTypeGuard(ZodSetClass, 'ZodSet'),
    string: createZodTypeGuard(ZodStringClass, 'ZodString'),
    transform: createZodTypeGuard(ZodTransform, 'ZodTransform'),
    tuple: createZodTypeGuard(ZodTupleClass, 'ZodTuple'),
    undefined: createZodTypeGuard(ZodUndefined, 'ZodUndefined'),
    union: createZodTypeGuard(ZodUnion, 'ZodUnion'),
    unknown: createZodTypeGuard(ZodUnknown, 'ZodUnknown'),
    void: createZodTypeGuard(ZodVoid, 'ZodVoid'),
} as const;

const zodStringFormats = {
    base64: createZodTypeGuard(ZodBase64, 'ZodString'),
    base64url: createZodTypeGuard(ZodBase64URL, 'ZodString'),
    cidrv4: createZodTypeGuard(ZodCIDRv4, 'ZodString'),
    cidrv6: createZodTypeGuard(ZodCIDRv6, 'ZodString'),
    cuid: createZodTypeGuard(ZodCUID, 'ZodString'),
    cuid2: createZodTypeGuard(ZodCUID2, 'ZodString'),
    e164: createZodTypeGuard(ZodE164, 'ZodString'),
    email: createZodTypeGuard(ZodEmail, 'ZodString'),
    emoji: createZodTypeGuard(ZodEmoji, 'ZodString'),
    ipv4: createZodTypeGuard(ZodIPv4, 'ZodString'),
    ipv6: createZodTypeGuard(ZodIPv6, 'ZodString'),
    jwt: createZodTypeGuard(ZodJWT, 'ZodString'),
    ksuid: createZodTypeGuard(ZodKSUID, 'ZodString'),
    nanoid: createZodTypeGuard(ZodNanoID, 'ZodString'),
    ulid: createZodTypeGuard(ZodULID, 'ZodString'),
    url: createZodTypeGuard(ZodURL, 'ZodString'),
    uuid: createZodTypeGuard(ZodUUID, 'ZodString'),
    xid: createZodTypeGuard(ZodXID, 'ZodString'),
} as const;

const zodDateFormats = {
    date: createZodTypeGuard(ZodISODate, 'ZodString'),
    datetime: createZodTypeGuard(ZodISODateTime, 'ZodString'),
    duration: createZodTypeGuard(ZodISODuration, 'ZodString'),
    time: createZodTypeGuard(ZodISOTime, 'ZodString'),
} as const;

const primitiveTypeHandlers = {
    any: (generator: ZodSchemaGenerator) => generator.factory.lorem.word(),
    boolean: (generator: ZodSchemaGenerator) =>
        generator.factory.datatype.boolean(),
    date: (generator: ZodSchemaGenerator) => generator.factory.date.recent(),
    null: () => null,
    undefined: () => undefined,
    void: () => undefined,
} as const;

const builtinTypeMapping = {
    bigint: 'ZodBigInt',
    custom: 'ZodCustom',
    function: 'ZodFunction',
    lazy: 'ZodLazy',
    nan: 'ZodNaN',
    never: 'ZodNever',
    promise: 'ZodPromise',
    unknown: 'ZodUnknown',
    void: 'ZodVoid',
} as const;

interface NumberConstraints {
    isInt: boolean;
    max?: number;
    min?: number;
    step?: number;
}

interface SizeConstraints {
    exactLength?: number;
    maxLength?: number;
    minLength?: number;
}

const isStringFormatCheck = createTypeGuard<$ZodCheckStringFormat>(
    (check): check is $ZodCheckStringFormat => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return (
            v4CheckType === 'string_format' ||
            ['cuid', 'cuid2', 'email', 'regex', 'ulid', 'url', 'uuid'].includes(
                v3Kind ?? '',
            )
        );
    },
);

const isRegexCheck = createTypeGuard<$ZodCheckRegex>(
    (check): check is $ZodCheckRegex => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        const v4Format = getProperty(check, ['_zod', 'def', 'format']) as
            | string
            | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        const v3Regex = getProperty(check, ['regex']);
        return (
            (v4CheckType === 'string_format' && v4Format === 'regex') ||
            v3Kind === 'regex' ||
            v3Regex instanceof RegExp
        );
    },
);

const isLessThanCheck = createTypeGuard<$ZodCheckLessThan>(
    (check): check is $ZodCheckLessThan => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'less_than' || v3Kind === 'max';
    },
);

const isGreaterThanCheck = createTypeGuard<$ZodCheckGreaterThan>(
    (check): check is $ZodCheckGreaterThan => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'greater_than' || v3Kind === 'min';
    },
);

const isMultipleOfCheck = createTypeGuard<$ZodCheckMultipleOf>(
    (check): check is $ZodCheckMultipleOf => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'multiple_of' || v3Kind === 'multipleOf';
    },
);

const isNumberFormatCheck = createTypeGuard<$ZodCheckNumberFormat>(
    (check): check is $ZodCheckNumberFormat => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        return v4CheckType === 'number_format';
    },
);

const isMaxLengthCheck = createTypeGuard<$ZodCheckMaxLength>(
    (check): check is $ZodCheckMaxLength => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return (
            v4CheckType === 'max_length' ||
            v3Kind === 'maxLength' ||
            v3Kind === 'max'
        );
    },
);

const isMinLengthCheck = createTypeGuard<$ZodCheckMinLength>(
    (check): check is $ZodCheckMinLength => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return (
            v4CheckType === 'min_length' ||
            v3Kind === 'minLength' ||
            v3Kind === 'min'
        );
    },
);

const isLengthEqualsCheck = createTypeGuard<$ZodCheckLengthEquals>(
    (check): check is $ZodCheckLengthEquals => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as
            | string
            | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'length_equals' || v3Kind === 'length';
    },
);

type SchemaGeneratorFunction = (
    generator: ZodSchemaGenerator,
    schema: $ZodType,
) => unknown;

/**
 * Schema generator class that handles recursive generation of values from any ZodType.
 * This class is responsible for all the complex schema traversal and generation logic.
 */
class ZodSchemaGenerator {
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
        base64: (generator: ZodSchemaGenerator) =>
            Buffer.from(generator.factory.string.alpha(16)).toString('base64'),
        base64url: (generator: ZodSchemaGenerator) =>
            Buffer.from(generator.factory.string.alpha(16)).toString(
                'base64url',
            ),
        cidrv4: (generator: ZodSchemaGenerator) =>
            `${generator.factory.internet.ipv4()}/${generator.factory.number.int({ max: 32, min: 0 })}`,
        cidrv6: (generator: ZodSchemaGenerator) =>
            `${generator.factory.internet.ipv6()}/${generator.factory.number.int({ max: 128, min: 0 })}`,
        cuid: (generator: ZodSchemaGenerator) =>
            `c${generator.factory.string.alphanumeric(24).toLowerCase()}`,
        cuid2: (generator: ZodSchemaGenerator) =>
            generator.factory.string.alphanumeric(24).toLowerCase(),
        e164: (generator: ZodSchemaGenerator) => {
            const countryCode = generator.factory.string.numeric({
                exclude: ['0'],
                length: 1,
            });
            const length = generator.factory.number.int({ max: 14, min: 10 });
            const number = generator.factory.string.numeric({ length });
            return `+${countryCode}${number}`;
        },
        email: (generator: ZodSchemaGenerator) =>
            generator.factory.internet.email(),
        emoji: (generator: ZodSchemaGenerator) =>
            generator.factory.helpers.arrayElement([
                '😀',
                '😎',
                '🚀',
                '🌟',
                '❤️',
                '🔥',
                '✨',
                '🎉',
            ]),
        ipv4: (generator: ZodSchemaGenerator) =>
            generator.factory.internet.ipv4(),
        ipv6: (generator: ZodSchemaGenerator) =>
            generator.factory.internet.ipv6(),
        jwt: (generator: ZodSchemaGenerator) => {
            const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString(
                'base64url',
            );
            const payload = Buffer.from(
                `{"sub":"${generator.factory.string.uuid()}","iat":${Math.floor(Date.now() / 1000)}}`,
            ).toString('base64url');
            const signature = generator.factory.string.alphanumeric(43);
            return `${header}.${payload}.${signature}`;
        },
        ksuid: (generator: ZodSchemaGenerator) =>
            generator.factory.string.alphanumeric(27),
        nanoid: (generator: ZodSchemaGenerator) =>
            generator.factory.string.nanoid(),
        ulid: (generator: ZodSchemaGenerator) => {
            const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
            let ulid = '';
            for (let i = 0; i < STRING_LENGTHS.ULID; i++) {
                // eslint-disable-next-line @typescript-eslint/no-misused-spread
                ulid += generator.factory.helpers.arrayElement([...chars]);
            }
            return ulid;
        },
        url: (generator: ZodSchemaGenerator) =>
            generator.factory.internet.url(),
        uuid: (generator: ZodSchemaGenerator) =>
            generator.factory.string.uuid(),
        xid: (generator: ZodSchemaGenerator) => {
            const chars = '0123456789abcdefghijklmnopqrstuv';
            let xid = '';
            for (let i = 0; i < STRING_LENGTHS.XID; i++) {
                // eslint-disable-next-line @typescript-eslint/no-misused-spread
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

        const handlerResult = this.tryGenerateFromTypeHandler(
            schema,
            currentDepth,
        );
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

    private extractSizeConstraints(
        checks: $ZodChecks[] | undefined,
    ): SizeConstraints {
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
            const v3ExactLength = getProperty(def, ['exactLength', 'value']) as
                | number
                | undefined;
            if (v3ExactLength !== undefined) {
                constraints.exactLength = v3ExactLength;
            }
        }
        if (constraints.minLength === undefined) {
            const v3MinLength = getProperty(def, ['minLength', 'value']) as
                | number
                | undefined;
            if (v3MinLength !== undefined) {
                constraints.minLength = v3MinLength;
            }
        }
        if (constraints.maxLength === undefined) {
            const v3MaxLength = getProperty(def, ['maxLength', 'value']) as
                | number
                | undefined;
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
                if (
                    checkValue instanceof Date ||
                    typeof checkValue === 'string' ||
                    typeof checkValue === 'number'
                ) {
                    minDate = new Date(checkValue);
                }
            } else if (
                (checkType === 'less_than' || checkType === 'max') &&
                (checkValue instanceof Date ||
                    typeof checkValue === 'string' ||
                    typeof checkValue === 'number')
            ) {
                maxDate = new Date(checkValue);
            }
        }

        if (minDate && maxDate) {
            return this.factory.date.between({ from: minDate, to: maxDate });
        } else if (minDate) {
            return this.factory.date.between({
                from: minDate,
                to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            });
        } else if (maxDate) {
            return this.factory.date.between({
                from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                to: maxDate,
            });
        }

        return this.factory.date.recent();
    }

    private generateFromRegex(check: $ZodCheckRegex): string {
        const v4Pattern = getProperty(check, ['_zod', 'def', 'pattern']) as
            | RegExp
            | undefined;
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

    private generateFromZodType(
        schema: ZodType,
        currentDepth: number,
    ): unknown {
        const isV3String =
            hasZodV3Structure(schema) &&
            getSchemaTypeName(schema) === 'ZodString';

        if (!isV3String) {
            const stringFormatResult = this.tryGenerateFromMapping(
                schema,
                zodStringFormats,
                this.stringFormatGenerators,
            );
            if (stringFormatResult !== this.NOT_FOUND) {
                return stringFormatResult;
            }

            const dateFormatResult = this.tryGenerateFromMapping(
                schema,
                zodDateFormats,
                this.dateFormatGenerators,
            );
            if (dateFormatResult !== this.NOT_FOUND) {
                return dateFormatResult;
            }
        }

        const primitiveResult = this.tryGenerateFromMapping(
            schema,
            zodTypeGuards,
            {
                ...primitiveTypeHandlers,
                date: (generator: ZodSchemaGenerator, schema: ZodDate) =>
                    generator.generateDate(schema),
                enum: (generator: ZodSchemaGenerator, schema: ZodEnum) => {
                    const values = schemaHelpers.getEnumValues(schema);
                    return generator.factory.helpers.arrayElement(values);
                },
                literal: (_: ZodSchemaGenerator, schema: ZodLiteral) => {
                    return schemaHelpers.getLiteralValue(schema);
                },
                number: (generator: ZodSchemaGenerator, schema: ZodNumber) =>
                    generator.generateNumber(schema),
                string: (generator: ZodSchemaGenerator, schema: ZodString) =>
                    generator.generateString(schema),
            } as unknown as Record<string, SchemaGeneratorFunction>,
        );
        if (primitiveResult !== this.NOT_FOUND) {
            return primitiveResult;
        }

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
            const options = getProperty(def, ['options']) as
                | Record<string, ZodType>
                | undefined
                | ZodType[];
            if (!options) {
                return this.factory.lorem.word();
            }
            const optionsArray = Array.isArray(options)
                ? options
                : Object.values(options);
            const randomOption =
                this.factory.helpers.arrayElement(optionsArray);
            return this.generateFromSchema(randomOption, currentDepth + 1);
        }
        if (zodTypeGuards.intersection(schema)) {
            const def = schemaHelpers.getDef(schema);
            const left = getProperty(def, ['left']) as undefined | ZodType;
            const right = getProperty(def, ['right']) as undefined | ZodType;

            if (!left || !right) {
                return this.factory.lorem.word();
            }

            const leftResult = this.generateFromSchema(left, currentDepth + 1);
            const rightResult = this.generateFromSchema(
                right,
                currentDepth + 1,
            );

            if (
                isObject(leftResult) &&
                isNotNullish(leftResult) &&
                isObject(rightResult) &&
                isNotNullish(rightResult)
            ) {
                return merge(leftResult, rightResult);
            }
            return leftResult;
        }

        if (zodTypeGuards.transform(schema) || zodTypeGuards.pipe(schema)) {
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
        }

        if (zodTypeGuards.promise(schema)) {
            throw new Error(
                'z.promise() schemas require custom type handlers. Use .withTypeHandler("ZodPromise", yourHandler) to provide a custom promise generator.',
            );
        }

        return this.factory.lorem.word();
    }

    private generateMap(
        schema: ZodMap,
        currentDepth: number,
    ): Map<unknown, unknown> {
        const def = schemaHelpers.getDef(schema);
        const keyType = getProperty(def, ['keyType']) as undefined | ZodType;
        const valueType = getProperty(def, ['valueType']) as
            | undefined
            | ZodType;
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
        const checks = schemaHelpers.getChecks(schema);
        const constraints: NumberConstraints = { isInt: false };

        for (const check of checks) {
            if (isLessThanCheck(check)) {
                const inclusive = schemaHelpers.getCheckInclusive(check);
                const value = schemaHelpers.getCheckValue(check);
                if (typeof value === 'number') {
                    constraints.max = inclusive
                        ? value
                        : value - NUMBER_CONSTRAINTS.PRECISION_OFFSET;
                }
            } else if (isGreaterThanCheck(check)) {
                const inclusive = schemaHelpers.getCheckInclusive(check);
                const value = schemaHelpers.getCheckValue(check);
                if (typeof value === 'number') {
                    constraints.min = inclusive
                        ? value
                        : value + NUMBER_CONSTRAINTS.PRECISION_OFFSET;
                }
            } else if (isMultipleOfCheck(check)) {
                const value = schemaHelpers.getCheckValue(check);
                if (typeof value === 'number') {
                    constraints.step = value;
                }
            } else if (isNumberFormatCheck(check)) {
                const format = schemaHelpers.getCheckFormat(check);
                if (
                    format === 'int32' ||
                    format === 'uint32' ||
                    format === 'safeint'
                ) {
                    constraints.isInt = true;
                }
            } else {
                const v3Kind = getProperty(check, ['kind']) as
                    | string
                    | undefined;
                if (v3Kind === 'int') {
                    constraints.isInt = true;
                }
            }
        }

        const { isInt, max, min, step } = constraints;

        const hasStepWithoutMin = step && min === undefined;

        const safeMin =
            min !== undefined && Number.isFinite(min)
                ? min
                : hasStepWithoutMin
                  ? 0
                  : isInt
                    ? NUMBER_CONSTRAINTS.DEFAULT_INT_MIN
                    : NUMBER_CONSTRAINTS.DEFAULT_MIN;
        const safeMax =
            max !== undefined && Number.isFinite(max)
                ? max
                : isInt
                  ? NUMBER_CONSTRAINTS.DEFAULT_INT_MAX
                  : NUMBER_CONSTRAINTS.DEFAULT_MAX;

        const options = { max: safeMax, min: safeMin };
        let result = isInt
            ? this.factory.number.int(options)
            : this.factory.number.float(options);

        if (step && step > 0) {
            if (step < 1) {
                const precision = Math.ceil(-Math.log10(step));
                result = Math.round(result / step) * step;
                result =
                    Math.round(result * Math.pow(10, precision)) /
                    Math.pow(10, precision);
            } else {
                result = Math.round(result / step) * step;
            }
            if (Object.is(result, -0)) {
                result = 0;
            }
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

    private generateObject(
        schema: ZodObject,
        currentDepth: number,
    ): Record<string, unknown> {
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
            result[key] = this.generateFromSchema(
                fieldSchema,
                currentDepth + 1,
            );
        }

        return result;
    }

    private generateRecord(
        schema: ZodRecord,
        currentDepth: number,
    ): Record<string, unknown> {
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
        const valueType = getProperty(def, ['valueType']) as
            | undefined
            | ZodType;
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

    private generateStringWithConstraints(
        constraints: SizeConstraints,
    ): string {
        const { exactLength, maxLength, minLength } = constraints;

        if (exactLength !== undefined) {
            return this.factory.string.alphanumeric(exactLength);
        }

        const targetLength = this.calculateTargetLength(
            minLength,
            maxLength,
            5,
            20,
        );
        return this.factory.string.alphanumeric(targetLength);
    }

    private generateTuple(schema: ZodTuple, currentDepth: number): unknown[] {
        const def = schemaHelpers.getDef(schema);
        const items = getProperty(def, ['items']) as undefined | ZodType[];
        const rest = getProperty(def, ['rest']) as undefined | ZodType;

        if (!items || !Array.isArray(items)) {
            return [];
        }

        const result = items.map((itemSchema) =>
            this.generateFromSchema(itemSchema, currentDepth + 1),
        );

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
            ZodBigInt: (_schema, generator) =>
                BigInt(
                    generator.factory.number.int({ max: 1_000_000, min: 0 }),
                ),

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
                const getter = getProperty(def, ['getter']) as
                    | (() => ZodType)
                    | undefined;
                const maxDepth =
                    generator.factory.options?.maxDepth ?? DEFAULT_MAX_DEPTH;

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
                    return generator.generateFromSchema(
                        innerSchema,
                        currentDepth + 1,
                    );
                } catch {
                    return {};
                }
            },

            ZodNaN: () => Number.NaN,

            ZodNever: () => {
                throw new Error(
                    'ZodNever should never be reached in factory generation',
                );
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

    private tryGenerateFromMapping<
        T extends Record<string, (value: unknown) => boolean>,
    >(
        schema: ZodType,
        guards: T,
        generators: Record<keyof T, SchemaGeneratorFunction>,
    ): unknown {
        for (const [key, guard] of Object.entries(guards)) {
            if (guard(schema)) {
                const generator = generators[key as keyof T] as
                    | ((
                          generator: ZodSchemaGenerator,
                          schema?: unknown,
                      ) => unknown)
                    | undefined;
                return generator ? generator(this, schema) : this.NOT_FOUND;
            }
        }
        return this.NOT_FOUND;
    }

    private tryGenerateFromMetadata(schema: ZodType): unknown {
        // eslint-disable-next-line @typescript-eslint/unbound-method
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
                : Object.values(metadata.examples).map(
                      (ex: { value?: string } | string) =>
                          isRecord(ex) ? (ex.value ?? '') : ex,
                  );

            if (examples.length > 0) {
                return this.factory.helpers.arrayElement(examples);
            }
        }

        return undefined;
    }

    private tryGenerateFromTypeHandler(
        schema: ZodType,
        currentDepth: number,
    ): unknown {
        const def = schemaHelpers.getDef(schema);
        if (!def) {
            return undefined;
        }

        const type = getProperty(def, ['type']) as string | undefined;
        if (!type) {
            return undefined;
        }

        const typeName =
            builtinTypeMapping[type as keyof typeof builtinTypeMapping];

        if (this.typeHandlers.has(typeName)) {
            return this.typeHandlers.get(typeName)!(schema, this, currentDepth);
        }

        return undefined;
    }
}

/**
 * A factory class for generating type-safe mock data from Zod schemas.
 *
 * ZodFactory extends the base Factory class to provide automatic generation of mock data
 * that conforms to Zod schema definitions. It supports all major Zod types including
 * primitives, objects, arrays, unions, enums, and more.
 *
 * Note: This class requires the `zod` package to be installed and uses Zod v4 API.
 *
 * @example
 * Basic usage with a simple schema:
 * ```typescript
 * import { z } from 'zod/v4';
 * import { ZodFactory } from 'interface-forge/zod';
 *
 * const UserSchema = z.object({
 *   id: z.string().uuid(),
 *   name: z.string().min(1).max(100),
 *   email: z.string().email(),
 *   age: z.number().int().min(18).max(120)
 * });
 *
 * const factory = new ZodFactory(UserSchema);
 * const user = factory.build();
 * ```
 *
 * @example
 * Using partial factory functions for custom generation:
 * ```typescript
 * const factory = new ZodFactory(UserSchema, (faker) => ({
 *   name: faker.person.fullName(),
 * }));
 * ```
 *
 * @template T - Must be a ZodObject type that defines the schema shape
 * @template O - Factory options extending ZodFactoryOptions
 *
 * @see {@link https://github.com/goldziher/interface-forge/blob/main/examples/07-zod-basic.ts | Basic Example}
 * @see {@link https://github.com/goldziher/interface-forge/blob/main/examples/07-zod-integration.ts | Advanced Example}
 * @see {@link https://github.com/goldziher/interface-forge/blob/main/examples/07-zod-testing.ts | Testing Example}
 */
export class ZodFactory<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends ZodObject<any, any>,
    O extends ZodFactoryOptions = ZodFactoryOptions,
> extends Factory<z.output<T>, O> {
    private readonly generator: ZodSchemaGenerator;
    private readonly schema: T;

    /**
     * Creates a new ZodFactory instance.
     *
     * @param schema - The Zod object schema to generate data from
     * @param optionsOrFactory - Either factory options or a partial factory function
     * @param options - Factory options (when second parameter is a factory function)
     *
     * @example
     * Simple schema-based generation:
     * ```typescript
     * const factory = new ZodFactory(UserSchema);
     * ```
     *
     * @example
     * With partial factory function:
     * ```typescript
     * const factory = new ZodFactory(UserSchema, (faker) => ({
     *   name: faker.person.fullName(),
     *   // Other fields auto-generated
     * }));
     * ```
     *
     * @example
     * With options:
     * ```typescript
     * const factory = new ZodFactory(UserSchema, {
     *   maxDepth: 3,
     *   generators: { userId: () => 'custom-id' }
     * });
     * ```
     */
    constructor(
        schema: T,
        optionsOrFactory?: O | PartialFactoryFunction<z.output<T>>,
        options?: O,
    ) {
        const factoryFunction = isFunction(optionsOrFactory)
            ? optionsOrFactory
            : ((() => ({})) as PartialFactoryFunction<z.output<T>>);
        const factoryOptions = isObject(options)
            ? options
            : isObject(optionsOrFactory) && !isFunction(optionsOrFactory)
              ? (optionsOrFactory as O)
              : ({} as O);

        super(factoryFunction as FactoryFunction<z.output<T>>, factoryOptions);

        this.schema = schema;
        this.generator = new ZodSchemaGenerator(
            this as unknown as ZodFactory<never>,
        );
    }

    /**
     * Generates a batch of instances that conform to the Zod schema.
     *
     * @param size - Number of instances to generate
     * @param kwargs - Optional overrides for each instance
     * @returns Array of generated instances
     */
    batch = (
        size: number,
        kwargs?: Partial<z.output<T>> | Partial<z.output<T>>[],
    ): z.output<T>[] => {
        if (isAsyncFunction(this.factory)) {
            throw new ConfigurationError(
                'Async factory function detected. Use buildAsync() method to build instances with async factories.',
            );
        }

        if (!Number.isInteger(size) || size < 0) {
            throw new Error('Batch size must be a non-negative integer');
        }

        if (size === 0) {
            return [];
        }

        const results: z.output<T>[] = [];

        if (kwargs) {
            const generator = this.iterate<Partial<z.output<T>>>(
                Array.isArray(kwargs)
                    ? kwargs
                    : ([kwargs] as Partial<z.output<T>>[]),
            );

            for (let i = 0; i < size; i++) {
                const overrides = generator.next().value;
                const generatedSchema = this.generator.generateFromSchema(
                    this.schema,
                );
                const generatedFromFactory = this.factory(
                    this as unknown as Factory<z.output<T>>,
                    i,
                );

                const result = this.schema.parse({
                    ...(generatedSchema as Record<string, unknown>),
                    ...(generatedFromFactory as Record<string, unknown>),
                    ...(overrides as Record<string, unknown>),
                });
                results.push(result);
            }
        } else {
            for (let i = 0; i < size; i++) {
                const generatedSchema = this.generator.generateFromSchema(
                    this.schema,
                );
                const generatedFromFactory = this.factory(
                    this as unknown as Factory<z.output<T>>,
                    i,
                );

                const result = this.schema.parse({
                    ...(generatedSchema as Record<string, unknown>),
                    ...(generatedFromFactory as Record<string, unknown>),
                });
                results.push(result);
            }
        }

        return results;
    };

    /**
     * Builds a single instance that conforms to the Zod schema.
     *
     * The build process:
     * 1. Generates data from the Zod schema constraints
     * 2. Applies any factory function customizations
     * 3. Applies the provided overrides
     * 4. Validates the result against the schema
     *
     * @param kwargs - Optional property overrides
     * @param options - Optional build options including fixture generation
     * @returns A generated instance conforming to the schema
     *
     * @example
     * ```typescript
     * const user = factory.build({
     *   role: 'admin',
     *   isActive: true
     * });
     * ```
     *
     * @example
     * With fixture generation:
     * ```typescript
     * const user = factory.build(undefined, { generateFixture: 'user-fixture' });
     * ```
     */
    build = (
        kwargs?: Partial<z.output<T>>,
        options?: Partial<O>,
    ): z.output<T> => {
        if (isAsyncFunction(this.factory)) {
            throw new ConfigurationError(
                'Async factory function detected. Use buildAsync() method to build instances with async factories.',
            );
        }

        const hasAsyncHooks =
            this.beforeBuildHooks.some((hook) => isAsyncFunction(hook)) ||
            this.afterBuildHooks.some((hook) => isAsyncFunction(hook));

        if (hasAsyncHooks) {
            throw new ConfigurationError(
                'Async hooks detected. Use buildAsync() method to build instances with async hooks.',
            );
        }

        // Check if fixture generation is requested
        const mergedOptions = {
            ...this.options,
            ...options,
        } as FactoryOptions & O;
        if (mergedOptions.generateFixture && mergedOptions.fixtures) {
            const fixturePath =
                typeof mergedOptions.generateFixture === 'string'
                    ? mergedOptions.generateFixture
                    : this.getDefaultFixturePath();

            return this.buildWithFixture(fixturePath, kwargs, mergedOptions);
        }

        // Normal build without fixtures
        let params = kwargs ?? {};

        for (const hook of this.beforeBuildHooks) {
            params = hook(params) as Partial<z.output<T>>;
        }

        const generatedSchema = this.generator.generateFromSchema(this.schema);
        const generatedFromFactory = this.factory(
            this as unknown as Factory<z.output<T>>,
            0,
        );

        const merged =
            Array.isArray(generatedSchema) ||
            typeof generatedSchema !== 'object' ||
            generatedSchema === null
                ? generatedSchema
                : merge(
                      generatedSchema as Record<string, unknown>,
                      generatedFromFactory as Record<string, unknown>,
                      params as Record<string, unknown>,
                  );

        let result = this.schema.parse(merged);

        for (const hook of this.afterBuildHooks) {
            result = hook(result) as z.output<T>;
        }

        return result;
    };

    /**
     * Register a custom handler for a specific Zod type.
     * Allows customization of how specific Zod types are generated.
     *
     * @param typeName - The Zod type name (e.g., 'ZodCustom', 'ZodBigInt')
     * @param handler - Function that generates values for this type
     * @returns The factory instance for method chaining
     *
     * @example
     * const factory = new ZodFactory(schema)
     *   .withTypeHandler('ZodCustom', (schema, generator) => ({
     *     customField: generator.factory.lorem.word()
     *   }))
     *   .withTypeHandler('ZodBigInt', () => BigInt(42));
     */
    withTypeHandler(typeName: string, handler: ZodTypeHandler): this {
        this.generator.registerTypeHandler(typeName, handler);
        return this;
    }

    /**
     * Register multiple type handlers at once.
     *
     * @param handlers - Object mapping type names to handler functions
     * @returns The factory instance for method chaining
     *
     * @example
     * const factory = new ZodFactory(schema).withTypeHandlers({
     *   ZodCustom: (schema, generator) => ({ id: generator.factory.string.uuid() }),
     *   ZodBigInt: () => BigInt(Math.floor(Math.random() * 1000))
     * });
     */
    withTypeHandlers(handlers: Record<string, ZodTypeHandler>): this {
        this.generator.registerTypeHandlers(handlers);
        return this;
    }

    /**
     * Override buildWithFixture to handle Zod-specific generation
     *
     * @param filePath The fixture file path
     * @param kwargs Optional property overrides
     * @param _options Build options
     * @returns The generated Zod object
     */
    protected buildWithFixture(
        filePath: string,
        kwargs?: Partial<z.output<T>>,
        _options?: Partial<O>,
    ): z.output<T> {
        const fixtureConfig = this.getFixtureConfig();
        const parsedPath = this.parseFixturePath(filePath, fixtureConfig);

        // Check if fixture already exists
        const existing = this.readFixture(parsedPath.fullPath);
        if (existing) {
            this.validateFixture(existing, fixtureConfig);
            return existing.data as z.output<T>;
        }

        // Generate new data using Zod schema
        let params = kwargs ?? {};

        for (const hook of this.beforeBuildHooks) {
            params = hook(params) as Partial<z.output<T>>;
        }

        const generatedSchema = this.generator.generateFromSchema(this.schema);
        const generatedFromFactory = this.factory(
            this as unknown as Factory<z.output<T>>,
            0,
        );

        const merged =
            Array.isArray(generatedSchema) ||
            typeof generatedSchema !== 'object' ||
            generatedSchema === null
                ? generatedSchema
                : merge(
                      generatedSchema as Record<string, unknown>,
                      generatedFromFactory as Record<string, unknown>,
                      params as Record<string, unknown>,
                  );

        let result = this.schema.parse(merged);

        for (const hook of this.afterBuildHooks) {
            result = hook(result) as z.output<T>;
        }

        // Write fixture
        this.writeFixture(parsedPath, result, fixtureConfig);

        return result;
    }

    /**
     * Override signature calculation to include Zod schema information
     *
     * @param config Fixture configuration
     * @returns SHA-256 hash of the factory signature
     */
    protected calculateSignature(
        config: Required<import('./index').FixtureConfiguration>,
    ): string {
        if (!createHash) {
            throw new FixtureError(
                'Fixture functionality is not available in browser environments',
            );
        }
        const baseSignature = super.calculateSignature(config);
        const hash = createHash('sha256');

        // Start with base signature
        hash.update(baseSignature);

        // Add schema shape information
        try {
            const shape = this.schema.shape as Record<string, ZodType>;
            if (isObject(shape)) {
                const schemaKeys = Object.keys(shape).toSorted();
                hash.update(JSON.stringify(schemaKeys));

                // Add type information for each field
                for (const key of schemaKeys) {
                    const fieldSchema = shape[key];
                    const typeName = getSchemaTypeName(fieldSchema);
                    if (typeName) {
                        hash.update(`${key}:${typeName}`);
                    }
                }
            }
        } catch {
            // If we can't extract schema information, just use base signature
        }

        return hash.digest('hex');
    }
}
