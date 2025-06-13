import { PersistenceAdapter } from '../../src/persistence-adapter';

/**
 * A persistence adapter for Mongoose, allowing `Factory` to save generated
 * objects to a MongoDB database via a Mongoose Model.
 *
 * @template T The type of the Mongoose document.
 */
export class MongooseAdapter<T> implements PersistenceAdapter<T> {
    /**
     * @param model The Mongoose Model (e.g., `UserModel`).
     * Using `unknown` here as Mongoose Model types can be complex and
     * depend on your schema definition. For stricter typing, you
     * might define a `MongooseModel<T>` interface.
     */
    constructor(private readonly model: unknown) {
        this.model = model;
    }

    /**
     * Persists a single Mongoose document.
     *
     * @param data The object to be persisted.
     * @returns A Promise that resolves with the saved Mongoose document.
     */
    async create(data: T): Promise<T> {
        if (
            this.model &&
            typeof this.model === 'object' &&
            'create' in this.model
        ) {
            const createMethod = this.model.create as (data: T) => Promise<T>;
            return await createMethod(data);
        }
        throw new Error('Invalid model: create method not available');
    }

    /**
     * Persists multiple Mongoose documents in a batch.
     *
     * @param data An array of objects to be persisted.
     * @returns A Promise that resolves with an array of the saved Mongoose documents.
     */
    async createMany(data: T[]): Promise<T[]> {
        if (
            this.model &&
            typeof this.model === 'object' &&
            'insertMany' in this.model
        ) {
            const insertManyMethod = this.model.insertMany as (
                data: T[],
            ) => Promise<T[]>;
            return await insertManyMethod(data);
        }
        throw new Error('Invalid model: insertMany method not available');
    }
}
