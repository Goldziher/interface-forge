/**
 * Interface for a persistence adapter.
 * Adapters are responsible for interacting with the underlying data store
 * (e.g., database, API) to save generated objects.
 */
export interface PersistenceAdapter<T> {
    /**
     * Persists a single generated object to the data store.
     *
     * @param data The object to persist.
     * @returns A promise that resolves with the persisted object,
     * including any properties assigned by the database (e.g., auto-generated IDs).
     */
    create(data: T): Promise<T>;

    /**
     * Persists multiple generated objects to the data store in a batch.
     *
     * @param data An array of objects to persist.
     * @returns A promise that resolves with an array of the persisted objects,
     * including any properties assigned by the database.
     */
    createMany(data: T[]): Promise<T[]>;
}
