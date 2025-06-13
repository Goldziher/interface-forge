/* eslint-disable unicorn/no-new-array */

import { en, Faker, LocaleDefinition, Randomizer } from '@faker-js/faker';
import {
    isAsyncFunction,
    isFunction,
    isIterator,
    isRecord,
} from '@tool-belt/type-predicates';
import { ConfigurationError } from './errors';
import { CycleGenerator, SampleGenerator } from './generators';
import { merge, Ref } from './utils';
import { PersistenceAdapter } from './persistence-adapter';

export * from '../examples/adapters/mongoose-adapter';
export * from '../examples/adapters/prisma-adapter';
export * from '../examples/adapters/typeorm-adapter';
export {
    CircularReferenceError,
    ConfigurationError,
    ValidationError,
} from './errors';
export { PersistenceAdapter } from './persistence-adapter';
export { Ref } from './utils';

export type FactoryComposition<T> = {
    [K in keyof T]?: Factory<T[K]> | T[K];
};

export type FactoryFunction<T> = (
    factory: Factory<T>,
    iteration: number,
) => FactorySchema<T>;

export type FactorySchema<T> = {
    [K in keyof T]:
        | Generator<T[K], T[K], T[K]>
        | Ref<T[K], (...args: unknown[]) => T[K]>
        | T[K];
};

type AfterBuildHook<T> = (obj: T) => Promise<T> | T;

type BeforeBuildHook<T> = (
    params: Partial<T>,
) => Partial<T> | Promise<Partial<T>>;

interface PersistenceOptions<T> {
    adapter: 'mongoose' | 'prisma' | 'typeorm' | PersistenceAdapter<T>;
    model: Record<string, unknown>;
    transaction?: Record<string, unknown>;
}

// Import the adapter classes
class MongooseAdapter<T> implements PersistenceAdapter<T> {
    constructor(private readonly model: Record<string, unknown>) {}

    async create(data: T): Promise<T> {
        const createFn = this.model.create as (data: T) => Promise<T>;
        return await createFn(data);
    }

    async createMany(data: T[]): Promise<T[]> {
        const insertManyFn = this.model.insertMany as (
            data: T[],
        ) => Promise<T[]>;
        return await insertManyFn(data);
    }
}

class PrismaAdapter<T> implements PersistenceAdapter<T> {
    constructor(private readonly model: Record<string, unknown>) {}

    async create(data: T): Promise<T> {
        const createFn = this.model.create as (options: {
            data: T;
        }) => Promise<unknown>;
        await createFn({ data });
        return data;
    }

    async createMany(data: T[]): Promise<T[]> {
        const createManyFn = this.model.createMany as (options: {
            data: T[];
        }) => Promise<void>;
        await createManyFn({ data });
        return data;
    }
}

class TypeORMAdapter<T> implements PersistenceAdapter<T> {
    constructor(private readonly repository: Record<string, unknown>) {}

    async create(data: T): Promise<T> {
        const saveFn = this.repository.save as (data: T) => Promise<T>;
        return await saveFn(data);
    }

    async createMany(data: T[]): Promise<T[]> {
        const saveFn = this.repository.save as (data: T[]) => Promise<T[]>;
        return await saveFn(data);
    }
}

/**
 * A factory class for generating type-safe mock data by extending Faker.js functionality.
 * Provides methods for creating single instances, batches, and complex object compositions
 * with support for circular references through depth control and persistence.
 *
 * @template T - The type of objects this factory generates
 */
export class Factory<T> extends Faker {
    private afterBuildHooks: AfterBuildHook<T>[] = [];
    private beforeBuildHooks: BeforeBuildHook<T>[] = [];
    private readonly factory: FactoryFunction<T>;
    private readonly maxDepth: number;
    private persistenceAdapter?: PersistenceAdapter<T>;

