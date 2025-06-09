/**
 * JSON Schema Integration for Interface-Forge
 *
 * This module provides functionality to automatically create Factory instances from JSON Schema definitions.
 * It requires optional peer dependencies 'ajv' and 'ajv-formats' to be installed.
 *
 * @example
 * ```typescript
 * import { JsonSchemaFactory } from 'interface-forge/json-schema';
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
 * const UserFactory = await JsonSchemaFactory.create(userSchema);
 * const user = UserFactory.build();
 * const users = UserFactory.batch(10);
 * ```
 */

import type { Faker, LocaleDefinition, Randomizer } from '@faker-js/faker';
import type { ValidateFunction } from 'ajv';
import { isArray, isDefined, isRecord } from '@tool-belt/type-predicates';
import { Factory } from './index.js';

/**
 * Base factory options interface (extending core factory options)
 */
export interface FactoryOptions {
    /**
     * The locale data to use for this instance.
     * If an array is provided, the first locale that has a definition for a given property will be used.
     */
    locale?: LocaleDefinition | LocaleDefinition[];
    /**
     * Maximum recursion depth for nested factory references.
     * Default is 10. Set to 0 to disable nested generation.
     */
    maxDepth?: number;
    /**
     * The Randomizer to use.
     * Specify this only if you want to use it to achieve a specific goal,
     * such as sharing the same random generator with other instances/tools.
     */
    randomizer?: Randomizer;
}

/**
 * Configuration options for JSON Schema factory creation (extends base factory options)
 */
export interface JsonSchemaOptions extends FactoryOptions {
    /**
     * Custom format generators for non-standard formats
     */
    customFormats?: Record<string, (faker: Faker) => string>;
    /**
     * Enable strict validation of generated data against the schema
     *
     * @default false
     */
    strictValidation?: boolean;
}

/**
 * JSON Schema interface with proper typing
 */
interface JsonSchema {
    // Allow additional properties for extensibility
    [key: string]: unknown;
    // Schema metadata
    $ref?: string;
    $schema?: string;
    // Object constraints
    additionalProperties?: boolean | JsonSchema;
    // Schema composition
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    // Validation
    const?: unknown;
    // Metadata
    default?: unknown;
    description?: string;
    // Validation
    enum?: unknown[];
    examples?: unknown[];
    // Number constraints
    exclusiveMaximum?: number;
    exclusiveMinimum?: number;
    // String constraints
    format?: string;
    // Array constraints
    items?: JsonSchema | JsonSchema[];
    // Number constraints
    maximum?: number;
    maxItems?: number;
    maxLength?: number;
    minimum?: number;
    minItems?: number;
    minLength?: number;
    multipleOf?: number;
    // Schema composition
    not?: JsonSchema;
    oneOf?: JsonSchema[];
    // String constraints
    pattern?: string;
    patternProperties?: Record<string, JsonSchema>;
    // Object constraints
    properties?: Record<string, JsonSchema>;
    required?: string[];
    // Metadata
    title?: string;
    // Type definition
    type?:
        | 'array'
        | 'boolean'
        | 'integer'
        | 'null'
        | 'number'
        | 'object'
        | 'string';
    // Array constraints
    uniqueItems?: boolean;
}

/**
 * Type guard for checking if value has a number property
 *
 * @param obj - Object to check
 * @param prop - Property name to check for
 * @returns True if object has the number property
 */
function hasNumberProperty(
    obj: unknown,
    prop: string,
): obj is Record<string, number> {
    return isRecord(obj) && typeof obj[prop] === 'number';
}

/**
 * Type guard for checking if value has a string property
 *
 * @param obj - Object to check
 * @param prop - Property name to check for
 * @returns True if object has the string property
 */
function hasStringProperty(
    obj: unknown,
    prop: string,
): obj is Record<string, string> {
    return isRecord(obj) && typeof obj[prop] === 'string';
}

/**
 * Type guard to check if a value is a JsonSchema
 *
 * @param value - The value to check
 * @returns True if the value is a JsonSchema object
 */
function isJsonSchema(value: unknown): value is JsonSchema {
    return typeof value === 'object' && value !== null;
}

/**
 * JSON Schema format mappings to Faker.js methods with proper typing
 */
