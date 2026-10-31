import type { LocaleDefinition, Randomizer } from '@faker-js/faker';

import type { Factory } from './index';
import type { Ref } from './utils';

export type AfterBuildHook<T> = (obj: T) => Promise<T> | T;

export type BeforeBuildHook<T> = (params: Partial<T>) => Partial<T> | Promise<Partial<T>>;

export interface CreateManyOptions<T> {
    adapter?: PersistenceAdapter<T>;
}

export interface CreateOptions<T> {
    adapter?: PersistenceAdapter<T>;
}

export type FactoryComposition<T> = {
    [K in keyof T]?: Factory<T[K]> | T[K];
};

export type FactoryFunction<T> = (
    factory: Factory<T>,
    iteration: number,
    kwargs?: Partial<T>,
) => FactorySchema<T> | Promise<FactorySchema<T>>;

export interface FactoryOptions {
    /**
     * Fixture configuration for caching generated data
     */
    fixtures?: FixtureConfiguration;
    /**
     * Enable fixture generation/loading for this build.
     * - true: Use default fixture path based on call stack
     * - string: Use as fixture file path
     */
    generateFixture?: boolean | string;
    locale?: LocaleDefinition | LocaleDefinition[];
    maxDepth?: number;
    randomizer?: Randomizer;
}

export type FactorySchema<T> = {
    [K in keyof T]: Generator<T[K], T[K], T[K]> | Ref<T[K], (...args: unknown[]) => T[K]> | T[K];
};

export interface FixtureConfiguration {
    /**
     * Base directory for storing fixtures. Defaults to process.cwd()
     */
    basePath?: string;
    /**
     * Custom directory name for fixtures. Defaults to '__fixtures__'
     * Set to empty string to store fixtures in the same directory as the file path
     */
    directory?: string;
    /**
     * Whether to include the factory function source in signature calculation. Defaults to true
     */
    includeSource?: boolean;
    /**
     * Whether to use subdirectories for fixtures. Defaults to true
     * When true: fixtures are stored in a subdirectory (e.g., /path/__fixtures__/file.json)
     * When false: fixtures are stored directly in the path (e.g., /path/file.json)
     */
    useSubdirectory?: boolean;
    /**
     * Whether to validate factory signature changes. Defaults to true
     */
    validateSignature?: boolean;
}

export interface FixtureMetadata {
    /**
     * ISO 8601 timestamp when the fixture was created
     */
    createdAt: string;
    /**
     * The actual fixture data
     */
    data: unknown;
    /**
     * SHA-256 hash of the factory configuration
     */
    signature: string;
    /**
     * Fixture version for future compatibility
     */
    version: number;
}

export type PartialFactoryFunction<T> = (
    factory: Factory<T>,
    iteration: number,
) => Partial<FactorySchema<T>> | Promise<Partial<FactorySchema<T>>>;

/**
 * Interface for a persistence adapter.
 * Adapters are responsible for interacting with the underlying data store
 * (e.g., database, API) to save generated objects.
 */
export interface PersistenceAdapter<T, R = T> {
    /**
     * Persists a single generated object to the data store.
     *
     * @param data The object to persist.
     * @returns A promise that resolves with the persisted object,
     * including any properties assigned by the database (e.g., auto-generated IDs).
     */
    create(data: T): Promise<R>;

    /**
     * Persists multiple generated objects to the data store in a batch.
     *
     * @param data An array of objects to persist.
     * @returns A promise that resolves with an array of the persisted objects,
     * including any properties assigned by the database.
     */
    createMany(data: T[]): Promise<R[]>;
}
