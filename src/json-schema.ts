import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Options, ValidateFunction } from 'ajv';
import { isFunction, isObject, isRecord } from '@tool-belt/type-predicates';

import { COLLECTION_SIZES, DEFAULT_MAX_DEPTH, NUMBER_CONSTRAINTS, STRING_LENGTHS } from './constants';
import { generateRegex } from './regex-generator';
import { ConfigurationError, ValidationError } from './errors';
import { Factory, type FactoryFunction, type FactoryOptions, type PartialFactoryFunction } from './index';

export type JsonSchemaPrimitiveType = 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';

export type JsonSchema = boolean | JsonSchemaObject;

export interface JsonSchemaObject {
    $defs?: Record<string, JsonSchema>;
    $ref?: string;
    additionalProperties?: boolean | JsonSchema;
    anyOf?: JsonSchema[];
    const?: unknown;
    definitions?: Record<string, JsonSchema>;
    enum?: unknown[];
    exclusiveMaximum?: boolean | number;
    exclusiveMinimum?: boolean | number;
    format?: 'date' | 'date-time' | 'email' | 'time' | 'uri' | 'uuid' | string;
    items?: JsonSchema | JsonSchema[];
    maxItems?: number;
    maxLength?: number;
    maximum?: number;
    minItems?: number;
    minLength?: number;
    minimum?: number;
    multipleOf?: number;
    oneOf?: JsonSchema[];
    pattern?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    type?: JsonSchemaPrimitiveType | JsonSchemaPrimitiveType[];
}

export interface JsonSchemaFactoryOptions extends FactoryOptions {
    ajv?: Options;
}

function mergeGenerated<T>(generated: unknown, factoryValues: unknown): T {
    if (isRecord(generated) && isRecord(factoryValues)) {
        return {
            ...generated,
            ...factoryValues,
        } as T;
    }
    return (
        factoryValues === undefined || (isRecord(factoryValues) && Object.keys(factoryValues).length === 0)
            ? generated
            : factoryValues
    ) as T;
}

class JsonSchemaGenerator {
    readonly #factory: Factory<unknown>;
    readonly #rootSchema: JsonSchema;

    constructor(factory: Factory<unknown>, rootSchema: JsonSchema) {
        this.#factory = factory;
        this.#rootSchema = rootSchema;
    }

    generate(schema: JsonSchema = this.#rootSchema, currentDepth = 0): unknown {
        if (currentDepth >= (this.#factory.options?.maxDepth ?? DEFAULT_MAX_DEPTH)) {
            return null;
        }

        if (schema === true) {
            return {};
        }

        if (schema === false) {
            throw new ConfigurationError('Cannot generate data for boolean false JSON Schema');
        }

        const resolvedSchema = this.#resolveReference(schema);

        if ('const' in resolvedSchema) {
            return resolvedSchema.const;
        }

        if (resolvedSchema.enum && resolvedSchema.enum.length > 0) {
            return this.#factory.helpers.arrayElement(resolvedSchema.enum);
        }

        const unionSchema = resolvedSchema.oneOf?.[0] ?? resolvedSchema.anyOf?.[0];
        if (unionSchema) {
            return this.generate(unionSchema, currentDepth + 1);
        }

        const type = this.#getType(resolvedSchema);

        switch (type) {
            case 'array':
                return this.#generateArray(resolvedSchema, currentDepth);
            case 'boolean':
                return this.#factory.datatype.boolean();
            case 'integer':
                return this.#generateNumber(resolvedSchema, true);
            case 'null':
                return null;
            case 'number':
                return this.#generateNumber(resolvedSchema, false);
            case 'object':
                return this.#generateObject(resolvedSchema, currentDepth);
            case 'string':
                return this.#generateString(resolvedSchema);
            default:
                return {};
        }
    }

    #generateArray(schema: JsonSchemaObject, currentDepth: number): unknown[] {
        const min = schema.minItems ?? COLLECTION_SIZES.DEFAULT_ARRAY_MIN;
        const max = schema.maxItems ?? Math.max(min, COLLECTION_SIZES.DEFAULT_ARRAY_MAX);
        const length = this.#factory.number.int({ max, min });

        if (Array.isArray(schema.items)) {
            const values = schema.items.map((item) => this.generate(item, currentDepth + 1));
            return values.slice(0, length);
        }

        const itemSchema = schema.items ?? {};
        return Array.from({ length }, () => this.generate(itemSchema, currentDepth + 1));
    }

