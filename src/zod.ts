import { z, type ZodObject, type ZodType } from 'zod/v4';
import {
    Factory,
    type FactoryFunction,
    type FactoryOptions,
    type FixtureConfiguration,
    type PartialFactoryFunction,
} from './index';
import { FixtureError } from './errors';
import { isFunction, isObject } from '@tool-belt/type-predicates';
import { merge } from './utils';
import { getSchemaTypeName, type ZodTypeHandler } from './zod-schema';
import { ZodSchemaGenerator } from './zod-generator';

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
    // eslint-disable-next-line typescript/no-explicit-any -- any object shape and config, strict or loose
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
    constructor(schema: T, optionsOrFactory?: O | PartialFactoryFunction<z.output<T>>, options?: O) {
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
        this.generator = new ZodSchemaGenerator(this as unknown as ZodFactory<never>);
    }

    /**
     * Generates a batch of instances that conform to the Zod schema.
     *
     * @param size - Number of instances to generate
     * @param kwargs - Optional overrides for each instance
     * @returns Array of generated instances
     */
    batch = (size: number, kwargs?: Partial<z.output<T>> | Partial<z.output<T>>[]): z.output<T>[] => {
        this.assertSyncFactory();

        if (!Number.isInteger(size) || size < 0) {
            throw new Error('Batch size must be a non-negative integer');
        }

        if (size === 0) {
            return [];
        }

        const results: z.output<T>[] = [];
        const overridesGenerator = kwargs
            ? this.iterate<Partial<z.output<T>>>(Array.isArray(kwargs) ? kwargs : [kwargs])
            : undefined;

        for (let i = 0; i < size; i++) {
            const generatedSchema = this.generator.generateFromSchema(this.schema);
            const generatedFromFactory = this.factory(this as unknown as Factory<z.output<T>>, i);

            results.push(
                this.schema.parse({
                    ...(generatedSchema as Record<string, unknown>),
                    ...(generatedFromFactory as Record<string, unknown>),
                    ...(overridesGenerator?.next().value as Record<string, unknown> | undefined),
                }),
            );
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
    build = (kwargs?: Partial<z.output<T>>, options?: Partial<O>): z.output<T> => {
        this.assertSyncFactory();

        this.assertSyncHooks();

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
        const generatedFromFactory = this.factory(this as unknown as Factory<z.output<T>>, 0);

        const merged =
            Array.isArray(generatedSchema) || typeof generatedSchema !== 'object' || generatedSchema === null
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
    protected buildWithFixture(filePath: string, kwargs?: Partial<z.output<T>>, _options?: Partial<O>): z.output<T> {
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
        const generatedFromFactory = this.factory(this as unknown as Factory<z.output<T>>, 0);

        const merged =
            Array.isArray(generatedSchema) || typeof generatedSchema !== 'object' || generatedSchema === null
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
    protected calculateSignature(config: Required<FixtureConfiguration>): string {
        if (!createHash) {
            throw new FixtureError('Fixture functionality is not available in browser environments');
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
