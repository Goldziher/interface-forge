/**
 * JSON Schema Integration for Interface-Forge
 *
 * This module provides functionality to automatically create Factory instances from JSON Schema definitions.
 * It requires optional peer dependencies 'ajv' and 'ajv-formats' to be installed.
 *
 * @example
 * ```typescript
 * import { createFactoryFromJsonSchema } from 'interface-forge/json-schema';
 *
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     id: { type: 'string', format: 'uuid' },
 *     name: { type: 'string', minLength: 1 },
 *     email: { type: 'string', format: 'email' }
 *   },
 *   required: ['id', 'name', 'email']
 * };
 *
 * const UserFactory = await createFactoryFromJsonSchema(userSchema);
 * const user = UserFactory.build();
 * const users = UserFactory.batch(10);
 * ```
 */

import type { Faker } from '@faker-js/faker';
import type { ValidateFunction } from 'ajv';
import { isArray, isDefined, isRecord } from '@tool-belt/type-predicates';
import { Factory } from './index.js';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-plus-operands, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition */

/**
 * Configuration options for JSON Schema factory creation
 */
export interface JsonSchemaOptions {
    /**
     * Custom format generators for non-standard formats
     */
    customFormats?: Record<string, (faker: Faker) => string>;

    /**
     * Locale for faker data generation
     *
     * @default 'en'
     */
    locale?: string;

    /**
     * Maximum recursion depth for nested object generation
     *
     * @default 10
     */
    maxDepth?: number;

    /**
     * Enable strict validation of generated data against the schema
     *
     * @default false
     */
    strictValidation?: boolean;
}

/**
 * Schema object with common JSON Schema properties
 */
export interface SchemaObject {
    [key: string]: unknown;
    $ref?: string;
    allOf?: SchemaObject[];
    anyOf?: SchemaObject[];
    enum?: unknown[];
    format?: string;
    items?: unknown;
    maximum?: number;
    maxLength?: number;
    minimum?: number;
    minLength?: number;
    oneOf?: SchemaObject[];
    pattern?: string;
    properties?: Record<string, unknown>;
    required?: string[];
    type?: string;
}

/**
 * JSON Schema format mappings to Faker.js methods
 */
const FORMAT_MAPPINGS: Record<string, (faker: Faker) => string> = {
    'date': (faker) => faker.date.recent().toISOString().split('T')[0],
    'date-time': (faker) => faker.date.recent().toISOString(),
    'email': (faker) => faker.internet.email(),
    'hostname': (faker) => faker.internet.domainName(),
    'ipv4': (faker) => faker.internet.ipv4(),
    'ipv6': (faker) => faker.internet.ipv6(),
    'password': (faker) => faker.internet.password(),
    'regex': (faker) => faker.lorem.word(),
    'time': (faker) => faker.date.recent().toTimeString().split(' ')[0],
    'uri': (faker) => faker.internet.url(),
    'uri-reference': (faker) => faker.internet.url(),
    'url': (faker) => faker.internet.url(),
    'uuid': (faker) => faker.string.uuid(),
};

/**
 * Utility function to create multiple factories from an object containing multiple schemas
 *
 * @param schemas - Object mapping names to JSON schemas
 * @param options - Configuration options applied to all factories
 * @returns Promise resolving to object mapping names to Factory instances
 *
 * @example
 * ```typescript
 * const schemas = {
 *   user: userSchema,
 *   post: postSchema,
 *   comment: commentSchema
 * };
 *
 * const factories = await createFactoriesFromSchemas(schemas);
 * const user = factories.user.build();
 * const post = factories.post.build();
 * ```
 */
export async function createFactoriesFromSchemas<T extends Record<string, any>>(
    schemas: T,
    options: JsonSchemaOptions = {},
): Promise<{ [K in keyof T]: Factory<any> }> {
    const factoryEntries = await Promise.all(
        Object.entries(schemas).map(async ([name, schema]) => [
            name,
            await createFactoryFromJsonSchema(schema, options),
        ]),
    );

    return Object.fromEntries(factoryEntries) as {
        [K in keyof T]: Factory<any>;
    };
}

