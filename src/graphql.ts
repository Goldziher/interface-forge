import type { GraphQLInputObjectType, GraphQLObjectType, GraphQLSchema, GraphQLScalarType, GraphQLType } from 'graphql';
import {
    buildSchema,
    isAbstractType,
    isEnumType,
    isInputObjectType,
    isListType,
    isNonNullType,
    isObjectType,
    isScalarType,
} from 'graphql';
import { isFunction, isObject, isRecord } from '@tool-belt/type-predicates';

import { COLLECTION_SIZES, DEFAULT_MAX_DEPTH, NUMBER_CONSTRAINTS } from './constants';
import { ConfigurationError } from './errors';
import { Factory, type FactoryFunction, type FactoryOptions, type PartialFactoryFunction } from './index';

/**
 * Options for GraphQL factories.
 */
export interface GraphQLFactoryOptions extends FactoryOptions {
    /**
     * Custom generator functions for named scalars, keyed by scalar name.
     *
     * @example
     * ```typescript
     * const factories = createGraphQLFactories(sdl, {
     *   customScalarGenerators: {
     *     DateTime: () => '2026-01-01T00:00:00Z',
     *   },
     * });
     * ```
     */
    customScalarGenerators?: Record<string, () => unknown>;
}

/**
 * Factories for every object and input object type in a GraphQL schema,
 * keyed by type name as returned by {@link createGraphQLFactories}.
 */
export type GraphQLFactories = Record<string, GraphQLFactory>;

function mergeGenerated<T>(generated: unknown, factoryValues: unknown): T {
    if (isRecord(generated) && isRecord(factoryValues)) {
        return {
            ...generated,
            ...factoryValues,
        } as T;
    }
    return (
        factoryValues === undefined || (isRecord(factoryValues) && Object.keys(factoryValues).length === 0)
            ? generated
            : factoryValues
    ) as T;
}

const BUILTIN_SCALARS = new Set(['Boolean', 'Float', 'ID', 'Int', 'String']);

class GraphQLGenerator {
    readonly #customScalarGenerators: GraphQLFactoryOptions['customScalarGenerators'];
    readonly #factory: Factory<unknown>;
    readonly #rootSchema: GraphQLSchema;

    constructor(
        factory: Factory<unknown>,
        rootSchema: GraphQLSchema,
        customScalarGenerators: GraphQLFactoryOptions['customScalarGenerators'],
    ) {
        this.#factory = factory;
        this.#rootSchema = rootSchema;
        this.#customScalarGenerators = customScalarGenerators;
    }

    generate(type: GraphQLType, currentDepth = 0, nullable = false): unknown {
        if (isNonNullType(type)) {
            return this.generate(type.ofType, currentDepth, false);
        }

        if (isListType(type)) {
            const count = this.#factory.number.int({
                max: COLLECTION_SIZES.DEFAULT_ARRAY_MAX,
                min: COLLECTION_SIZES.DEFAULT_ARRAY_MIN,
            });
            return Array.from({ length: count }, () => this.generate(type.ofType, currentDepth + 1, true));
        }

        if (isEnumType(type)) {
            const values = type.getValues().map((value) => value.value);
            return this.#factory.helpers.arrayElement(values);
        }

        if (isScalarType(type)) {
            return this.#generateScalar(type, nullable);
        }

        if (isObjectType(type) || isInputObjectType(type)) {
            if (currentDepth >= (this.#factory.options?.maxDepth ?? DEFAULT_MAX_DEPTH)) {
                return null;
            }
            return this.#generateObject(type, currentDepth);
        }

        if (isAbstractType(type)) {
            // Union/interface resolution is intentionally minimal: the first possible type.
            const possible = this.#rootSchema.getPossibleTypes(type);
            if (possible.length > 0) {
                return this.generate(possible[0], currentDepth);
            }
        }

        throw new ConfigurationError(`Cannot generate data for GraphQL type ${String(type)}`);
    }

    #generateObject(type: GraphQLObjectType | GraphQLInputObjectType, currentDepth: number): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [name, field] of Object.entries(type.getFields())) {
            result[name] = this.generate(field.type, currentDepth + 1, !isNonNullType(field.type));
        }
        return result;
    }

    #generateScalar(type: GraphQLScalarType, nullable: boolean): unknown {
        const custom = this.#customScalarGenerators?.[type.name];
        if (custom) {
            return custom();
        }

        if (BUILTIN_SCALARS.has(type.name)) {
            switch (type.name) {
                case 'Boolean':
                    return this.#factory.datatype.boolean();
                case 'Float':
                    return this.#factory.number.float({
                        max: NUMBER_CONSTRAINTS.DEFAULT_MAX,
                        min: NUMBER_CONSTRAINTS.DEFAULT_MIN,
                    });
                case 'ID':
                    return this.#factory.string.uuid();
                case 'Int':
                    return this.#factory.number.int({
                        max: NUMBER_CONSTRAINTS.DEFAULT_INT_MAX,
                        min: NUMBER_CONSTRAINTS.DEFAULT_INT_MIN,
                    });
                case 'String':
                    return this.#factory.lorem.word();
            }
        }

        if (nullable) {
            return null;
        }

        throw new ConfigurationError(
            `No generator for required scalar "${type.name}". Provide a customScalarGenerators entry for it.`,
        );
    }
}

