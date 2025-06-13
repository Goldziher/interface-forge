import { PersistenceAdapter } from '../../src/persistence-adapter';

/**
 * A persistence adapter for TypeORM, allowing `Factory` to save generated
 * objects to a database via a TypeORM Repository.
 *
 * @template T The type of the TypeORM entity.
 */
export class TypeORMAdapter<T extends object> implements PersistenceAdapter<T> {
    /**
     * @param repository The TypeORM Repository (e.g., `AppDataSource.getRepository(User)`).
     * Using `unknown` here as TypeORM Repository types can be complex and
     * depend on your entity definition. For stricter typing, you
     * might define a `TypeORMRepository<T>` interface.
     */
    constructor(private readonly repository: unknown) {
        this.repository = repository;
    }

    /**
     * Persists a single TypeORM entity.
     *
     * @param data The object to be persisted.
     * @returns A Promise that resolves with the saved TypeORM entity.
     */
    async create(data: T): Promise<T> {
        if (
            this.repository &&
            typeof this.repository === 'object' &&
            'save' in this.repository
        ) {
            const saveMethod = this.repository.save as (data: T) => Promise<T>;
            return await saveMethod(data);
        }
        throw new Error('Invalid repository: save method not available');
    }

    /**
     * Persists multiple TypeORM entities in a batch.
     *
     * @param data An array of objects to be persisted.
     * @returns A Promise that resolves with an array of the saved TypeORM entities.
     */
    async createMany(data: T[]): Promise<T[]> {
        if (
            this.repository &&
            typeof this.repository === 'object' &&
            'save' in this.repository
        ) {
            const saveMethod = this.repository.save as (
                data: T[],
            ) => Promise<T[]>;
            return await saveMethod(data);
        }
        throw new Error('Invalid repository: save method not available');
    }
}
