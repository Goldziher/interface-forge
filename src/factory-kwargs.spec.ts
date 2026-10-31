import { Factory } from './index.js';
import { describe, expect, it } from 'vitest';

interface TestObject {
    age?: number;
    name: string;
}

export interface ComplexObject extends Record<string, any> {
    name: string;
    options?: Options;
    value: null | number;
}

export interface Options extends Record<string, any> {
    children?: ComplexObject[];
    type: '1' | '2' | '3' | 'all' | 'none';
}

describe('Factory class functionality', () => {
    describe('FactoryFunction kwargs parameter', () => {
        describe('synchronous factory functions', () => {
            it('receives kwargs parameter when overrides are provided', () => {
                let receivedKwargs: Partial<TestObject> | undefined;
                const factory = new Factory<TestObject>((factory, _iteration, kwargs) => {
                    receivedKwargs = kwargs;
                    return {
                        age: kwargs?.age ?? factory.number.int({ max: 65, min: 18 }),
                        name: kwargs?.name ?? factory.person.firstName(),
                    };
                });

                const result = factory.build({ age: 30, name: 'Alice' });
                expect(receivedKwargs).toEqual({ age: 30, name: 'Alice' });
                expect(result.name).toBe('Alice');
                expect(result.age).toBe(30);
            });

            it('receives empty object kwargs when no overrides are provided', () => {
                let receivedKwargs: Partial<TestObject> | undefined;
                const factory = new Factory<TestObject>((factory, _iteration, kwargs) => {
                    receivedKwargs = kwargs;
                    return {
                        age: factory.number.int({ max: 65, min: 18 }),
                        name: factory.person.firstName(),
                    };
                });

                factory.build();
                expect(receivedKwargs).toEqual({});
            });

            it('can use kwargs to conditionally generate properties', () => {
                const factory = new Factory<TestObject>((factory, _iteration, kwargs) => {
                    return {
                        age: kwargs?.age ?? factory.number.int({ max: 65, min: 0 }),
                        name: 'Default Name',
                    };
                });

                const withOverrides = factory.build({ name: 'Bob' });
                expect(withOverrides.name).toBe('Bob');
                expect(withOverrides.age).toBeTypeOf('number');

                const withoutOverrides = factory.build();
                expect(withoutOverrides.name).toBe('Default Name');
                expect(withoutOverrides.age).toBeTypeOf('number');
            });

            it('handles partial kwargs correctly', () => {
                const factory = new Factory<TestObject>((factory, _iteration, kwargs) => {
                    return {
                        age: kwargs?.age ?? 25,
                        name: kwargs?.name ?? factory.person.firstName(),
                    };
                });

                const partialOverride = factory.build({ name: 'Charlie' });
                expect(partialOverride.name).toBe('Charlie');
                expect(partialOverride.age).toBe(25);
            });

            it('preserves kwargs structure in batch operations', () => {
                const receivedKwargs: (Partial<TestObject> | undefined)[] = [];
                const factory = new Factory<TestObject>((_factory, iteration, kwargs) => {
                    receivedKwargs.push(kwargs);
                    return {
                        age: kwargs?.age ?? 20 + iteration,
                        name: kwargs?.name ?? `Name-${iteration}`,
                    };
                });

                const overrides = [{ name: 'First' }, { age: 40, name: 'Second' }, { age: 50 }];

                const results = factory.batch(3, overrides);
                expect(receivedKwargs).toEqual([{ name: 'First' }, { age: 40, name: 'Second' }, { age: 50 }]);
                expect(results[0].name).toBe('First');
                expect(results[1].name).toBe('Second');
                expect(results[1].age).toBe(40);
                expect(results[2].age).toBe(50);
            });

            it('handles null values in kwargs', () => {
                interface NullableTestObject {
                    name: string;
                    value: null | number;
                }

                const factory = new Factory<NullableTestObject>((factory, _iteration, kwargs) => {
                    return {
                        name: kwargs?.name ?? factory.person.firstName(),
                        value: kwargs?.value === undefined ? factory.number.int() : kwargs.value,
                    };
                });

                const result = factory.build({ value: null });
                expect(result.value).toBeNull();
                expect(result.name).toBeTypeOf('string');
            });

            it('can use kwargs to modify generation logic', () => {
                interface ConditionalObject {
                    features?: string[];
                    name: string;
                    type: 'advanced' | 'basic';
                }

                const factory = new Factory<ConditionalObject>((factory, _iteration, kwargs) => {
                    const type = kwargs?.type ?? 'basic';
                    return {
                        features: type === 'advanced' ? ['feature1', 'feature2'] : undefined,
                        name: kwargs?.name ?? factory.person.firstName(),
                        type,
                    };
                });

                const basic = factory.build({ type: 'basic' });
                expect(basic.type).toBe('basic');
                expect(basic.features).toBeUndefined();

                const advanced = factory.build({ type: 'advanced' });
                expect(advanced.type).toBe('advanced');
                expect(advanced.features).toEqual(['feature1', 'feature2']);
            });
        });

        describe('asynchronous factory functions', () => {
            it('receives kwargs parameter in async factory functions', async () => {
                let receivedKwargs: Partial<TestObject> | undefined;
                const factory = new Factory<TestObject>(async (factory, _iteration, kwargs) => {
                    receivedKwargs = kwargs;
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    return {
                        age: kwargs?.age ?? factory.number.int({ max: 65, min: 18 }),
                        name: kwargs?.name ?? factory.person.firstName(),
                    };
                });

                const result = await factory.buildAsync({
                    age: 35,
                    name: 'AsyncAlice',
                });
                expect(receivedKwargs).toEqual({ age: 35, name: 'AsyncAlice' });
                expect(result.name).toBe('AsyncAlice');
                expect(result.age).toBe(35);
            });

            it('handles async operations with kwargs', async () => {
                const factory = new Factory<TestObject>(async (factory, _iteration, kwargs) => {
                    const name = kwargs?.name ?? factory.person.firstName();
                    const processedName = await Promise.resolve(name.toUpperCase());
                    return {
                        age: kwargs?.age ?? factory.number.int({ max: 65, min: 18 }),
                        name: processedName,
                    };
                });

                const result = await factory.buildAsync({ name: 'bob' });
                // The framework merges the result with kwargs, so the original kwargs value takes precedence
                expect(result.name).toBe('bob');
            });

            it('works with async batch operations', async () => {
                const receivedKwargs: (Partial<TestObject> | undefined)[] = [];
                const factory = new Factory<TestObject>(async (_factory, iteration, kwargs) => {
                    receivedKwargs.push(kwargs);
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    return {
                        age: kwargs?.age ?? 30 + iteration,
                        name: kwargs?.name ?? `AsyncName-${iteration}`,
                    };
                });

                const overrides = [{ name: 'AsyncFirst' }, { age: 45 }];

                const results = await factory.batchAsync(2, overrides);
                expect(receivedKwargs).toEqual([{ name: 'AsyncFirst' }, { age: 45 }]);
                expect(results[0].name).toBe('AsyncFirst');
                expect(results[1].age).toBe(45);
            });
        });

        describe('factory functions without kwargs parameter', () => {
            it('works with factory functions that ignore kwargs parameter', () => {
                const factory = new Factory<TestObject>((_factory, iteration) => {
                    return {
                        age: 25,
                        name: `Generated-${iteration}`,
                    };
                });

                const result = factory.build({
                    age: 99,
                    name: 'ShouldBeIgnored',
                });
                // Even though the factory function ignores kwargs, the framework still merges the overrides
                expect(result.name).toBe('ShouldBeIgnored');
                expect(result.age).toBe(99);
            });

            it('works with destructured parameters omitting kwargs', () => {
                const factory = new Factory<TestObject>(({ number, person }, iteration) => {
                    return {
                        age: number.int({ max: 65, min: 18 }),
                        name: `${person.firstName()}-${iteration}`,
                    };
                });

                const result = factory.build({ name: 'Override' });
                // Even though the factory function doesn't use kwargs, the framework still merges the overrides
                expect(result.name).toBe('Override');
                expect(result.age).toBeTypeOf('number');
            });
        });

        describe('kwargs with hooks', () => {
            it('kwargs are processed before beforeBuild hooks', () => {
                const callOrder: string[] = [];
                const factory = new Factory<TestObject>((factory, _iteration, kwargs) => {
                    callOrder.push(`factory-kwargs:${kwargs?.name ?? 'none'}`);
                    return {
                        age: kwargs?.age ?? 25,
                        name: kwargs?.name ?? factory.person.firstName(),
                    };
                }).beforeBuild((params) => {
                    callOrder.push(`beforeBuild:${params.name ?? 'none'}`);
                    return params;
                });

                factory.build({ name: 'TestName' });
                expect(callOrder).toEqual(['beforeBuild:TestName', 'factory-kwargs:TestName']);
            });

            it('kwargs work with afterBuild hooks', () => {
                const factory = new Factory<TestObject>((factory, _iteration, kwargs) => {
                    return {
                        age: kwargs?.age ?? 25,
                        name: kwargs?.name ?? factory.person.firstName(),
                    };
                }).afterBuild((obj) => {
                    return { ...obj, name: obj.name.toUpperCase() };
                });

                const result = factory.build({ name: 'lowercase' });
                expect(result.name).toBe('LOWERCASE');
            });
        });

        describe('kwargs with extend and compose', () => {
            it('kwargs work with extended factories', () => {
                interface BaseUser {
                    id: string;
                    name: string;
                }

                interface ExtendedUser extends BaseUser {
                    email: string;
                    role: string;
                }

                const baseFactory = new Factory<BaseUser>((factory, _iteration, kwargs) => ({
                    id: kwargs?.id ?? factory.string.uuid(),
                    name: kwargs?.name ?? factory.person.firstName(),
                }));

                const extendedFactory = baseFactory.extend<ExtendedUser>((factory, _iteration, kwargs) => ({
                    email: kwargs?.email ?? factory.internet.email(),
                    id: kwargs?.id ?? factory.string.uuid(),
                    name: kwargs?.name ?? factory.person.firstName(),
                    role: kwargs?.role ?? 'user',
                }));

                const result = extendedFactory.build({
                    name: 'Alice',
                    role: 'admin',
                });

                expect(result.name).toBe('Alice');
                expect(result.role).toBe('admin');
                expect(result.email).toBeTypeOf('string');
                expect(result.id).toBeTypeOf('string');
            });

            it('kwargs work with composed factories', () => {
                interface User {
                    id: string;
                    name: string;
                }

                interface UserWithStatus extends User {
                    status: string;
                }

                const userFactory = new Factory<User>((factory, _iteration, kwargs) => ({
                    id: kwargs?.id ?? factory.string.uuid(),
                    name: kwargs?.name ?? factory.person.firstName(),
                }));

                const userWithStatusFactory = userFactory.compose<UserWithStatus>({
                    status: 'active',
                });

                const result = userWithStatusFactory.build({ name: 'Bob' });
                expect(result.name).toBe('Bob');
                expect(result.status).toBe('active');
                expect(result.id).toBeTypeOf('string');
            });
        });
    });

    describe('edge cases and stress tests', () => {
        it('should handle very large batch sizes efficiently', () => {
            const factory = new Factory<{ id: number }>((_, i) => ({
                id: i,
            }));
            const startTime = Date.now();
            const results = factory.batch(10_000);
            const duration = Date.now() - startTime;

            expect(results).toHaveLength(10_000);
            expect(results[0].id).toBe(0);
            expect(results[9999].id).toBe(9999);
            expect(duration).toBeLessThan(1000);
        });

        it('should handle deep nesting with maxDepth', () => {
            interface DeepNested {
                child?: DeepNested;
                level: number;
            }

            const factory = new Factory<DeepNested>(
                (f, _) => {
                    const depth = f.options?.maxDepth ?? 5;
                    const createNested = (level: number): DeepNested => ({
                        child: level < depth ? createNested(level + 1) : undefined,
                        level,
                    });
                    return createNested(1);
                },
                { maxDepth: 3 },
            );

            const result = factory.build();
            let depth = 0;
            let current: DeepNested | undefined = result;
            while (current) {
                depth++;
                current = current.child;
            }
            expect(depth).toBe(3);
        });

        it('should handle factories with circular references using Ref', () => {
            interface Node {
                children: Node[];
                id: string;
                parent?: Node;
            }

            const factory = new Factory<Node>((f) => {
                const node: Node = {
                    children: [],
                    id: f.string.uuid(),
                };

                if (f.datatype.boolean({ probability: 0.5 })) {
                    const child = f.build({ parent: node });
                    node.children.push(child);
                }

                return node;
            });

            const result = factory.build();
            expect(result.id).toBeDefined();
            if (result.children.length > 0) {
                expect(result.children[0].parent).toStrictEqual(result);
            }
        });

        it('should handle empty factory functions gracefully', () => {
            const factory = new Factory<Record<string, never>>(() => ({}));
            const result = factory.build();
            expect(result).toEqual({});
        });

        it('should handle null and undefined in overrides', () => {
            interface Data {
                optional?: string;
                value: null | string;
            }

            const factory = new Factory<Data>((f) => ({
                optional: f.lorem.word(),
                value: f.lorem.word(),
            }));

            const withNull = factory.build({ value: null });
            expect(withNull.value).toBeNull();

            const withUndefined = factory.build({
                optional: undefined,
            });
            expect(withUndefined.optional).toBeUndefined();
        });

        it('should handle factories that throw errors', () => {
            const factory = new Factory<{ value: string }>(() => {
                throw new Error('Factory error');
            });

            expect(() => factory.build()).toThrow('Factory error');
        });

        it('should handle async buildAsync with errors', async () => {
            const factory = new Factory<{ value: string }>(() => {
                throw new Error('Async factory error');
            });

            await expect(factory.buildAsync()).rejects.toThrow('Async factory error');
        });

        it('should throw error when calling build() with async factory', () => {
            const factory = new Factory<{ value: string }>(async () => {
                return { value: 'async result' };
            });

            expect(() => factory.build()).toThrow('Async factory function detected');
        });

        it('should handle async factory with buildAsync()', async () => {
            const factory = new Factory<{ data: string }>(async (f) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return { data: f.lorem.word() };
            });

            const result = await factory.buildAsync();
            expect(result.data).toBeDefined();
            expect(typeof result.data).toBe('string');
        });

        it('should maintain iteration count across multiple calls', () => {
            const capturedIterations: number[] = [];
            let iteration = 0;
            const factory = new Factory<{ iteration: number }>(() => {
                capturedIterations.push(iteration);
                return { iteration: iteration++ };
            });

            factory.build();
            factory.build();
            factory.batch(3);
            factory.build();

            expect(capturedIterations).toEqual([0, 1, 2, 3, 4, 5]);
        });

        it('should handle sample with empty array', () => {
            const factory = new Factory<{ value: any }>((f) => ({
                value: f.helpers.arrayElement([]),
            }));

            expect(() => factory.build()).toThrow();
        });

        it('should handle very long strings in overrides', () => {
            const longString = 'a'.repeat(10_000);
            const factory = new Factory<{ text: string }>((f) => ({
                text: f.lorem.word(),
            }));

            const result = factory.build({ text: longString });
            expect(result.text).toBe(longString);
            expect(result.text.length).toBe(10_000);
        });

        it('should handle special number values', () => {
            const factory = new Factory<{ num: number }>((f) => ({
                num: f.number.float(),
            }));

            const withInfinity = factory.build({ num: Infinity });
            expect(withInfinity.num).toBe(Infinity);

            const withNegInfinity = factory.build({ num: -Infinity });
            expect(withNegInfinity.num).toBe(-Infinity);

            const withNaN = factory.build({ num: Number.NaN });
            expect(Number.isNaN(withNaN.num)).toBe(true);
        });

        it('should handle composition with recursive depth limits', () => {
            interface Comment {
                id: string;
                replies: Comment[];
                text: string;
            }

            const CommentFactory = new Factory<Comment>((f) => ({
                id: f.string.uuid(),
                replies: [],
                text: f.lorem.sentence(),
            }));

            const ThreadFactory = CommentFactory.extend<Comment>((f) => ({
                id: f.string.uuid(),
                replies: f.datatype.boolean({ probability: 0.7 })
                    ? CommentFactory.batch(f.number.int({ max: 3, min: 1 }))
                    : [],
                text: f.lorem.sentence(),
            }));

            const result = ThreadFactory.build();
            expect(result.id).toBeDefined();
            expect(result.text).toBeDefined();
            expect(Array.isArray(result.replies)).toBe(true);
        });

        it('should handle symbol keys in objects', () => {
            const sym = Symbol('test');
            const factory = new Factory<Record<symbol, string>>((f) => {
                return {
                    [sym]: f.lorem.word(),
                };
            });

            const result = factory.build();
            expect(result[sym]).toBeDefined();
            expect(typeof result[sym]).toBe('string');
        });

        it('should handle Date objects in overrides', () => {
            const factory = new Factory<{ date: Date }>((f) => ({
                date: f.date.recent(),
            }));

            const customDate = new Date('2024-01-01');
            const result = factory.build({ date: customDate });
            expect(result.date).toBe(customDate);
            expect(result.date.getTime()).toBe(customDate.getTime());
        });

        it('should handle factories with empty object return', () => {
            const factory = new Factory<Record<string, any>>(() => {
                return {};
            });

            const result = factory.build();
            expect(result).toEqual({});
        });

        it('should handle batch with override object', () => {
            const factory = new Factory<{
                index: number;
                value: string;
            }>((f, i) => ({
                index: i,
                value: f.lorem.word(),
            }));

            const results = factory.batch(5, { value: 'overridden' });

            results.forEach((result, i) => {
                expect(result.index).toBe(i);
                expect(result.value).toBe('overridden');
            });
        });

        it('should generate different values across instances', () => {
            const factory = new Factory<{ value: number }>((f) => ({
                value: f.number.int({ max: 1000, min: 0 }),
            }));

            const values = new Set<number>();
            // Generate multiple values and expect some variance
            for (let i = 0; i < 10; i++) {
                values.add(factory.build().value);
            }

            // With a range of 1000, we should see more than 1 unique value in 10 tries
            expect(values.size).toBeGreaterThan(1);
        });
    });
});