/**
 * A factory class for generating mock data that conforms to a GraphQL object
 * or input object type, built on top of the core {@link Factory}.
 *
 * @example
 * ```typescript
 * import { createGraphQLFactories } from 'interface-forge/graphql';
 *
 * const factories = createGraphQLFactories(`type User { id: ID!, name: String! }`);
 * const user = factories.User.build() as { id: string; name: string };
 * ```
 */
export class GraphQLFactory<
    T = Record<string, unknown>,
    O extends GraphQLFactoryOptions = GraphQLFactoryOptions,
> extends Factory<T, O> {
    readonly #schema: GraphQLSchema;
    declare batch: (size: number, kwargs?: Partial<T> | Partial<T>[], options?: Partial<O>) => T[];
    declare batchAsync: (size: number, kwargs?: Partial<T> | Partial<T>[], options?: Partial<O>) => Promise<T[]>;
    declare build: (kwargs?: Partial<T>, options?: Partial<O>) => T;
    declare buildAsync: (kwargs?: Partial<T>, options?: Partial<O>) => Promise<T>;

    constructor(
        schema: GraphQLSchema,
        type: GraphQLInputObjectType | GraphQLObjectType,
        optionsOrFactory?: O | PartialFactoryFunction<T>,
        options?: O,
    ) {
        const generatorRef: { value?: GraphQLGenerator } = {};
        const factoryFunction = isFunction(optionsOrFactory)
            ? optionsOrFactory
            : ((() => ({})) as PartialFactoryFunction<T>);
        const factoryOptions = isObject(options)
            ? options
            : isObject(optionsOrFactory) && !isFunction(optionsOrFactory)
              ? (optionsOrFactory as O)
              : ({} as O);

        super(
            ((factory, iteration, kwargs) => {
                const generator = generatorRef.value;
                if (!generator) {
                    throw new ConfigurationError('GraphQL generator has not been initialized');
                }
                const generated = generator.generate(type);
                const factoryValues = (factoryFunction as FactoryFunction<T>)(factory as Factory<T>, iteration, kwargs);
                if (factoryValues instanceof Promise) {
                    return factoryValues.then((values) => mergeGenerated<T>(generated, values)) as Promise<T>;
                }
                return mergeGenerated<T>(generated, factoryValues);
            }) as FactoryFunction<T>,
            factoryOptions,
        );

        this.#schema = schema;
        generatorRef.value = new GraphQLGenerator(
            this as unknown as Factory<unknown>,
            schema,
            factoryOptions.customScalarGenerators,
        );
    }

    get schema(): GraphQLSchema {
        return this.#schema;
    }
}

/**
 * Builds a factory for every object and input object type in a GraphQL schema.
 *
 * @param schema SDL string or an already-built `GraphQLSchema`
 * @param options Factory options shared by every generated factory, including
 *   `maxDepth` handling and `customScalarGenerators`
 * @returns Map of type name to factory
 *
 * @example
 * ```typescript
 * const factories = createGraphQLFactories(sdl, { maxDepth: 3 });
 * const post = factories.Post.build();
 * ```
 */
export function createGraphQLFactories(
    schema: string | GraphQLSchema,
    options?: GraphQLFactoryOptions,
): GraphQLFactories {
    const resolvedSchema = typeof schema === 'string' ? buildSchema(schema) : schema;
    const factories: GraphQLFactories = {};

    for (const type of Object.values(resolvedSchema.getTypeMap())) {
        if ((isObjectType(type) || isInputObjectType(type)) && !type.name.startsWith('__')) {
            factories[type.name] = new GraphQLFactory(resolvedSchema, type, options);
        }
    }

    return factories;
}