const FORMAT_MAPPINGS: Record<string, (faker: Faker) => string> = {
    'date': (faker: Faker): string =>
        faker.date.recent().toISOString().split('T')[0],
    'date-time': (faker: Faker): string => faker.date.recent().toISOString(),
    'email': (faker: Faker): string => faker.internet.email(),
    'hostname': (faker: Faker): string => faker.internet.domainName(),
    'ipv4': (faker: Faker): string => faker.internet.ipv4(),
    'ipv6': (faker: Faker): string => faker.internet.ipv6(),
    'password': (faker: Faker): string => faker.internet.password(),
    'regex': (faker: Faker): string => faker.lorem.word(),
    'time': (faker: Faker): string =>
        faker.date.recent().toTimeString().split(' ')[0],
    'uri': (faker: Faker): string => faker.internet.url(),
    'uri-reference': (faker: Faker): string => faker.internet.url(),
    'url': (faker: Faker): string => faker.internet.url(),
    'uuid': (faker: Faker): string => faker.string.uuid(),
} as const;

/**
 * Factory class for creating JSON Schema-based factories
 */
export class JsonSchemaFactory<T> extends Factory<T> {
    private readonly jsonSchemaOptions: JsonSchemaOptions;
    private readonly schema: unknown;

    private constructor(
        schema: unknown,
        options: JsonSchemaOptions,
        validator: null | ValidateFunction<T>,
    ) {
        super(
            (faker) => {
                let generated: unknown;

                // Handle root-level schemas by type
                if (isJsonSchema(schema) && schema.type === 'array') {
                    generated = generateArray(schema, faker, options, 0);
                } else if (isJsonSchema(schema) && schema.type === 'null') {
                    generated = null;
                } else {
                    generated = createValueGenerator(schema, faker, options, 0);
                }

                // Validate if strict validation is enabled
                if (validator && options.strictValidation) {
                    const validationResult = validator(generated);
                    const isValid =
                        typeof validationResult === 'boolean'
                            ? validationResult
                            : Boolean(validationResult);
                    if (!isValid) {
                        console.warn(
                            'Generated data does not match schema:',
                            validator.errors,
                        );
                    }
                }

                return generated as T;
            },
            {
                locale: options.locale,
                maxDepth: options.maxDepth ?? 10,
                randomizer: options.randomizer,
            },
        );

        this.schema = schema;
        this.jsonSchemaOptions = options;
    }

    /**
     * Creates a JsonSchemaFactory instance from a JSON Schema definition
     *
     * @param schema - The JSON Schema object
     * @param options - Configuration options for factory creation
     * @returns A Promise that resolves to a JsonSchemaFactory instance
     *
     * @throws {Error} If the required peer dependencies are not installed
     * @throws {Error} If the schema is invalid
     */
    static async create<T>(
        schema: unknown,
        options: JsonSchemaOptions = {},
    ): Promise<JsonSchemaFactory<T>> {
        // Load and setup AJV validator
        const ajv = await loadJsonSchemaValidator();
        let validator: null | ValidateFunction<T> = null;

        if (options.strictValidation) {
            try {
                validator = ajv.compile<T>(
                    schema as Parameters<typeof ajv.compile>[0],
                );
            } catch (error) {
                throw new Error(`Invalid JSON Schema: ${String(error)}`);
            }
        }

        return new JsonSchemaFactory<T>(schema, options, validator);
    }

    /**
     * Gets the options used to create this factory
     *
     * @returns The options used to create this factory
     */
    getOptions(): JsonSchemaOptions {
        return this.jsonSchemaOptions;
    }

    /**
     * Gets the original schema used to create this factory
     *
     * @returns The original schema used to create this factory
     */
    getSchema(): unknown {
        return this.schema;
    }
}

/**
 * Utility function to create multiple factories from an object containing multiple schemas
 *
 * @param schemas - Object mapping names to JSON schemas
 * @param options - Configuration options applied to all factories
 * @returns Promise resolving to object mapping names to Factory instances
 */
export async function createFactoriesFromSchemas<
    T extends Record<string, unknown>,
>(
    schemas: T,
    options: JsonSchemaOptions = {},
): Promise<{ [K in keyof T]: Factory<unknown> }> {
    const factoryEntries = await Promise.all(
        Object.entries(schemas).map(async ([name, schema]) => [
            name,
            await JsonSchemaFactory.create(schema, options),
        ]),
    );

    return Object.fromEntries(factoryEntries) as {
        [K in keyof T]: Factory<unknown>;
    };
}

/**
 * Utility function to validate that generated data matches the original schema
 *
 * @param data - The generated data to validate
 * @param schema - The JSON schema to validate against
 * @returns Promise resolving to validation result
 */
