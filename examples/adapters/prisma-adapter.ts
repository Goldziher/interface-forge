import { PersistenceAdapter } from '../../src/persistence-adapter';

/**
 * A persistence adapter for Prisma, allowing `Factory` to save generated
 * objects to a database via a Prisma client model.
 *
 * @template T The type of the Prisma model.
 */
export class PrismaAdapter<T> implements PersistenceAdapter<T> {
    /**
     * @param model The Prisma client model (e.g., `prisma.user`).
     * Using `unknown` here as Prisma model types are generated dynamically
     * and can be complex. For stricter typing, you might define
     * a generic `PrismaModel<T>` type based on Prisma's generated types.
     */
    constructor(private readonly model: unknown) {
        this.model = model;
    }

    /**
     * Persists a single Prisma record.
     *
     * @param data The object to be persisted.
     * @returns A Promise that resolves with the created Prisma record.
     */
    async create(data: T): Promise<T> {
        if (
            this.model &&
            typeof this.model === 'object' &&
            'create' in this.model
        ) {
            const createMethod = this.model.create as (args: {
                data: T;
            }) => Promise<T>;
            return await createMethod({ data });
        }
        throw new Error('Invalid model: create method not available');
    }

    /**
     * Persists multiple Prisma records in a batch.
     * Note: Prisma's `createMany` typically returns a count of records created,
     * not the actual created records. If you need the full records, you'd
     * need to fetch them after `createMany` or use individual `create` calls.
     * This implementation attempts to return the input data for now.
     *
     * @param data An array of objects to be persisted.
     * @returns A Promise that resolves with the count of created records for Prisma's `createMany`,
     * or the input data if returning actual records is needed (and not supported by `createMany`).
     */
    async createMany(data: T[]): Promise<T[]> {
        if (
            this.model &&
            typeof this.model === 'object' &&
            'createMany' in this.model
        ) {
            const createManyMethod = this.model.createMany as (args: {
                data: T[];
            }) => Promise<{ count: number }>;
            await createManyMethod({ data });
            return data;
        }
        throw new Error('Invalid model: createMany method not available');
    }
}
