import { isRecord } from '@tool-belt/type-predicates';

/**
 * Encapsulates a function and its arguments for deferred execution within factories.
 * This enables lazy evaluation of nested factory calls, preventing infinite recursion
 * and allowing complex object relationships to be defined declaratively.
 *
 * @template T - The return type of the encapsulated function
 * @template C - The function type that returns T
 */
export class Ref<T, C extends (...args: never[]) => T> {
    private readonly args: Parameters<C>;
    private readonly handler: C;

    constructor({ args, handler }: { args: Parameters<C>; handler: C }) {
        this.handler = handler;
        this.args = args;
    }

    callHandler(): T {
        return this.handler(...this.args);
    }
}

/**
 * Converts any iterable (Set, string, Array, etc.) to an array.
 * Used internally by generators to enable indexed access to values.
 *
 * @param iterable Any JavaScript iterable
 * @returns Array containing all values from the iterable
 */
export function iterableToArray<T>(iterable: Iterable<T>): T[] {
    const values: T[] = [];
    for (const value of iterable) {
        values.push(value);
    }
    return values;
}

/**
 * Performs a deep merge of objects, recursively merging nested objects.
 * Arrays and non-object values are replaced, not merged.
 * Used for applying kwargs overrides to factory-generated values.
 *
 * @param target The base object
 * @param sources Objects whose properties will override the target
 * @returns New object with merged properties (target is not mutated)
 */
export function merge<T>(target: T, ...sources: unknown[]): T {
    // Handle special cases where target is not a mergeable object
    if (!isRecord(target)) {
        // For primitive types (null, arrays, etc.), if there are no meaningful sources to merge,
        // return the target as-is
        const mergableSources = sources.filter(
            (source) => isRecord(source) && Object.keys(source).length > 0,
        );

        if (mergableSources.length === 0) {
            return target;
        }

        // If there are meaningful sources and target is not an object,
        // we can't merge, so throw an error
        throw new Error('Cannot merge objects into a non-object target');
    }

    const output = { ...target } as Record<string, unknown>;

    for (const source of sources) {
        if (!isRecord(source)) {
            continue;
        }

        for (const key in source as Record<string, unknown>) {
            const sourceValue = (source as Record<string, unknown>)[key];
            const targetValue = output[key];

            output[key] =
                isRecord(sourceValue) && isRecord(targetValue)
                    ? merge(targetValue, sourceValue)
                    : sourceValue;
        }
    }

    return output as T;
}
