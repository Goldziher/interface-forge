import { iterableToArray } from './utils';

export interface DateSequenceOptions {
    start: Date | number | string;
    step?: number;
    unit?: 'day' | 'hour' | 'minute';
}

export interface IncrementSequenceOptions {
    start?: number;
    step?: number;
}

export interface TemplateSequenceOptions {
    start?: number;
}

/**
 * Abstract base class for generators that produce infinite sequences from finite iterables.
 * Converts iterables to arrays for efficient random access and validates non-empty input.
 *
 * @template T - The type of values to generate
 */
export abstract class BaseGenerator<T> {
    protected values: T[];

    constructor(iterable: Iterable<T>) {
        this.values = iterableToArray(iterable);
        if (this.values.length === 0) {
            throw new Error('Cannot create generator from empty iterable');
        }
    }

    abstract generate(): Generator<T, T, T>;
}

/**
 * Generates values by cycling through an array in sequential order.
 * When the end is reached, it starts over from the beginning, creating an infinite sequence.
 * Useful for predictable, repeating patterns in test data.
 *
 * @template T - The type of values to cycle through
 */
export class CycleGenerator<T> extends BaseGenerator<T> {
    generate(): Generator<T, T, T> {
        const { values } = this;
        return (function* () {
            let counter = 0;
            while (true) {
                yield values[counter];
                counter = (counter + 1) % values.length;
            }
        })();
    }
}

/**
 * Generates random values from an array while preventing consecutive duplicates.
 * Each value is randomly selected, but the same value will never appear twice in a row
 * unless the array contains only one element. Useful for creating varied but not
 * repetitive test data.
 *
 * @template T - The type of values to sample from
 */
export class SampleGenerator<T> extends BaseGenerator<T> {
    generate(): Generator<T, T, T> {
        const { values } = this;
        return (function* () {
            if (values.length === 1) {
                while (true) {
                    yield values[0];
                }
            } else {
                let lastValue: null | T = null;
                while (true) {
                    let newValue: T;
                    do {
                        newValue = values[Math.floor(Math.random() * values.length)];
                    } while (newValue === lastValue);

                    lastValue = newValue;
                    yield newValue;
                }
            }
        })();
    }
}

/**
 * Generates an infinite numeric sequence.
 */
export class IncrementSequenceGenerator {
    readonly #start: number;
    readonly #step: number;

    constructor({ start = 1, step = 1 }: IncrementSequenceOptions = {}) {
        this.#start = start;
        this.#step = step;
    }

    generate(): Generator<number, number, number> {
        const start = this.#start;
        const step = this.#step;
        return (function* () {
            let current = start;
            while (true) {
                yield current;
                current += step;
            }
        })();
    }
}

/**
 * Generates strings by replacing numeric placeholders in a template.
 */
export class TemplateSequenceGenerator {
    readonly #pattern: string;
    readonly #start: number;

    constructor(pattern: string, { start = 1 }: TemplateSequenceOptions = {}) {
        if (!pattern.includes('{n}') && !/\{0+\}/.test(pattern)) {
            throw new Error('Template sequence pattern must include {n} or a padded placeholder like {0000}');
        }
        this.#pattern = pattern;
        this.#start = start;
    }

    generate(): Generator<string, string, string> {
        const pattern = this.#pattern;
        const start = this.#start;
        return (function* () {
            let current = start;
            while (true) {
                yield pattern
                    .replaceAll('{n}', String(current))
                    .replaceAll(/\{(0+)\}/g, (_match: string, padding: string) =>
                        String(current).padStart(padding.length, '0'),
                    );
                current += 1;
            }
        })();
    }
}

/**
 * Generates dates by stepping from a fixed start date.
 */
export class DateSequenceGenerator {
    readonly #start: Date;
    readonly #step: number;
    readonly #unit: 'day' | 'hour' | 'minute';

    constructor({ start, step = 1, unit = 'day' }: DateSequenceOptions) {
        const date = new Date(start);
        if (Number.isNaN(date.getTime())) {
            throw new Error('Date sequence start must be a valid date');
        }

        this.#start = date;
        this.#step = step;
        this.#unit = unit;
    }

    generate(): Generator<Date, Date, Date> {
        const start = this.#start;
        const step = this.#step;
        const unit = this.#unit;
        return (function* () {
            let offset = 0;
            while (true) {
                const date = new Date(start);
                if (unit === 'day') {
                    date.setUTCDate(date.getUTCDate() + offset);
                } else if (unit === 'hour') {
                    date.setUTCHours(date.getUTCHours() + offset);
                } else {
                    date.setUTCMinutes(date.getUTCMinutes() + offset);
                }
                yield date;
                offset += step;
            }
        })();
    }
}

export interface SequenceFactory {
    date(options: DateSequenceOptions): Generator<Date, Date, Date>;
    increment(options?: IncrementSequenceOptions): Generator<number, number, number>;
    template(pattern: string, options?: TemplateSequenceOptions): Generator<string, string, string>;
}

export function createSequenceFactory(): SequenceFactory {
    const dateState = new Map<string, number>();
    const incrementState = new Map<string, number>();
    const templateState = new Map<string, number>();

    const getCallsiteKey = (kind: string): string => {
        const frame =
            new Error().stack
                ?.split('\n')
                .map((line) => line.trim())
                .find(
                    (line) =>
                        !line.includes('generators.') && !line.includes('generators.ts') && !line.includes('Error'),
                ) ?? kind;
        return `${kind}:${frame}`;
    };

    return {
        date: (options) => {
            const key = getCallsiteKey('date');
            const { start, step = 1, unit = 'day' } = options;
            return (function* () {
                while (true) {
                    const offset = dateState.get(key) ?? 0;
                    const date = new Date(start);
                    if (Number.isNaN(date.getTime())) {
                        throw new Error('Date sequence start must be a valid date');
                    }
                    if (unit === 'day') {
                        date.setUTCDate(date.getUTCDate() + offset);
                    } else if (unit === 'hour') {
                        date.setUTCHours(date.getUTCHours() + offset);
                    } else {
                        date.setUTCMinutes(date.getUTCMinutes() + offset);
                    }
                    dateState.set(key, offset + step);
                    yield date;
                }
            })();
        },
        increment: (options = {}) => {
            const key = getCallsiteKey('increment');
            const { start = 1, step = 1 } = options;
            return (function* () {
                while (true) {
                    const current = incrementState.get(key) ?? start;
                    incrementState.set(key, current + step);
                    yield current;
                }
            })();
        },
        template: (pattern, options = {}) => {
            const key = getCallsiteKey('template');
            const { start = 1 } = options;
            if (!pattern.includes('{n}') && !/\{0+\}/.test(pattern)) {
                throw new Error('Template sequence pattern must include {n} or a padded placeholder like {0000}');
            }
            return (function* () {
                while (true) {
                    const current = templateState.get(key) ?? start;
                    templateState.set(key, current + 1);
                    yield pattern
                        .replaceAll('{n}', String(current))
                        .replaceAll(/\{(0+)\}/g, (_match: string, padding: string) =>
                            String(current).padStart(padding.length, '0'),
                        );
                }
            })();
        },
    };
}
