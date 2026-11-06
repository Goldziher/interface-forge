import { ConstraintError } from './errors';
import { Ref } from './utils';

/**
 * Default number of generation attempts for retry-based constraints
 * (`unique`, `pattern`, `custom`) before a `ConstraintError` is thrown.
 */
export const DEFAULT_CONSTRAINT_ATTEMPTS = 5;

export interface ConstraintOptions {
    /**
     * Maximum generation attempts before a `ConstraintError` is thrown.
     * Defaults to {@link DEFAULT_CONSTRAINT_ATTEMPTS}.
     */
    attempts?: number;
}

export type Pattern = string | RegExp;

type Generate<R> = () => R;

/**
 * Sync constraint helpers for core factories (Zod/JSON Schema factories have
 * their own validation layers). Every helper produces a runtime reference
 * (Ref), just like `use()`, so the constrained value regenerates on every
 * build/batch and can be defined once and reused.
 *
 * Uniqueness is factory-local: each factory instance exposes its own
 * `constraints` object and therefore its own uniqueness tracking.
 *
 * @example
 * ```typescript
 * const UserFactory = new Factory<User>((faker) => ({
 *   age: factory.use(() => ...),
 *   email: factory.constraints.unique('email', () => faker.internet.email()),
 * }));
 * ```
 */
export class Constraints {
    readonly #uniqueValues = new Map<string, Set<unknown>>();

    /**
     * Produces a number constrained to at least `minValue` by clamping
     * the generated value (clamping keeps results deterministic and total).
     */
    min(minValue: number, generate: Generate<number>): number {
        return this.#ref<number, [Generate<number>, number]>(
            (generate, minValue) => Math.max(generate(), minValue),
            generate,
            minValue,
        );
    }

    /**
     * Produces a number constrained to at most `maxValue` by clamping
     * the generated value.
     */
    max(maxValue: number, generate: Generate<number>): number {
        return this.#ref<number, [Generate<number>, number]>(
            (generate, maxValue) => Math.min(generate(), maxValue),
            generate,
            maxValue,
        );
    }

    /**
     * Produces a number constrained to the inclusive `[minValue, maxValue]`
     * range by clamping the generated value.
     */
    between(minValue: number, maxValue: number, generate: Generate<number>): number {
        return this.#ref<number, [Generate<number>, number, number]>(
            (generate, maxValue, minValue) => Math.min(maxValue, Math.max(generate(), minValue)),
            generate,
            maxValue,
            minValue,
        );
    }

    /**
     * Produces a string matching `pattern`, regenerating until a match or
     * the attempt limit is reached (then a `ConstraintError` is thrown).
     */
    pattern(pattern: Pattern, generate: Generate<string>, options?: ConstraintOptions): string {
        return this.#ref<string, [Generate<string>, ConstraintOptions | undefined, Pattern]>(
            (generate, options, pattern) => {
                const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
                return this.#retry(generate, (value) => regex.test(value), options, undefined, 'pattern');
            },
            generate,
            options,
            pattern,
        );
    }

    /**
     * Produces a value the caller-defined `accepts` predicate approves,
     * regenerating until the predicate passes or the attempt limit is
     * reached (then a `ConstraintError` is thrown).
     */
    custom<R>(field: string, accepts: (value: R) => boolean, generate: Generate<R>, options?: ConstraintOptions): R {
        return this.#ref<R, [(value: R) => boolean, string, Generate<R>, ConstraintOptions | undefined]>(
            (accepts, field, generate, options) => this.#retry(generate, accepts, options, field, 'custom'),
            accepts,
            field,
            generate,
            options,
        );
    }

    /**
     * Produces a value not seen before for `field` on this factory
     * (factory-local uniqueness). Uniqueness is tracked across builds and
     * batch items on the factory's `constraints` object.
     */
    unique<R>(field: string, generate: Generate<R>, options?: ConstraintOptions): R {
        return this.#ref<R, [string, Generate<R>, ConstraintOptions | undefined]>(
            (field, generate, options) =>
                this.#retry(generate, (value) => this.#rememberUnique(field, value), options, field, 'unique'),
            field,
            generate,
            options,
        );
    }

    #ref<R, A extends unknown[]>(handler: (...args: A) => R, ...args: A): R {
        return new Ref({ args, handler }) as R;
    }

    #rememberUnique(field: string, value: unknown): boolean {
        let seen = this.#uniqueValues.get(field);
        if (!seen) {
            seen = new Set();
            this.#uniqueValues.set(field, seen);
        }
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    }

    #retry<R>(
        generate: Generate<R>,
        accepts: (value: R) => boolean,
        options: ConstraintOptions | undefined,
        field: string | undefined,
        constraint: string,
    ): R {
        const attempts = options?.attempts ?? DEFAULT_CONSTRAINT_ATTEMPTS;
        for (let attempt = 0; attempt < attempts; attempt++) {
            const value = generate();
            if (accepts(value)) {
                return value;
            }
        }
        throw new ConstraintError({ attempts, constraint, field });
    }
}