    #generateNumber(schema: JsonSchemaObject, integer: boolean): number {
        let min = schema.minimum ?? (integer ? NUMBER_CONSTRAINTS.DEFAULT_INT_MIN : NUMBER_CONSTRAINTS.DEFAULT_MIN);
        let max = schema.maximum ?? (integer ? NUMBER_CONSTRAINTS.DEFAULT_INT_MAX : NUMBER_CONSTRAINTS.DEFAULT_MAX);

        if (typeof schema.exclusiveMinimum === 'number') {
            min = integer
                ? Math.floor(schema.exclusiveMinimum) + 1
                : schema.exclusiveMinimum + NUMBER_CONSTRAINTS.PRECISION_OFFSET;
        } else if (schema.exclusiveMinimum === true) {
            min = integer ? min + 1 : min + NUMBER_CONSTRAINTS.PRECISION_OFFSET;
        }

        if (typeof schema.exclusiveMaximum === 'number') {
            max = integer
                ? Math.ceil(schema.exclusiveMaximum) - 1
                : schema.exclusiveMaximum - NUMBER_CONSTRAINTS.PRECISION_OFFSET;
        } else if (schema.exclusiveMaximum === true) {
            max = integer ? max - 1 : max - NUMBER_CONSTRAINTS.PRECISION_OFFSET;
        }

        if (schema.multipleOf) {
            const minMultiple = Math.ceil(min / schema.multipleOf);
            const maxMultiple = Math.floor(max / schema.multipleOf);
            return this.#factory.number.int({ max: maxMultiple, min: minMultiple }) * schema.multipleOf;
        }

        return integer
            ? this.#factory.number.int({ max: Math.floor(max), min: Math.ceil(min) })
            : this.#factory.number.float({ max, min });
    }

    #generateObject(schema: JsonSchemaObject, currentDepth: number): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
            result[key] = this.generate(propertySchema, currentDepth + 1);
        }
        return result;
    }

    #generateString(schema: JsonSchemaObject): string {
        const min = schema.minLength ?? 1;
        const max = schema.maxLength ?? Math.max(min, STRING_LENGTHS.DEFAULT);

        const formatted = this.#generateFormattedString(schema.format);
        if (
            formatted &&
            (!schema.pattern || new RegExp(schema.pattern, 'u').test(formatted)) &&
            formatted.length >= min &&
            (schema.maxLength === undefined || formatted.length <= schema.maxLength)
        ) {
            return formatted;
        }

        if (schema.pattern) {
            const patterned = generateRegex(
                new RegExp(schema.pattern, 'u'),
                (lower, upper) => this.#factory.number.int({ min: lower, max: upper }),
                schema.minLength,
                schema.maxLength,
            );
            if (patterned !== undefined) {
                return patterned;
            }
        }

        return this.#factory.string.alpha({ length: { max, min } });
    }

    #generateFormattedString(format: JsonSchemaObject['format']): string | undefined {
        switch (format) {
            case 'date':
                return '2026-01-01';
            case 'date-time':
                return '2026-01-01T00:00:00Z';
            case 'email':
                return 'user@example.com';
            case 'time':
                return '00:00:00Z';
            case 'uri':
                return 'https://example.com';
            case 'uuid':
                return '00000000-0000-4000-8000-000000000000';
            default:
                return undefined;
        }
    }

    #getType(schema: JsonSchemaObject): JsonSchemaPrimitiveType | undefined {
        const rawType = Array.isArray(schema.type) ? schema.type.find((type) => type !== 'null') : schema.type;
        if (rawType) {
            return rawType;
        }
        if (schema.properties) {
            return 'object';
        }
        if (schema.items) {
            return 'array';
        }
        return undefined;
    }

    #resolveReference(schema: JsonSchemaObject): JsonSchemaObject {
        if (!schema.$ref) {
            return schema;
        }

        const match = /^#\/(\$defs|definitions)\/(.+)$/.exec(schema.$ref);
        if (!match || typeof this.#rootSchema === 'boolean') {
            throw new ConfigurationError(`Unsupported JSON Schema reference: ${schema.$ref}`);
        }

        const collection = match[1] === '$defs' ? this.#rootSchema.$defs : this.#rootSchema.definitions;
        const resolved = collection?.[decodeURIComponent(match[2])];
        if (!resolved || typeof resolved === 'boolean') {
            throw new ConfigurationError(`Unable to resolve JSON Schema reference: ${schema.$ref}`);
        }
        return resolved;
    }
}