export async function validateGeneratedData(
    data: unknown,
    schema: unknown,
): Promise<{ errors?: unknown[]; valid: boolean }> {
    const ajv = await loadJsonSchemaValidator();

    try {
        const validator = ajv.compile(
            schema as Parameters<typeof ajv.compile>[0],
        );
        const validationResult = validator(data);
        const valid =
            typeof validationResult === 'boolean'
                ? validationResult
                : Boolean(validationResult);

        return {
            errors: valid ? undefined : (validator.errors ?? []),
            valid,
        };
    } catch (error) {
        return {
            errors: [{ message: `Schema compilation error: ${String(error)}` }],
            valid: false,
        };
    }
}

/**
 * Converts a JSON Schema type to appropriate Faker.js generation logic
 *
 * @param schema - JSON Schema object
 * @param faker - Faker instance
 * @param options - Configuration options
 * @param depth - Current recursion depth
 * @returns Generated value matching the schema type
 */
function createValueGenerator(
    schema: unknown,
    faker: Faker,
    options: JsonSchemaOptions = {},
    depth = 0,
): unknown {
    if (!isJsonSchema(schema)) {
        return faker.lorem.word();
    }

    // Handle $ref references
    if (hasStringProperty(schema, '$ref')) {
        // Basic $ref handling - for self-references, generate simplified structure
        if (schema.$ref === '#' || schema.$ref === '#/') {
            // Self-reference - generate simplified version to prevent infinite recursion
            if (depth >= (options.maxDepth ?? 10) / 2) {
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
        if (hasStringProperty(schema, 'type')) {
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
    if (isArray(schema.allOf)) {
        const mergedSchema: JsonSchema = {
            properties: {},
            required: [],
            type: 'object',
        };

        // Set type if available in the schema
        if (hasStringProperty(schema, 'type')) {
            const validJsonSchemaTypes = [
                'array',
                'boolean',
                'integer',
                'null',
                'number',
                'object',
                'string',
            ] as const;
            if (
                validJsonSchemaTypes.includes(
                    schema.type as (typeof validJsonSchemaTypes)[number],
                )
            ) {
                mergedSchema.type = schema.type as JsonSchema['type'];
            }
        }

        for (const subSchema of schema.allOf) {
            if (!isJsonSchema(subSchema)) {
                continue;
            }

            // Handle nested $refs in allOf
            let resolvedSubSchema: JsonSchema = subSchema;
            if (hasStringProperty(subSchema, '$ref')) {
                const generated = createValueGenerator(
                    subSchema,
                    faker,
                    options,
                    depth + 1,
                );
                if (isRecord(generated)) {
                    // Convert generated object back to schema-like structure with safe typing
                    const properties: Record<string, JsonSchema> = {};
                    for (const [key, value] of Object.entries(generated)) {
                        const valueType = typeof value;
                        if (
                            ['boolean', 'number', 'object', 'string'].includes(
                                valueType,
                            )
                        ) {
                            properties[key] = {
                                type:
                                    valueType === 'object' && value === null
                                        ? 'null'
                                        : valueType === 'object' &&
                                            Array.isArray(value)
                                          ? 'array'
                                          : (valueType as JsonSchema['type']),
                            };
                        }
                    }
                    resolvedSubSchema = {
                        properties,
                        type: 'object',
                    };
                }
            }

            if (
                hasStringProperty(resolvedSubSchema, 'type') &&
                !mergedSchema.type
            ) {
                const validJsonSchemaTypes = [
                    'array',
                    'boolean',
                    'integer',
                    'null',
                    'number',
                    'object',
                    'string',
                ] as const;
                if (
                    validJsonSchemaTypes.includes(
                        resolvedSubSchema.type as (typeof validJsonSchemaTypes)[number],
                    )
                ) {
                    mergedSchema.type =
                        resolvedSubSchema.type as JsonSchema['type'];
                }
            }
            if (isRecord(resolvedSubSchema.properties)) {
                mergedSchema.properties = {
                    ...mergedSchema.properties,
                    ...resolvedSubSchema.properties,
                };
            }
            if (isArray(resolvedSubSchema.required)) {
                mergedSchema.required = [
                    ...new Set([
                        ...(mergedSchema.required ?? []),
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

    if (isArray(schema.anyOf) || isArray(schema.oneOf)) {
        const schemas = schema.anyOf ?? schema.oneOf ?? [];

        // Filter out schemas that would cause infinite recursion
        const validSchemas = schemas.filter((subSchema: unknown) => {
            if (
                hasStringProperty(subSchema, '$ref') &&
                (subSchema.$ref === '#' || subSchema.$ref === '#/')
            ) {
                return depth < (options.maxDepth ?? 10) / 2;
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
            if (isArray(schema.enum)) {
                return faker.helpers.arrayElement(schema.enum);
            }
            return faker.lorem.word();
        }
    }
}

/**
 * Generates array values based on JSON Schema constraints
 *
 * @param schema - JSON Schema object for array type
 * @param faker - Faker instance
 * @param options - Configuration options
 * @param depth - Current recursion depth
 * @returns Array of generated values
 */
function generateArray(
    schema: JsonSchema,
    faker: Faker,
    options: JsonSchemaOptions,
    depth: number,
): unknown[] {
    const minItems = hasNumberProperty(schema, 'minItems')
        ? schema.minItems
        : 0;
    const maxItems = hasNumberProperty(schema, 'maxItems')
        ? schema.maxItems
        : Math.max(minItems + 5, 10);
    const length = faker.number.int({ max: maxItems, min: minItems });

    if (!isDefined(schema.items) || depth >= (options.maxDepth ?? 10)) {
        return [];
    }

    // Handle tuple validation (array of schemas)
    if (isArray(schema.items)) {
        return schema.items.map((itemSchema: unknown) =>
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
 * @param schema - JSON Schema object for number/integer type
 * @param faker - Faker instance
 * @param isInteger - Whether to generate integers
 * @returns Generated numeric value
 */
function generateNumber(
    schema: JsonSchema,
    faker: Faker,
    isInteger = false,
): number {
    const exclusiveMin = hasNumberProperty(schema, 'exclusiveMinimum')
        ? schema.exclusiveMinimum
        : 0;
    const min = hasNumberProperty(schema, 'minimum')
        ? schema.minimum
        : hasNumberProperty(schema, 'exclusiveMinimum')
          ? exclusiveMin + 0.01
          : 0;
    const max = hasNumberProperty(schema, 'maximum')
        ? schema.maximum
        : hasNumberProperty(schema, 'exclusiveMaximum')
          ? schema.exclusiveMaximum - 0.01
          : 1000;

    if (isInteger) {
        return faker.number.int({
            max: Math.floor(max),
            min: Math.ceil(min),
        });
    }

    let value = faker.number.float({ max, min });

    // Handle multipleOf constraint
    if (hasNumberProperty(schema, 'multipleOf')) {
        value = Math.round(value / schema.multipleOf) * schema.multipleOf;
    }

    return value;
}

/**
 * Generates object values based on JSON Schema constraints
 *
 * @param schema - JSON Schema object for object type
 * @param faker - Faker instance
 * @param options - Configuration options
 * @param depth - Current recursion depth
 * @returns Generated object with properties
 */
function generateObject(
    schema: JsonSchema,
    faker: Faker,
    options: JsonSchemaOptions,
    depth: number,
): Record<string, unknown> {
    if (depth >= (options.maxDepth ?? 10)) {
        return {};
    }

    const result: Record<string, unknown> = {};
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = isArray(schema.required) ? schema.required : [];

    // Generate required properties
    for (const prop of required) {
        if (
            typeof prop === 'string' &&
            isRecord(properties) &&
            prop in properties
        ) {
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
 * @param schema - JSON Schema object for string type
 * @param faker - Faker instance
 * @param options - Configuration options
 * @returns Generated string value
 */
function generateString(
    schema: JsonSchema,
    faker: Faker,
    options: JsonSchemaOptions,
): string {
    // Handle format-specific generation - Fixed version that addresses reviewer's concern
    if (hasStringProperty(schema, 'format')) {
        const customFormatter = options.customFormats?.[schema.format];
        if (customFormatter) {
            return customFormatter(faker);
        }

        if (schema.format in FORMAT_MAPPINGS) {
            return FORMAT_MAPPINGS[schema.format](faker);
        }
    }

    // Handle pattern constraint
    if (hasStringProperty(schema, 'pattern')) {
        try {
            // For complex patterns, generate a simple string that might match
            // Full regex generation would require additional libraries
            const minLength = hasNumberProperty(schema, 'minLength')
                ? schema.minLength
                : 5;
            return faker.string.alphanumeric(minLength);
        } catch {
            return faker.lorem.word();
        }
    }

    // Handle enum values
    if (isArray(schema.enum)) {
        return faker.helpers.arrayElement(schema.enum as string[]);
    }

    // Generate string with length constraints
    const minLength = hasNumberProperty(schema, 'minLength')
        ? schema.minLength
        : 1;
    const maxLength = hasNumberProperty(schema, 'maxLength')
        ? schema.maxLength
        : Math.max(minLength + 20, 50);
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
