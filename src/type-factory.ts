/* eslint-disable unicorn/no-new-array */
import { isPromise } from '@tool-belt/type-predicates';

import { ERROR_MESSAGES } from './constants';
import { iterate, sample } from './helpers';
import {
    FactoryBuildOptions,
    FactoryDefaults,
    FactoryFunction,
    FactorySchema,
    UseOptions,
} from './types';
import { merge } from './utils/general';
import { parseOptions } from './utils/options';
import { parseFactorySchema } from './utils/schema';
import {
    validateFactoryResult,
    validateFactorySchema,
} from './utils/validators';

interface SyncBuildArgs<T> {
    defaults: FactorySchema<T>;
    factory?: FactoryFunction<T>;
    iteration: number;
    overrides?: FactoryDefaults<Partial<T>>;
}

interface AsyncBuildArgs<T> {
    defaults: Promise<FactorySchema<T>> | FactorySchema<T>;
    factory?: FactoryFunction<T>;
    iteration: number;
    overrides?:
        | Promise<FactoryDefaults<Partial<T>>>
        | FactoryDefaults<Partial<T>>;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class BuildArgProxy {
    // This class is intentionally left empty.
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DerivedValueProxy {
    // This class is intentionally left empty.
}

export class Ref<T> {
    readonly value: ((iteration: number) => Promise<T> | T) | TypeFactory<T>;
    readonly options?: UseOptions<T>;

    constructor(
        value: ((iteration: number) => Promise<T> | T) | TypeFactory<T>,
        options?: Record<string, any>,
    ) {
        this.value = value;
        this.options = options;
    }
}

/**
 * Represents a factory for creating instances of type `T`. This class provides methods to build
 * single instances (`build` and `buildSync`), and to build batches of instances (`batch` and `batchSync`).
 * It supports both synchronous and asynchronous creation patterns, allowing for complex object
 * construction scenarios, including handling asynchronous defaults or overrides.
 *
 * The factory maintains an internal counter to support unique instance creation through iteration,
 * and allows for resetting this counter as needed.
 * @template T The type of object this factory produces.
 */
export class TypeFactory<T> {
    private readonly defaults: FactoryDefaults<T>;
    public counter: number;
    public factory?: FactoryFunction<T>;

    /**
     * Constructs a new `TypeFactory` instance.
     * @param defaults - The default values or a function returning default values for instances of type `T`.
     * @param factory - An optional custom function used to create instances of type `T`.
     */
    constructor(defaults: FactoryDefaults<T>, factory?: FactoryFunction<T>) {
        this.defaults = defaults;
        this.factory = factory;
        this.counter = 0;
    }

    /**
     * Resets the internal counter to a specified value, defaulting to 0.
     * @param value - The value to reset the counter to. Defaults to 0.
     */
    resetCounter(value = 0): void {
        this.counter = value;
    }

    private preBuild = (
        isSync: boolean,
        options?: FactoryBuildOptions<T>,
    ): SyncBuildArgs<T> | AsyncBuildArgs<T> => {
        const iteration = this.counter;
        this.counter++;
        const defaults =
            typeof this.defaults === 'function'
                ? this.defaults(iteration)
                : this.defaults;
        const [overrides, factory = this.factory] = parseOptions<T>(
            options,
            iteration,
        );
        if (isSync) {
            if (isPromise(defaults)) {
                throw new Error(ERROR_MESSAGES.PROMISE_DEFAULTS);
            }
            if (isPromise(overrides)) {
                throw new Error(ERROR_MESSAGES.PROMISE_OVERRIDES);
            }
        }
        return { defaults, factory, iteration, overrides };
    };

    private postBuild(isSync: boolean, result: T | Promise<T>): T | Promise<T> {
        if (isPromise(result)) {
            if (isSync) {
                throw new Error(ERROR_MESSAGES.PROMISE_FACTORY);
            }
            return result.then(
                (value) => validateFactoryResult(value as any) as T,
            );
        }
        return validateFactoryResult(result as any) as T;
    }

    private performBuild(
        defaults: FactoryDefaults<T>,
        overrides: FactoryDefaults<Partial<T>> | undefined,
        iteration: number,
        isSync: boolean,
    ): T | Promise<T> {
        const mergedSchema = validateFactorySchema(
            merge(defaults, overrides) as FactorySchema<T>,
        );
        return parseFactorySchema<T>(mergedSchema, iteration, isSync);
    }

    build = async (options?: FactoryBuildOptions<T>): Promise<T> => {
        const { defaults, overrides, factory, iteration } = this.preBuild(
            false,
            options,
        );
        const value = await this.performBuild(
            await defaults,
            await overrides,
            iteration,
            false,
        );
        return this.postBuild(
            false,
            factory ? factory(value, iteration) : value,
        );
    };

    buildSync = (options?: FactoryBuildOptions<T>): T => {
        const { defaults, overrides, factory, iteration } = this.preBuild(
            true,
            options,
        ) as SyncBuildArgs<T>;
        const value = this.performBuild(
            defaults,
            overrides,
            iteration,
            true,
        ) as T;
        return this.postBuild(
            true,
            factory ? factory(value, iteration) : value,
        ) as T;
    };

    async batch(size: number, options?: FactoryBuildOptions<T>): Promise<T[]> {
        return Promise.all(new Array(size).fill(options).map(this.build));
    }

    batchSync(size: number, options?: FactoryBuildOptions<T>): T[] {
        return new Array(size).fill(options).map(this.buildSync);
    }

    static required(): BuildArgProxy {
        return new BuildArgProxy();
    }

    static derived(): DerivedValueProxy {
        return new DerivedValueProxy();
    }

    static use<P>(
        value: ((iteration: number) => Promise<P> | P) | TypeFactory<P>,
        options?: UseOptions<P>,
    ): Ref<P> {
        return new Ref<P>(value, options);
    }

    static iterate = iterate;
    static sample = sample;
}