/**
 * Creates a Factory instance from a JSON Schema definition
 *
 * @param schema - The JSON Schema object
 * @param options - Configuration options for factory creation
 * @returns A Promise that resolves to a Factory instance
 *
 * @throws {Error} If the required peer dependencies are not installed
 * @throws {Error} If the schema is invalid
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     id: { type: 'string', format: 'uuid' },
 *     name: { type: 'string', minLength: 1, maxLength: 100 },
 *     email: { type: 'string', format: 'email' },
 *     age: { type: 'integer', minimum: 0, maximum: 120 },
 *     isActive: { type: 'boolean' },
 *     tags: {
 *       type: 'array',
 *       items: { type: 'string' },
 *       minItems: 0,
 *       maxItems: 10
 *     }
 *   },
 *   required: ['id', 'name', 'email']
 * };
 *
 * const UserFactory = await createFactoryFromJsonSchema(userSchema);
 * const user = UserFactory.build();
 * const users = UserFactory.batch(10);
 * ```
 */
export async function createFactoryFromJsonSchema<T = any>(
    schema: any,
    options: JsonSchemaOptions = {},
): Promise<Factory<T>> {
    // Load and setup AJV validator
    const ajv = await loadJsonSchemaValidator();
    let validator: null | ValidateFunction<T> = null;

    if (options.strictValidation) {
        try {
            validator = ajv.compile<T>(schema);
        } catch (error) {
            throw new Error(`Invalid JSON Schema: ${error}`);
        }
    }

    // Create the factory
    const factory = new Factory<T>(
        (faker) => {
            let generated;

            // Handle root-level schemas by type
            if (schema.type === 'array') {
                generated = generateArray(schema, faker, options, 0);
            } else if (schema.type === 'null') {
                generated = null;
            } else {
                generated = createValueGenerator(schema, faker, options, 0);
            }

            // Validate if strict validation is enabled
            if (validator && options.strictValidation) {
                const isValid = validator(generated);
                if (!isValid) {
                    // eslint-disable-next-line no-console
                    console.warn(
                        'Generated data does not match schema:',
                        validator.errors,
                    );
                }
            }

            return generated as T;
        },
        {
            maxDepth: options.maxDepth ?? 10,
        },
    );

    return factory;
}

/**
 * Utility function to validate that generated data matches the original schema
 *
 * @param data - The generated data to validate
 * @param schema - The JSON schema to validate against
 * @returns Promise resolving to validation result
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function validateGeneratedData<T>(
    data: T,
    schema: any,
): Promise<{ errors?: any[]; valid: boolean }> {
    const ajv = await loadJsonSchemaValidator();

    try {
        const validator = ajv.compile<T>(schema);
        const valid = validator(data);

        return {
            errors: valid ? undefined : (validator.errors ?? []),
            valid,
        };
    } catch (error) {
        return {
            errors: [{ message: `Schema compilation error: ${error}` }],
            valid: false,
        };
    }
}

/**
 * Converts a JSON Schema type to appropriate Faker.js generation logic
 *
 * @param schema
 * @param faker
 * @param options
 * @param depth
 * @returns Generated value matching the schema type
 */