    constructor(
        factory: FactoryFunction<T>,
        options?: {
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
        },
    ) {
        super({
            locale: options?.locale ?? en,
            randomizer: options?.randomizer,
        });

        this.factory = factory;
        this.maxDepth = options?.maxDepth ?? 10;
    }

    /**
     * Adds a hook that will be executed after building the instance.
     * Hooks are executed in the order they were added and can be either synchronous or asynchronous.
     * This method returns the factory instance for method chaining.
     *
     * @param hook Function that receives the built instance and returns the modified instance
     * @returns The current Factory instance for method chaining
     */
    afterBuild(hook: AfterBuildHook<T>): this {
        if (!isFunction(hook) && !isAsyncFunction(hook)) {
            throw new TypeError('Hook must be a function');
        }
        this.afterBuildHooks.push(hook);
        return this;
    }

    /**
     * Generates an array of instances using the factory's schema.
     * Supports both uniform overrides (same for all instances) and individual overrides per instance.
     *
     * @param size Number of instances to generate (must be non-negative integer)
     * @param kwargs Either a single partial object (applied to all) or an array of partials (one per instance)
     * @returns Array of generated instances
     * @throws {Error} If size is negative or not an integer
     */
    batch = (size: number, kwargs?: Partial<T> | Partial<T>[]): T[] => {
        if (!Number.isInteger(size) || size < 0) {
            throw new Error('Batch size must be a non-negative integer');
        }

        if (size === 0) {
            return [];
        }

        if (kwargs) {
            const generator = this.iterate<Partial<T>>(
                Array.isArray(kwargs) ? kwargs : ([kwargs] as Partial<T>[]),
            );

            return new Array(size)
                .fill(null)
                .map((_, i) => this.#generate(i, generator.next().value, 0));
        }

        return new Array(size)
            .fill(null)
            .map((_, i) => this.#generate(i, undefined, 0));
    };

    /**
     * Adds a hook that will be executed before building the instance.
     * Hooks receive the partial parameters (kwargs) and can modify them before the instance is built.
     * Multiple hooks are executed in the order they were added.
     *
     * @param hook Function that receives partial parameters and returns modified parameters
     * @returns The current Factory instance for method chaining
     */
    beforeBuild(hook: BeforeBuildHook<T>): this {
        if (!isFunction(hook) && !isAsyncFunction(hook)) {
            throw new TypeError('Hook must be a function');
        }
        this.beforeBuildHooks.push(hook);
        return this;
    }

    /**
     * Generates a single instance of type T using the factory's schema.
     * Properties can be overridden by passing a partial object.
     * Synchronous hooks are automatically applied if registered.
     * If async hooks are registered, a ConfigurationError is thrown.
     *
     * @param kwargs Properties to override in the generated instance
     * @returns A new instance with factory-generated values merged with any overrides
     * @throws {ConfigurationError} If async hooks are registered
     */
    build = (kwargs?: Partial<T>): T => {
        const hasAsyncHooks =
            this.beforeBuildHooks.some((hook) => isAsyncFunction(hook)) ||
            this.afterBuildHooks.some((hook) => isAsyncFunction(hook));

        if (hasAsyncHooks) {
            throw new ConfigurationError(
                'Async hooks detected. Use buildAsync() method to build instances with async hooks.',
            );
        }

        let params = kwargs ?? {};

        for (const hook of this.beforeBuildHooks) {
            params = hook(params) as Partial<T>;
        }

        let result = this.#generate(0, params, 0);

        for (const hook of this.afterBuildHooks) {
            result = hook(result) as T;
        }

        return result;
    };

    /**
     * Builds an instance asynchronously with all registered hooks applied in sequence.
     * This method supports both synchronous and asynchronous hooks.
     * Hooks are executed in the order they were registered.
     *
     * @param kwargs Optional properties to override in the generated instance
     * @returns A promise that resolves to the built and processed instance
     * @throws {Error} If any hook throws an error during execution
     */
    async buildAsync(kwargs?: Partial<T>): Promise<T> {
        let params = kwargs ?? {};

        for (const hook of this.beforeBuildHooks) {
            params = await hook(params);
        }

        let result = this.#generate(0, params, 0);

        for (const hook of this.afterBuildHooks) {
            result = await hook(result);
        }

        return result;
    }

    /**
     * Creates a new factory by merging this factory's schema with additional properties.
     * Composed properties can be static values or other factory instances.
     *
     * @template U The composed type (must extend the base type T)
     * @param composition Object mapping property names to values or factories
     * @returns A new factory that generates objects with combined properties
     */
    compose<U extends T>(composition: FactoryComposition<U>): Factory<U> {
        return new Factory<U>(
            (_factory, iteration) => {
                const baseValues = this.factory(
                    this,
                    iteration,
                ) as FactorySchema<U>;
                const composedValues = Object.fromEntries(
                    Object.entries(composition).map(
                        ([key, value]) =>
                            [
                                key,
                                value instanceof Factory
                                    ? value.build()
                                    : value,
                            ] as [string, unknown],
                    ),
                );
                return { ...baseValues, ...composedValues } as FactorySchema<U>;
            },
            { maxDepth: this.maxDepth },
        );
    }

    /**
     * Creates and persists a single instance using the factory's schema.
     * Uses the configured persistence adapter if available.
     *
     * @param kwargs Optional properties to override in the generated instance
     * @returns Promise that resolves with the persisted instance
     * @throws {Error} If no persistence adapter is configured
     */
    async create(kwargs?: Partial<T>): Promise<T> {
        if (!this.persistenceAdapter) {
            throw new Error(
                'No persistence adapter configured. Call persist() first.',
            );
        }

        const instance = await this.buildAsync(kwargs);
        return this.persistenceAdapter.create(instance);
    }

    /**
     * Creates and persists multiple instances in a batch operation.
     * Uses the configured persistence adapter if available.
     *
     * @param size Number of instances to create and persist
     * @param kwargs Optional overrides for the instances
     * @returns Promise that resolves with the persisted instances
     * @throws {Error} If no persistence adapter is configured
     */
    async createMany(
        size: number,
        kwargs?: Partial<T> | Partial<T>[],
    ): Promise<T[]> {
        if (!this.persistenceAdapter) {
            throw new Error(
                'No persistence adapter configured. Call persist() first.',
            );
        }

        const instances = this.batch(size, kwargs);
        return this.persistenceAdapter.createMany(instances);
    }

    /**
     * Creates a new factory that inherits from this factory's schema with modifications.
     * Unlike compose(), extend() provides access to the factory instance for dynamic property generation.
     *
     * @template U The extended type (must extend the base type T)
     * @param factoryFn Function that returns properties to merge with the base schema
     * @returns A new factory with inherited and extended properties
     */
    extend<U extends T>(factoryFn: FactoryFunction<U>): Factory<U> {
        return new Factory<U>(
            (factory, iteration) => {
                const baseValues = this.factory(
                    this,
                    iteration,
                ) as FactorySchema<U>;
                const extendedValues = factoryFn(factory, iteration);
                return { ...baseValues, ...extendedValues };
            },
            { maxDepth: this.maxDepth },
        );
    }

    /**
     * Creates a generator that yields values from an iterable in sequential, cyclic order.
     * Values must be explicitly requested via the generator's next() method. When all values
     * have been yielded, the generator starts over from the beginning.
     *
     * @template T The type of elements in the iterable
     * @param iterable An iterable containing values to cycle through (must not be empty)
     * @returns A generator that yields values in order, restarting after the last element
     * @throws {Error} If the iterable is empty
     */
    iterate<T>(iterable: Iterable<T>): Generator<T, T, T> {
        const generator = new CycleGenerator(iterable);
        return generator.generate();
    }

    /**
     * Configures persistence for this factory instance.
     *
     * @param options Persistence configuration options
     * @returns The current Factory instance for method chaining
     */
    persist(options: PersistenceOptions<T>): this {
        if (typeof options.adapter === 'string') {
            switch (options.adapter) {
                case 'mongoose': {
                    this.persistenceAdapter = new MongooseAdapter<T>(
                        options.model,
                    );
                    break;
                }
                case 'prisma': {
                    this.persistenceAdapter = new PrismaAdapter<T>(
                        options.model,
                    );
                    break;
                }
                case 'typeorm': {
                    this.persistenceAdapter = new TypeORMAdapter<T>(
                        options.model,
                    );
                    break;
                }
                default: {
                    throw new Error(`Unsupported adapter: ${options.adapter}`);
                }
            }
        } else {
            this.persistenceAdapter = options.adapter;
        }

        return this;
    }

    /**
     * Creates a generator that yields random values from an iterable without consecutive duplicates.
     * Each value is randomly selected with replacement, but the generator ensures the same value
     * is never returned twice in a row (unless the iterable contains only one element).
     *
     * @template T The type of elements in the iterable
     * @param iterable An iterable containing values to sample from (must not be empty)
     * @returns A generator that yields random values without consecutive repetition
     * @throws {Error} If the iterable is empty
     */
    sample<T>(iterable: Iterable<T>): Generator<T, T, T> {
        const generator = new SampleGenerator(iterable);
        return generator.generate();
    }

    /**
     * Creates a reference to a function call for lazy evaluation within factory definitions.
     * The function and its arguments are stored but not executed until the factory builds an object.
     * Essential for creating relationships between factories without causing infinite recursion.
     *
     * @template C The function type
     * @param handler The function to call during object generation
     * @param args Arguments to pass to the function when called
     * @returns A reference that will execute the function during build
     */
    use<R, A extends unknown[]>(handler: (...args: A) => R, ...args: A): R {
        return new Ref({ args, handler }) as R;
    }

    #generate(iteration: number, kwargs?: Partial<T>, depth = 0): T {
        if (depth >= this.maxDepth) {
            return null as T;
        }

        const depthLimitedFactory = new Proxy(this, {
            get(target, prop) {
                if (prop === 'build') {
                    return (buildKwargs?: Partial<T>) =>
                        target.#generate(0, buildKwargs, depth + 1);
                }
                if (prop === 'batch') {
                    return (
                        size: number,
                        batchKwargs?: Partial<T> | Partial<T>[],
                    ) => {
                        if (depth + 1 >= target.maxDepth) {
                            return null;
                        }
                        if (!Number.isInteger(size) || size < 0) {
                            throw new Error(
                                'Batch size must be a non-negative integer',
                            );
                        }
                        if (size === 0) {
                            return [];
                        }
                        if (batchKwargs) {
                            const generator = target.iterate<Partial<T>>(
                                Array.isArray(batchKwargs)
                                    ? batchKwargs
                                    : ([batchKwargs] as Partial<T>[]),
                            );
                            return new Array(size)
                                .fill(null)
                                .map((_, i) =>
                                    target.#generate(
                                        i,
                                        generator.next().value,
                                        depth + 1,
                                    ),
                                );
                        }
                        return new Array(size)
                            .fill(null)
                            .map((_, i) =>
                                target.#generate(i, undefined, depth + 1),
                            );
                    };
                }
                return Reflect.get(target, prop);
            },
        });

        const defaults = this.factory(
            depthLimitedFactory as Factory<T>,
            iteration,
        );

        if (kwargs) {
            return merge(
                this.#parseValue(defaults),
                this.#parseValue(kwargs),
            ) as T;
        }

        return this.#parseValue(defaults) as T;
    }

    #parseValue(value: unknown): unknown {
        if (value instanceof Ref) {
            return value.callHandler();
        }

        if (isIterator(value)) {
            return (value as Iterator<unknown>).next().value;
        }

        if (isRecord(value)) {
            const result: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(
                value as Record<string, unknown>,
            )) {
                result[key] = this.#parseValue(val);
            }
            return result;
        }

        return value;
    }
}