export class JsonSchemaFactory<
    T = unknown,
    O extends JsonSchemaFactoryOptions = JsonSchemaFactoryOptions,
> extends Factory<T, O> {
    readonly #schema: JsonSchema;
    readonly #validator: ValidateFunction;
    declare batch: (size: number, kwargs?: Partial<T> | Partial<T>[]) => T[];
    declare batchAsync: (size: number, kwargs?: Partial<T> | Partial<T>[]) => Promise<T[]>;
    declare build: (kwargs?: Partial<T>, options?: Partial<O>) => T;
    declare buildAsync: (kwargs?: Partial<T>, options?: Partial<O>) => Promise<T>;

    constructor(schema: JsonSchema, optionsOrFactory?: O | PartialFactoryFunction<T>, options?: O) {
        const generatorRef: { value?: JsonSchemaGenerator } = {};
        const factoryFunction = isFunction(optionsOrFactory)
            ? optionsOrFactory
            : ((() => ({})) as PartialFactoryFunction<T>);
        const factoryOptions = isObject(options)
            ? options
            : isObject(optionsOrFactory) && !isFunction(optionsOrFactory)
              ? (optionsOrFactory as O)
              : ({} as O);

        super(
            ((factory, iteration, kwargs) => {
                const generator = generatorRef.value;
                if (!generator) {
                    throw new ConfigurationError('JSON Schema generator has not been initialized');
                }
                const generated = generator.generate(schema);
                const factoryValues = (factoryFunction as FactoryFunction<T>)(factory as Factory<T>, iteration, kwargs);
                if (factoryValues instanceof Promise) {
                    return factoryValues.then((values) => mergeGenerated<T>(generated, values)) as Promise<T>;
                }
                return mergeGenerated<T>(generated, factoryValues);
            }) as FactoryFunction<T>,
            factoryOptions,
        );

        this.#schema = schema;
        generatorRef.value = new JsonSchemaGenerator(this as unknown as Factory<unknown>, schema);

        const ajv = new Ajv({
            allErrors: true,
            strict: false,
            ...factoryOptions.ajv,
        });
        addFormats(ajv);
        this.#validator = ajv.compile(schema);

        const baseBatch = this.batch.bind(this);
        const baseBatchAsync = this.batchAsync.bind(this);
        const baseBuild = this.build.bind(this);
        const baseBuildAsync = this.buildAsync.bind(this);

        this.batch = (size, kwargs) => baseBatch(size, kwargs).map((result) => this.#validate(result as T));
        this.batchAsync = async (size, kwargs) => {
            const results = await baseBatchAsync(size, kwargs);
            return results.map((result) => this.#validate(result as T));
        };
        this.build = (kwargs, options) => this.#validate(baseBuild(kwargs, options) as T);
        this.buildAsync = async (kwargs, options) => this.#validate((await baseBuildAsync(kwargs, options)) as T);
    }

    #validate(value: T): T {
        if (!this.#validator(value)) {
            throw new ValidationError(
                `Generated value does not match JSON Schema: ${JSON.stringify(this.#validator.errors)}`,
            );
        }
        return value;
    }

    get schema(): JsonSchema {
        return this.#schema;
    }
}