function createValueGenerator(
    schema: any,
    faker: Faker,
    options: JsonSchemaOptions = {},
    depth = 0,
): any {
    // Handle $ref references
    if (schema.$ref) {
        // Basic $ref handling - for self-references, generate simplified structure
        if (schema.$ref === '#' || schema.$ref === '#/') {
            // Self-reference - generate simplified version to prevent infinite recursion
            if (depth >= (options.maxDepth || 10) / 2) {
                return {}; // Return empty object for deep self-references
            }
            // Generate a simplified version of the root schema without $ref
            const simplifiedSchema = { ...schema };
            delete simplifiedSchema.$ref;
            return createValueGenerator(
                simplifiedSchema,
                faker,
                options,
                depth + 1,
            );
        }

        // For other $refs, generate a placeholder with appropriate type
        if (schema.type) {
            return createValueGenerator(
                { type: schema.type },
                faker,
                options,
                depth,
            );
        }

        return faker.string.alphanumeric(10);
    }

    // Handle schema composition
    if (schema.allOf) {
        const mergedSchema: any = {
            properties: {},
            required: [],
            type: schema.type ?? 'object',
        };

        for (const subSchema of schema.allOf) {
            // Handle nested $refs in allOf
            let resolvedSubSchema = subSchema;
            if (subSchema.$ref) {
                resolvedSubSchema = createValueGenerator(
                    subSchema,
                    faker,
                    options,
                    depth + 1,
                );
                if (isRecord(resolvedSubSchema)) {
                    // Convert generated object back to schema-like structure
                    resolvedSubSchema = {
                        properties: Object.fromEntries(
                            Object.entries(resolvedSubSchema).map(
                                ([key, value]) => [key, { type: typeof value }],
                            ),
                        ),
                        type: 'object',
                    };
                }
            }

            if (resolvedSubSchema.type && !mergedSchema.type) {
                mergedSchema.type = resolvedSubSchema.type;
            }
            if (resolvedSubSchema.properties) {
                mergedSchema.properties = {
                    ...mergedSchema.properties,
                    ...resolvedSubSchema.properties,
                };
            }
            if (
                resolvedSubSchema.required &&
                isArray(resolvedSubSchema.required)
            ) {
                mergedSchema.required = [
                    ...new Set([
                        ...(mergedSchema.required || []),
                        ...resolvedSubSchema.required,
                    ]),
                ];
            }

            // Merge constraint properties (min/max, pattern, etc.)
            const constraintKeys = [
                'minimum',
                'maximum',
                'minLength',
                'maxLength',
                'pattern',
                'format',
                'enum',
            ];
            constraintKeys.forEach((key) => {
                if (isDefined(resolvedSubSchema[key])) {
                    mergedSchema[key] = resolvedSubSchema[key];
                }
            });

            // Merge other properties
            Object.keys(resolvedSubSchema).forEach((key) => {
                const excludedKeys = [
                    'properties',
                    'required',
                    'type',
                    '$ref',
                    ...constraintKeys,
                ];
                if (!excludedKeys.includes(key)) {
                    mergedSchema[key] = resolvedSubSchema[key];
                }
            });
        }

        return createValueGenerator(mergedSchema, faker, options, depth);
    }

    if (schema.anyOf || schema.oneOf) {
        const schemas = schema.anyOf || schema.oneOf;

        // Filter out schemas that would cause infinite recursion
        const validSchemas = schemas.filter((subSchema: any) => {
            if (subSchema.$ref === '#' || subSchema.$ref === '#/') {
                return depth < (options.maxDepth || 10) / 2;
            }
            return true;
        });

        if (validSchemas.length === 0) {
            return {}; // Fallback to empty object
        }

        const randomSchema = faker.helpers.arrayElement(validSchemas);
        return createValueGenerator(randomSchema, faker, options, depth);
    }

    // Handle different types
    switch (schema.type) {
        case 'array': {
            return generateArray(schema, faker, options, depth);
        }

        case 'boolean': {
            return faker.datatype.boolean();
        }
        case 'integer': {
            return generateNumber(schema, faker, true);
        }

        case 'null': {
            return null;
        }

        case 'number': {
            return generateNumber(schema, faker, false);
        }

        case 'object': {
            return generateObject(schema, faker, options, depth);
        }

        case 'string': {
            return generateString(schema, faker, options);
        }

        default: {
            if (schema.enum) {
                return faker.helpers.arrayElement(schema.enum);
            }
            return faker.lorem.word();
        }
    }
}

/**
 * Generates array values based on JSON Schema constraints
 *
 * @param schema
 * @param faker
 * @param options
 * @param depth
 * @returns Array of generated values
 */
function generateArray(
    schema: any,
    faker: Faker,
    options: JsonSchemaOptions,
    depth: number,
): any[] {
    const minItems = schema.minItems || 0;
    const maxItems = schema.maxItems || Math.max(minItems + 5, 10);
    const length = faker.number.int({ max: maxItems, min: minItems });

    if (!schema.items || depth >= (options.maxDepth || 10)) {
        return [];
    }

    // Handle tuple validation (array of schemas)
    if (isArray(schema.items)) {
        return schema.items.map((itemSchema: any) =>
            createValueGenerator(itemSchema, faker, options, depth + 1),
        );
    }

    // Handle uniform array items
    return Array.from({ length }, () =>
        createValueGenerator(schema.items, faker, options, depth + 1),
    );
}

/**
 * Generates numeric values based on JSON Schema constraints
 *
 * @param schema
 * @param faker
 * @param isInteger
 * @returns Generated numeric value
 */
