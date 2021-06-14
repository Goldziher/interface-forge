import {
    FactoryBuildOptions,
    FactoryFunction,
    FactoryOptions,
    FactorySchema,
} from './types';
import { Ref } from './ref';
import { isOfType } from './utils';

export class BuildArgProxy {}

export class TypeFactory<T> {
    private readonly _defaults: FactoryOptions<T>;
    public counter: number;
    public factory?: FactoryFunction<T>;

    constructor(defaults: FactoryOptions<T>, factory?: FactoryFunction<T>) {
        this._defaults = defaults;
        this.factory = factory;
        this.counter = 0;
    }

    get defaults(): Promise<FactorySchema<T>> {
        return typeof this._defaults === 'function'
            ? Promise.resolve(this._defaults(this.counter))
            : Promise.resolve(this._defaults);
    }

    private static async parse_schema<T>(
        schema: FactorySchema<T>,
        iteration: number,
    ): Promise<T> {
        const output: Record<string, unknown> = {};
        for (const [key, rawValue] of Object.entries(schema)) {
            const value = await Promise.resolve(rawValue);
            if (value instanceof TypeFactory) {
                output[key] = await value.build();
            } else if (value instanceof Ref) {
                output[key] = await value.fn(iteration);
            } else if (isOfType<Generator<any, any, any>>(value, 'next')) {
                output[key] = await value.next().value;
            } else if (
                typeof value === 'object' &&
                !Array.isArray(value) &&
                value !== null
            ) {
                output[key] = await TypeFactory.parse_schema(value, iteration);
            } else {
                output[key] = value;
            }
        }

        return output as T;
    }

    private validate_schema(schema: FactorySchema<T>): void {
        const missingValues: string[] = [];
        Object.entries(schema).forEach(([key, value]) => {
            if (value instanceof BuildArgProxy) {
                missingValues.push(key);
            }
        });
        if (missingValues.length) {
            throw new Error(
                `[interface-forge] missing required build arguments: ${missingValues.join(
                    ', ',
                )}`,
            );
        }
    }

    resetCounter(value = 0): void {
        this.counter = value;
    }

    async build(options?: FactoryBuildOptions<T>): Promise<T> {
        const iteration = this.counter;
        this.counter++;
        const mergedSchema = Object.assign(
            {},
            await this.defaults,
            await Promise.resolve(
                typeof options?.overrides === 'function'
                    ? options.overrides(iteration)
                    : options?.overrides,
            ),
        );
        this.validate_schema(mergedSchema);
        const value = await TypeFactory.parse_schema<T>(
            mergedSchema,
            iteration,
        );
        const fn = options?.factory ?? this.factory;
        return Promise.resolve(fn ? fn(value, iteration) : value);
    }

    async batch(size: number, options?: FactoryBuildOptions<T>): Promise<T[]> {
        this.resetCounter();
        return Promise.all(
            new Array(size).fill(null).map(() => this.build(options)),
        );
    }

    static bind<P>(fn: (iteration: number) => Promise<P> | P): Ref<P> {
        return new Ref<P>(fn);
    }

    static use<P>(
        forgeInstance: TypeFactory<P>,
        options?: FactoryBuildOptions<P>,
    ): Ref<P> {
        return new Ref<P>(() => forgeInstance.build(options));
    }

    static useBatch<P>(
        forgeInstance: TypeFactory<P>,
        size: number,
        options?: FactoryBuildOptions<P>,
    ): Ref<P[]> {
        return new Ref<P[]>(() => forgeInstance.batch(size, options));
    }

    static iterate<P>(list: P[]): Generator<P, P, P> {
        return (function* () {
            let counter = 0;
            while (true) {
                const value = list[counter];
                if (counter === list.length - 1) {
                    counter = 0;
                } else {
                    counter++;
                }
                yield value;
            }
        })();
    }

    static required(): BuildArgProxy {
        return new BuildArgProxy();
    }
}