function generateNumber(schema: any, faker: Faker, isInteger = false): number {
    const min =
        schema.minimum ??
        (schema.exclusiveMinimum ? schema.exclusiveMinimum + 0.01 : 0);
    const max =
        schema.maximum ??
        (schema.exclusiveMaximum ? schema.exclusiveMaximum - 0.01 : 1000);

    if (isInteger) {
        return faker.number.int({
            max: Math.floor(max),
            min: Math.ceil(min),
        });
    }

    let value = faker.number.float({ max, min });

    // Handle multipleOf constraint
    if (schema.multipleOf) {
        value = Math.round(value / schema.multipleOf) * schema.multipleOf;
    }

    return value;
}

/**
 * Generates object values based on JSON Schema constraints
 *
 * @param schema
 * @param faker
 * @param options
 * @param depth
 * @returns Generated object with properties
 */
function generateObject(
    schema: any,
    faker: Faker,
    options: JsonSchemaOptions,
    depth: number,
): Record<string, any> {
    if (depth >= (options.maxDepth || 10)) {
        return {};
    }

    const result: Record<string, any> = {};
    const properties = schema.properties || {};
    const required = schema.required || [];

    // Generate required properties
    for (const prop of required) {
        if (properties[prop]) {
            result[prop] = createValueGenerator(
                properties[prop],
                faker,
                options,
                depth + 1,
            );
        }
    }

    // Generate some optional properties
    const optionalProps = Object.keys(properties).filter(
        (prop) => !required.includes(prop),
    );
    const numOptional = faker.number.int({
        max: Math.min(optionalProps.length, 3),
        min: 0,
    });
    const selectedOptional = faker.helpers.arrayElements(
        optionalProps,
        numOptional,
    );

    for (const prop of selectedOptional) {
        result[prop] = createValueGenerator(
            properties[prop],
            faker,
            options,
            depth + 1,
        );
    }

    // Handle additionalProperties
    if (
        schema.additionalProperties === true ||
        isRecord(schema.additionalProperties)
    ) {
        const numAdditional = faker.number.int({ max: 2, min: 0 });
        for (let i = 0; i < numAdditional; i++) {
            const key = faker.lorem.word();
            result[key] = isRecord(schema.additionalProperties)
                ? createValueGenerator(
                      schema.additionalProperties,
                      faker,
                      options,
                      depth + 1,
                  )
                : faker.lorem.word();
        }
    }

    return result;
}

/**
 * Generates string values based on JSON Schema constraints
 *
 * @param schema
 * @param faker
 * @param options
 * @returns Generated string value
 */
function generateString(
    schema: any,
    faker: Faker,
    options: JsonSchemaOptions,
): string {
    // Handle format-specific generation
    if (schema.format) {
        const formatGenerator =
            options.customFormats?.[schema.format] ||
            FORMAT_MAPPINGS[schema.format];
        if (formatGenerator) {
            return formatGenerator(faker);
        }
    }

    // Handle pattern constraint
    if (schema.pattern) {
        try {
            // For complex patterns, generate a simple string that might match
            // Full regex generation would require additional libraries
            return faker.string.alphanumeric(schema.minLength || 5);
        } catch {
            return faker.lorem.word();
        }
    }

    // Handle enum values
    if (schema.enum) {
        return faker.helpers.arrayElement(schema.enum);
    }

    // Generate string with length constraints
    const minLength = schema.minLength || 1;
    const maxLength = schema.maxLength || Math.max(minLength + 20, 50);
    const length = faker.number.int({ max: maxLength, min: minLength });

    return faker.lorem
        .words(Math.ceil(length / 6))
        .slice(0, Math.max(0, length));
}

/**
 * Dynamic import helper for optional dependencies
 *
 * @returns Configured AJV validator instance
 */
async function loadJsonSchemaValidator() {
    try {
        const [{ default: Ajv }, { default: addFormats }] = await Promise.all([
            import('ajv'),
            import('ajv-formats'),
        ]);

        const ajv = new Ajv({
            allErrors: true,
            coerceTypes: false,
            removeAdditional: false,
            useDefaults: true,
        });
        addFormats(ajv);
        return ajv;
    } catch {
        throw new Error(
            'JSON Schema integration requires optional dependencies. Install with: npm install ajv ajv-formats',
        );
    }
}

export type { JSONSchemaType } from 'ajv';
