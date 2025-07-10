import { Factory, PersistenceAdapter } from './index.js';
import { MongooseAdapter } from '../examples/adapters/mongoose-adapter.js';
import { PrismaAdapter } from '../examples/adapters/prisma-adapter.js';
import { TypeORMAdapter } from '../examples/adapters/typeorm-adapter.js';
import { describe, expect, it, vi } from 'vitest';

interface TestObject {
    age?: number;
    name: string;
}

interface User {
    email: string;
    firstName: string;
    lastName: string;
}

const defaultObject: TestObject = { age: 30, name: 'Default Name' };

export interface ComplexObject extends Record<string, any> {
    name: string;
    options?: Options;
    value: null | number;
}

export interface Options extends Record<string, any> {
    children?: ComplexObject[];
    type: '1' | '2' | '3' | 'all' | 'none';
}

const typeOptions = ['1', '2', '3', 'all', 'none'] as const;

const defaults: ComplexObject = {
    name: 'testObject',
    value: null,
};

async function validateUser(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!user.firstName || !user.lastName || !user.email) {
                reject(new Error('Validation failed: Missing required fields'));
            } else {
                resolve();
            }
        }, 100);
    });
}

describe('Factory class functionality', () => {
    describe('build method', () => {
        it('creates an object with default properties', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const result = factory.build();
            expect(result).toEqual(defaultObject);
        });

        it('overrides default properties with kwargs', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const overrides = { name: 'Overridden Name' };
            const result = factory.build(overrides);
            expect(result.name).toBe(overrides.name);
            expect(result.age).toBe(defaultObject.age);
        });

        it('handles undefined kwargs gracefully', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const result = factory.build(undefined);
            expect(result).toEqual(defaultObject);
        });

        it('builds correctly with factory returning faker defaults object', () => {
            const factory = new Factory<ComplexObject>((factory) => ({
                name: factory.person.firstName(),
                value: factory.iterate([1, 2, 3]),
            }));
            const result = factory.build();

            expect(result.name).toBeTruthy();
            expect(result.value).toBeTruthy();
            expect(typeof result.name).toBe('string');
            expect(typeof result.value).toBe('number');
            expect([1, 2, 3].includes(result.value!)).toBeTruthy();
        });

        it('builds correctly with defaults function', () => {
            const factory = new Factory<ComplexObject>(() => ({
                ...defaults,
                value: 99,
            }));
            expect(factory.build()).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 99,
            });
        });

        it('merges options correctly when passed object literal', () => {
            const factory = new Factory<ComplexObject>(() => ({ ...defaults }));
            expect(
                factory.build({ name: 'newObject' }),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                name: 'newObject',
            });
        });

        it('handles generator iteration correctly', () => {
            const factory = new Factory<ComplexObject>((factory) => ({
                ...defaults,
                type: factory.sample(typeOptions),
            }));

            const result = factory.build();
            expect(result.type).toBeTruthy();
        });
    });

    describe('batch method', () => {
        it('creates a batch of objects with default properties', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const size = 5;
            const results = factory.batch(size);
            expect(results).toHaveLength(size);
            results.forEach((result) => {
                expect(result).toEqual(defaultObject);
            });
        });

        it('applies the same overrides to all objects in a batch', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const overrides = { age: 45 };
            const size = 3;
            const results = factory.batch(size, overrides);
            results.forEach((result) => {
                expect(result.age).toBe(overrides.age);
            });
        });

        it('applies unique overrides to each object in a batch when provided an array', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const overrides = [
                { name: 'Unique Name 1' },
                { name: 'Unique Name 2' },
            ];
            const results = factory.batch(overrides.length, overrides);
            results.forEach((result, index) => {
                expect(result.name).toBe(overrides[index].name);
            });
        });

        it('returns an empty array when size is 0', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const results = factory.batch(0);
            expect(results).toEqual([]);
        });

        it('handles batch generation with complex overrides', () => {
            const factory = new Factory<ComplexObject>(() => ({
                ...defaults,
                value: 99,
            }));
            const overrides = [{ name: 'Object 1' }, { name: 'Object 2' }];
            const results = factory.batch(2, overrides);
            expect(results[0].name).toBe('Object 1');
            expect(results[1].name).toBe('Object 2');
        });

        it('throws error for negative batch size', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            expect(() => factory.batch(-1)).toThrow(
                'Batch size must be a non-negative integer',
            );
        });

        it('throws error for non-integer batch size', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            expect(() => factory.batch(3.14)).toThrow(
                'Batch size must be a non-negative integer',
            );
        });
    });

    describe('batchAsync method', () => {
        it('creates a batch of objects with async factory', async () => {
            const factory = new Factory<TestObject>(async (faker) => ({
                age: await Promise.resolve(
                    faker.number.int({ max: 65, min: 18 }),
                ),
                name: faker.person.firstName(),
            }));

            const results = await factory.batchAsync(3);
            expect(results).toHaveLength(3);
            results.forEach((result) => {
                expect(result).toEqual(
                    expect.objectContaining({
                        age: expect.any(Number),
                        name: expect.any(String),
                    }),
                );
            });
        });

        it('applies overrides to async batch', async () => {
            const factory = new Factory<TestObject>(async (faker) => ({
                age: await Promise.resolve(25),
                name: faker.person.firstName(),
            }));

            const results = await factory.batchAsync(2, { name: 'Override' });
            expect(results).toHaveLength(2);
            results.forEach((result) => {
                expect(result.name).toBe('Override');
                expect(result.age).toBe(25);
            });
        });

        it('applies individual overrides to async batch', async () => {
            const factory = new Factory<TestObject>(async (faker) => ({
                age: await Promise.resolve(25),
                name: faker.person.firstName(),
            }));

            const overrides = [{ name: 'First' }, { name: 'Second' }];
            const results = await factory.batchAsync(2, overrides);
            expect(results[0].name).toBe('First');
            expect(results[1].name).toBe('Second');
        });

        it('throws error for invalid batch size in async', async () => {
            const factory = new Factory<TestObject>(async () => defaultObject);
            await expect(factory.batchAsync(-1)).rejects.toThrow(
                'Batch size must be a non-negative integer',
            );
            await expect(factory.batchAsync(1.5)).rejects.toThrow(
                'Batch size must be a non-negative integer',
            );
        });

        it('returns empty array when size is 0 in async', async () => {
            const factory = new Factory<TestObject>(async () => defaultObject);
            const results = await factory.batchAsync(0);
            expect(results).toEqual([]);
        });
    });

    describe('iterate method', () => {
        it('cycles through provided values indefinitely', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const values = ['Value 1', 'Value 2', 'Value 3'];
            const generator = factory.iterate(values);
            const cycleLength = values.length * 2;
            const results = Array.from(
                { length: cycleLength },
                () => generator.next().value,
            );
            const expectedResults = [...values, ...values];
            expect(results).toEqual(expectedResults);
        });

        it('throws error when given empty iterable', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            expect(() => factory.iterate([])).toThrow(
                'Cannot create generator from empty iterable',
            );
        });

        it('cycles through values of an iterable', () => {
            const factory = new Factory<ComplexObject>((factory, i) => ({
                name: factory.person.firstName(),
                value: i + 1,
            }));
            const generator = factory.iterate([1, 2, 3]);
            expect(generator.next().value).toBe(1);
            expect(generator.next().value).toBe(2);
            expect(generator.next().value).toBe(3);
            expect(generator.next().value).toBe(1);
        });
    });

    describe('sample method', () => {
        it('randomly samples values without immediate repetition', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const values = [1, 2, 3];
            const generator = factory.sample(values);
            let lastValue = generator.next().value;
            let newValue;
            for (let i = 0; i < 100; i++) {
                newValue = generator.next().value;
                expect(newValue).not.toBe(lastValue);
                lastValue = newValue;
            }
        });

        it('throws error when given empty iterable', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            expect(() => factory.sample([])).toThrow(
                'Cannot create generator from empty iterable',
            );
        });

        it('samples values from the iterable', () => {
            const factory = new Factory<ComplexObject>((factory, i) => ({
                name: factory.person.firstName(),
                value: i + 1,
            }));
            const generator = factory.sample([1, 2, 3]);
            const samples = new Set<number>();
            for (let i = 0; i < 100; i++) {
                samples.add(generator.next().value);
            }
            expect(samples.size).toBe(3);
        });
    });

    describe('use method', () => {
        it('uses the specified faker instance', () => {
            const complexFactory = new Factory<ComplexObject>((factory) => ({
                name: factory.person.firstName(),
                options: {
                    type: '1',
                },
                value: factory.number.int({ max: 3, min: 1 }),
            }));
            const factoryWithOptions = new Factory<ComplexObject>(
                (factory) => ({
                    ...defaults,
                    options: {
                        children: factory.use(
                            complexFactory.batch.bind(complexFactory),
                            2,
                        ),
                        type: '1' as const,
                    },
                }),
            );

            expect(factoryWithOptions.build().options).toBeTruthy();
            expect(factoryWithOptions.build().options!.children).toHaveLength(
                2,
            );
        });
    });

    describe('extend method', () => {
        interface BaseUser {
            createdAt: Date;
            id: string;
        }

        interface AdminUser extends BaseUser {
            permissions: string[];
            role: string;
        }

        it('extends a base factory with additional properties', () => {
            const BaseUserFactory = new Factory<BaseUser>((factory) => ({
                createdAt: factory.date.recent(),
                id: factory.string.uuid(),
            }));

            const AdminUserFactory = BaseUserFactory.extend<AdminUser>(
                (factory) => ({
                    createdAt: factory.date.recent(),
                    id: factory.string.uuid(),
                    permissions: ['read', 'write', 'delete'],
                    role: 'admin',
                }),
            );

            const admin = AdminUserFactory.build();
            expect(admin.id).toBeDefined();
            expect(admin.createdAt).toBeInstanceOf(Date);
            expect(admin.role).toBe('admin');
            expect(admin.permissions).toEqual(['read', 'write', 'delete']);
        });

        it('allows overriding base factory properties', () => {
            const BaseUserFactory = new Factory<BaseUser>((factory) => ({
                createdAt: factory.date.recent(),
                id: factory.string.uuid(),
            }));

            const CustomUserFactory = BaseUserFactory.extend<BaseUser>(
                (factory) => ({
                    createdAt: factory.date.recent(),
                    id: 'custom-id',
                }),
            );

            const user = CustomUserFactory.build();
            expect(user.id).toBe('custom-id');
            expect(user.createdAt).toBeInstanceOf(Date);
        });
    });

    describe('partial method', () => {
        interface User {
            age: number;
            createdAt: Date;
            email: string;
            id: string;
            isActive: boolean;
            name: string;
        }

        interface ComplexUser {
            contacts: {
                email: string;
                phone: string;
            };
            id: string;
            profile: {
                bio: string;
                name: string;
            };
            settings: {
                notifications: boolean;
                theme: string;
            };
            tags: string[];
        }

        it('creates a factory that returns Partial<T>', () => {
            const UserFactory = new Factory<User>((factory) => ({
                age: factory.number.int({ max: 80, min: 18 }),
                createdAt: factory.date.past(),
                email: factory.internet.email(),
                id: factory.string.uuid(),
                isActive: factory.datatype.boolean(),
                name: factory.person.fullName(),
            }));

            const partialUserFactory = UserFactory.partial();
            const partialUser = partialUserFactory.build();

            // All properties should be present but values can be undefined
            expect(partialUser).toBeDefined();
            expect(typeof partialUser).toBe('object');

            // The generated object should have all properties from the original factory
            expect('id' in partialUser).toBe(true);
            expect('name' in partialUser).toBe(true);
            expect('email' in partialUser).toBe(true);
            expect('age' in partialUser).toBe(true);
            expect('isActive' in partialUser).toBe(true);
            expect('createdAt' in partialUser).toBe(true);
        });

        it('allows overriding specific properties', () => {
            const UserFactory = new Factory<User>((factory) => ({
                age: factory.number.int({ max: 80, min: 18 }),
                createdAt: factory.date.past(),
                email: factory.internet.email(),
                id: factory.string.uuid(),
                isActive: factory.datatype.boolean(),
                name: factory.person.fullName(),
            }));

            const partialUserFactory = UserFactory.partial();
            const customPartialUser = partialUserFactory.build({
                age: 30,
                email: 'john@example.com',
                name: 'John Doe',
            });

            expect(customPartialUser.name).toBe('John Doe');
            expect(customPartialUser.email).toBe('john@example.com');
            expect(customPartialUser.age).toBe(30);
            // Other properties should still be generated
            expect(customPartialUser.id).toBeDefined();
            expect(typeof customPartialUser.isActive).toBe('boolean');
            expect(customPartialUser.createdAt).toBeInstanceOf(Date);
        });

        it('works with complex nested objects', () => {
            const ComplexUserFactory = new Factory<ComplexUser>((factory) => ({
                contacts: {
                    email: factory.internet.email(),
                    phone: factory.phone.number(),
                },
                id: factory.string.uuid(),
                profile: {
                    bio: factory.lorem.paragraph(),
                    name: factory.person.fullName(),
                },
                settings: {
                    notifications: factory.datatype.boolean(),
                    theme: factory.helpers.arrayElement(['light', 'dark']),
                },
                tags: factory.helpers.multiple(() => factory.lorem.word(), {
                    count: 3,
                }),
            }));

            const partialComplexFactory = ComplexUserFactory.partial();
            const partialComplex = partialComplexFactory.build();

            // Nested objects should still be fully generated
            expect(partialComplex.profile).toBeDefined();
            if (partialComplex.profile) {
                expect(partialComplex.profile.name).toBeDefined();
                expect(partialComplex.profile.bio).toBeDefined();
            }

            expect(partialComplex.contacts).toBeDefined();
            if (partialComplex.contacts) {
                expect(partialComplex.contacts.email).toBeDefined();
                expect(partialComplex.contacts.phone).toBeDefined();
            }

            expect(partialComplex.tags).toBeDefined();
            expect(Array.isArray(partialComplex.tags)).toBe(true);
        });

        it('can be chained with other methods', () => {
            const UserFactory = new Factory<User>((factory) => ({
                age: factory.number.int({ max: 80, min: 18 }),
                createdAt: factory.date.past(),
                email: factory.internet.email(),
                id: factory.string.uuid(),
                isActive: factory.datatype.boolean(),
                name: factory.person.fullName(),
            }));

            let hookCalled = false;
            const partialWithHook = UserFactory.partial().afterBuild((user) => {
                hookCalled = true;
                return user;
            });

            const user = partialWithHook.build();
            expect(hookCalled).toBe(true);
            expect(user).toBeDefined();
        });

        it('works with batch operations', () => {
            const UserFactory = new Factory<User>((factory) => ({
                age: factory.number.int({ max: 80, min: 18 }),
                createdAt: factory.date.past(),
                email: factory.internet.email(),
                id: factory.string.uuid(),
                isActive: factory.datatype.boolean(),
                name: factory.person.fullName(),
            }));

            const partialUserFactory = UserFactory.partial();
            const users = partialUserFactory.batch(5);

            expect(users).toHaveLength(5);
            users.forEach((user) => {
                expect(user).toBeDefined();
                expect(typeof user).toBe('object');
            });

            // Test batch with overrides
            const customUsers = partialUserFactory.batch(3, { isActive: true });
            expect(customUsers).toHaveLength(3);
            customUsers.forEach((user) => {
                expect(user.isActive).toBe(true);
            });
        });

        it('preserves factory options', () => {
            const UserFactory = new Factory<User>(
                (factory) => ({
                    age: factory.number.int({ max: 80, min: 18 }),
                    createdAt: factory.date.past(),
                    email: factory.internet.email(),
                    id: factory.string.uuid(),
                    isActive: factory.datatype.boolean(),
                    name: factory.person.fullName(),
                }),
                { maxDepth: 3 },
            );

            const partialFactory = UserFactory.partial();

            // Test that options are preserved by checking internal state
            expect(partialFactory.options?.maxDepth).toBe(3);
        });
    });

    describe('compose method', () => {
        interface User {
            email: string;
            name: string;
        }

        interface Post {
            content: string;
            title: string;
        }

        interface UserWithPosts extends User {
            posts: Post[];
        }

        interface UserWithStatus extends User {
            status: string;
        }

        interface TreeNode {
            children?: TreeNode[];
            value: string;
        }

        it('composes a factory with other factories', () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: factory.internet.email(),
                name: factory.person.fullName(),
            }));

            const PostFactory = new Factory<Post>((factory) => ({
                content: factory.lorem.paragraph(),
                title: factory.lorem.sentence(),
            }));

            const UserWithPostsFactory = UserFactory.compose<UserWithPosts>({
                posts: PostFactory.batch(3),
            });

            const userWithPosts = UserWithPostsFactory.build();
            expect(userWithPosts.email).toBeDefined();
            expect(userWithPosts.name).toBeDefined();
            expect(userWithPosts.posts).toHaveLength(3);
            expect(userWithPosts.posts[0].title).toBeDefined();
            expect(userWithPosts.posts[0].content).toBeDefined();
        });

        it('allows mixing factories with static values', () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: factory.internet.email(),
                name: factory.person.fullName(),
            }));

            const UserWithStatusFactory = UserFactory.compose<UserWithStatus>({
                status: 'active',
            });

            const user = UserWithStatusFactory.build();
            expect(user.email).toBeDefined();
            expect(user.name).toBeDefined();
            expect(user.status).toBe('active');
        });

        it('handles circular references with depth control', () => {
            const TreeNodeFactory = new Factory<TreeNode>(
                (factory) => ({
                    children: factory.batch(2),
                    value: factory.string.alphanumeric(5),
                }),
                { maxDepth: 3 },
            );

            const tree = TreeNodeFactory.build();
            expect(tree.value).toBeDefined();
            expect(tree.children).toHaveLength(2);
            expect(tree.children![0].children).toHaveLength(2);
            expect(tree.children![0].children![0].children).toBeNull();
        });

        it('allows customizing max depth', () => {
            const TreeNodeFactory = new Factory<TreeNode>(
                (factory) => ({
                    children: factory.batch(1),
                    value: factory.string.alphanumeric(5),
                }),
                { maxDepth: 2 },
            );

            const tree = TreeNodeFactory.build();
            expect(tree.value).toBeDefined();
            expect(tree.children).toHaveLength(1);
            expect(tree.children![0].children).toBeNull();
        });

        it('handles depth limit correctly with build overrides', () => {
            const TreeNodeFactory = new Factory<TreeNode>(
                (factory) => ({
                    children: [factory.build({ value: 'child' })],
                    value: factory.string.alphanumeric(5),
                }),
                { maxDepth: 2 },
            );

            const tree = TreeNodeFactory.build();
            expect(tree.value).toBeDefined();
            expect(tree.children).toHaveLength(1);
            expect(tree.children![0].value).toBe('child');
        });

        it('returns null for batch when max depth exceeded', () => {
            const TreeNodeFactory = new Factory<TreeNode>(
                (factory) => ({
                    children: factory.batch(2),
                    value: 'node',
                }),
                { maxDepth: 1 },
            );

            const tree = TreeNodeFactory.build();
            expect(tree.value).toBe('node');
            expect(tree.children).toBeNull();
        });

        it('handles other factory methods through proxy', () => {
            interface TestNode {
                children?: TestNode[];
                type: string;
                value: string;
            }

            const TestNodeFactory = new Factory<TestNode>(
                (factory) => ({
                    children: factory.batch(1),
                    type: factory.sample(['A', 'B', 'C']).next().value,
                    value: factory.string.uuid(),
                }),
                { maxDepth: 2 },
            );

            const node = TestNodeFactory.build();
            expect(node.value).toBeDefined();
            expect(['A', 'B', 'C']).toContain(node.type);
            expect(node.children).toHaveLength(1);
        });
    });

    describe('Factory Hooks', () => {
        it('applies synchronous beforeBuild hook in build()', () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: '',
                firstName: factory.person.firstName(),
                lastName: factory.person.lastName(),
            })).beforeBuild((params) => {
                return { ...params, firstName: 'alice' };
            });

            const user = UserFactory.build();
            expect(user.firstName).toBe('alice');
        });

        it('applies synchronous afterBuild hook in build()', () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: '',
                firstName: factory.person.firstName(),
                lastName: factory.person.lastName(),
            })).afterBuild((user) => {
                user.email = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`;
                return user;
            });

            const user = UserFactory.build();
            expect(user.email).toBe(
                `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`,
            );
        });

        it('throws ConfigurationError when async hook is used with build()', () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: '',
                firstName: factory.person.firstName(),
                lastName: factory.person.lastName(),
            })).afterBuild(async (user) => {
                await new Promise((resolve) => setTimeout(resolve, 1));
                return user;
            });

            expect(() => UserFactory.build()).toThrow(
                'Async hooks detected. Use buildAsync() method to build instances with async hooks.',
            );
        });

        it('applies beforeBuild correctly with buildAsync()', async () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: '',
                firstName: factory.person.firstName(),
                lastName: factory.person.lastName(),
            })).beforeBuild((params) => {
                return { ...params, firstName: 'alice' };
            });

            const user = await UserFactory.buildAsync();
            expect(user.firstName).toBe('alice');
        });

        it('applies afterBuild correctly with buildAsync()', async () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: '',
                firstName: factory.person.firstName(),
                lastName: factory.person.lastName(),
            })).afterBuild((user) => {
                user.email = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`;
                return user;
            });

            const user = await UserFactory.buildAsync();
            expect(user.email).toBe(
                `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`,
            );
        });

        it('runs multiple synchronous hooks in the correct order', () => {
            const logs: string[] = [];
            const UserFactory = new Factory<User>(() => ({
                email: '',
                firstName: 'john',
                lastName: 'Doe',
            }))
                .beforeBuild((b) => {
                    logs.push('before1');
                    return b;
                })
                .beforeBuild((b) => {
                    logs.push('before2');
                    return b;
                })
                .afterBuild((a) => {
                    logs.push('after1');
                    return a;
                })
                .afterBuild((a) => {
                    logs.push('after2');
                    return a;
                });

            UserFactory.build();
            expect(logs).toEqual(['before1', 'before2', 'after1', 'after2']);
        });

        it('runs multiple hooks in the correct order with buildAsync', async () => {
            const logs: string[] = [];
            const UserFactory = new Factory<User>(() => ({
                email: '',
                firstName: 'john',
                lastName: 'Doe',
            }))
                .beforeBuild((b) => {
                    logs.push('before1');
                    return b;
                })
                .beforeBuild(async (b) => {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    logs.push('before2');
                    return b;
                })
                .afterBuild((a) => {
                    logs.push('after1');
                    return a;
                })
                .afterBuild(async (a) => {
                    await new Promise((resolve) => setTimeout(resolve, 1));
                    logs.push('after2');
                    return a;
                });

            await UserFactory.buildAsync();
            expect(logs).toEqual(['before1', 'before2', 'after1', 'after2']);
        });

        it('handles errors in beforeBuild with build()', () => {
            const UserFactory = new Factory<User>(() => ({
                email: '',
                firstName: 'John',
                lastName: 'Doe',
            })).beforeBuild(() => {
                throw new Error('Error in beforeBuild');
            });
            expect(() => UserFactory.build()).toThrow('Error in beforeBuild');
        });

        it('handles errors in beforeBuild with buildAsync()', async () => {
            const UserFactory = new Factory<User>(() => ({
                email: '',
                firstName: 'John',
                lastName: 'Doe',
            })).beforeBuild(() => {
                throw new Error('Error in beforeBuild');
            });
            await expect(UserFactory.buildAsync()).rejects.toThrow(
                'Error in beforeBuild',
            );
        });

        it('handles errors in afterBuild with build()', () => {
            const UserFactory = new Factory<User>(() => ({
                email: '',
                firstName: 'John',
                lastName: 'Doe',
            })).afterBuild(() => {
                throw new Error('Error in afterBuild');
            });
            expect(() => UserFactory.build()).toThrow('Error in afterBuild');
        });

        it('handles errors in afterBuild with buildAsync()', async () => {
            const UserFactory = new Factory<User>(() => ({
                email: '',
                firstName: 'John',
                lastName: 'Doe',
            })).afterBuild(() => {
                throw new Error('Error in afterBuild');
            });
            await expect(UserFactory.buildAsync()).rejects.toThrow(
                'Error in afterBuild',
            );
        });

        it('allows mixing synchronous and asynchronous hooks with buildAsync', async () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: '',
                firstName: factory.person.firstName(),
                lastName: factory.person.lastName(),
            }))
                .afterBuild((user: User) => {
                    user.email = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`;
                    return user;
                })
                .afterBuild(async (user: User) => {
                    await validateUser(user);
                    return user;
                });

            const user = await UserFactory.buildAsync();
            expect(user.email).toBe(
                `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`,
            );
        });

        it('validates that hooks preserve type safety', () => {
            const UserFactory = new Factory<User>(() => ({
                email: '',
                firstName: 'John',
                lastName: 'Doe',
            })).afterBuild((user) => {
                return {
                    ...user,
                    email: `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`,
                };
            });

            const user = UserFactory.build();
            expect(user.email).toBe('john.doe@example.com');
        });

        it('throws error if a hook throws TypeError', () => {
            const UserFactory = new Factory<User>(() => ({
                email: '',
                firstName: 'john',
                lastName: 'doe',
            })).afterBuild(() => {
                throw new TypeError('Incorrect type returned by hook');
            });

            expect(() => UserFactory.build()).toThrow(
                'Incorrect type returned by hook',
            );
        });
    });

    describe('Persistence Adapters', () => {
        interface TestUser {
            email: string;
            id: string;
            name: string;
        }

        const userFactory = new Factory<TestUser>((faker) => ({
            email: faker.internet.email(),
            id: faker.string.uuid(),
            name: faker.person.fullName(),
        }));

        describe('MongooseAdapter', () => {
            it('creates a single document', async () => {
                const mockModel = {
                    create: vi
                        .fn()
                        .mockImplementation((data: any) =>
                            Promise.resolve(data),
                        ),
                    insertMany: vi.fn(),
                };

                const adapter = new MongooseAdapter<TestUser>(mockModel);
                const user = await userFactory.create(undefined, { adapter });
                expect(mockModel.create).toHaveBeenCalledWith(user);
                expect(user).toEqual(
                    expect.objectContaining({
                        email: expect.any(String),
                        id: expect.any(String),
                        name: expect.any(String),
                    }),
                );
            });

            it('creates multiple documents', async () => {
                const mockModel = {
                    create: vi.fn(),
                    insertMany: vi
                        .fn()
                        .mockImplementation((docs: any[]) =>
                            Promise.resolve(docs),
                        ),
                };

                const adapter = new MongooseAdapter<TestUser>(mockModel);
                const users = await userFactory.createMany(3, undefined, {
                    adapter,
                });
                expect(mockModel.insertMany).toHaveBeenCalledWith(users);
                expect(users).toHaveLength(3);
                users.forEach((user) => {
                    expect(user).toEqual(
                        expect.objectContaining({
                            email: expect.any(String),
                            id: expect.any(String),
                            name: expect.any(String),
                        }),
                    );
                });
            });
        });

        describe('PrismaAdapter', () => {
            it('creates a single record', async () => {
                const mockModel = {
                    create: vi
                        .fn()
                        .mockImplementation(({ data }) =>
                            Promise.resolve(data),
                        ),
                    createMany: vi.fn(),
                };

                const adapter = new PrismaAdapter<TestUser>(mockModel);
                const user = await userFactory.create(undefined, { adapter });
                expect(mockModel.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({
                        email: expect.any(String),
                        id: expect.any(String),
                        name: expect.any(String),
                    }),
                });
                expect(user).toEqual(
                    expect.objectContaining({
                        email: expect.any(String),
                        id: expect.any(String),
                        name: expect.any(String),
                    }),
                );
            });

            it('creates multiple records', async () => {
                const mockModel = {
                    create: vi.fn(),
                    createMany: vi
                        .fn()
                        .mockImplementation(({ data }: { data: TestUser[] }) =>
                            Promise.resolve({ count: data.length }),
                        ),
                };

                const adapter = new PrismaAdapter<TestUser>(mockModel);
                const users = await userFactory.createMany(3, undefined, {
                    adapter,
                });
                expect(mockModel.createMany).toHaveBeenCalledWith({
                    data: users,
                });
                expect(users).toHaveLength(3);
            });
        });

        describe('TypeORMAdapter', () => {
            it('creates a single entity', async () => {
                const mockRepository = {
                    create: vi.fn().mockImplementation((data: any) => data),
                    save: vi
                        .fn()
                        .mockImplementation((data: any) =>
                            Promise.resolve(data),
                        ),
                };

                const adapter = new TypeORMAdapter<TestUser>(mockRepository);
                const user = await userFactory.create(undefined, { adapter });
                expect(mockRepository.create).toHaveBeenCalledWith(user);
                expect(mockRepository.save).toHaveBeenCalledWith(user);
                expect(user).toEqual(
                    expect.objectContaining({
                        email: expect.any(String),
                        id: expect.any(String),
                        name: expect.any(String),
                    }),
                );
            });

            it('creates multiple entities', async () => {
                const mockRepository = {
                    create: vi.fn().mockImplementation((data: any) => data),
                    save: vi
                        .fn()
                        .mockImplementation((data: any) =>
                            Promise.resolve(data),
                        ),
                };

                const adapter = new TypeORMAdapter<TestUser>(mockRepository);
                const users = await userFactory.createMany(3, undefined, {
                    adapter,
                });
                expect(mockRepository.create).toHaveBeenCalledWith(users);
                expect(mockRepository.save).toHaveBeenCalledWith(users);
                expect(users).toHaveLength(3);
                users.forEach((user) => {
                    expect(user).toEqual(
                        expect.objectContaining({
                            email: expect.any(String),
                            id: expect.any(String),
                            name: expect.any(String),
                        }),
                    );
                });
            });
        });

        describe('Custom Adapter', () => {
            it('uses a custom persistence adapter', async () => {
                const mockAdapter: PersistenceAdapter<TestUser> = {
                    create: vi
                        .fn()
                        .mockImplementation((data: any) =>
                            Promise.resolve(data),
                        ),
                    createMany: vi
                        .fn()
                        .mockImplementation((data: any) =>
                            Promise.resolve(data),
                        ),
                };

                // Test single create
                const user = await userFactory.create(undefined, {
                    adapter: mockAdapter,
                });
                expect(mockAdapter.create).toHaveBeenCalledWith(user);
                expect(user).toEqual(
                    expect.objectContaining({
                        email: expect.any(String),
                        id: expect.any(String),
                        name: expect.any(String),
                    }),
                );

                // Test batch create
                const users = await userFactory.createMany(2, undefined, {
                    adapter: mockAdapter,
                });
                expect(mockAdapter.createMany).toHaveBeenCalledWith(users);
                expect(users).toHaveLength(2);
            });
        });

        it('throws error when no persistence adapter is configured', async () => {
            const factory = new Factory<TestUser>((faker) => ({
                email: faker.internet.email(),
                id: faker.string.uuid(),
                name: faker.person.fullName(),
            }));

            await expect(factory.create()).rejects.toThrow(
                'No persistence adapter configured. Provide an adapter in options or set a default adapter.',
            );
        });

        it('uses default adapter when set with withAdapter', async () => {
            const mockAdapter: PersistenceAdapter<TestUser> = {
                create: vi
                    .fn()
                    .mockImplementation((data: any) => Promise.resolve(data)),
                createMany: vi
                    .fn()
                    .mockImplementation((data: any) => Promise.resolve(data)),
            };

            const factory = new Factory<TestUser>((faker) => ({
                email: faker.internet.email(),
                id: faker.string.uuid(),
                name: faker.person.fullName(),
            })).withAdapter(mockAdapter);

            const user = await factory.create();
            expect(mockAdapter.create).toHaveBeenCalledWith(user);

            const users = await factory.createMany(2);
            expect(mockAdapter.createMany).toHaveBeenCalledWith(users);
        });

        it('options adapter overrides default adapter', async () => {
            const defaultAdapter: PersistenceAdapter<TestUser> = {
                create: vi.fn(),
                createMany: vi.fn(),
            };

            const optionsAdapter: PersistenceAdapter<TestUser> = {
                create: vi
                    .fn()
                    .mockImplementation((data: any) => Promise.resolve(data)),
                createMany: vi
                    .fn()
                    .mockImplementation((data: any) => Promise.resolve(data)),
            };

            const factory = new Factory<TestUser>((faker) => ({
                email: faker.internet.email(),
                id: faker.string.uuid(),
                name: faker.person.fullName(),
            })).withAdapter(defaultAdapter);

            await factory.create(undefined, { adapter: optionsAdapter });
            expect(defaultAdapter.create).not.toHaveBeenCalled();
            expect(optionsAdapter.create).toHaveBeenCalled();
        });
    });

    describe('FactoryFunction kwargs parameter', () => {
        describe('synchronous factory functions', () => {
            it('receives kwargs parameter when overrides are provided', () => {
                let receivedKwargs: Partial<TestObject> | undefined;
                const factory = new Factory<TestObject>(
                    (factory, _iteration, kwargs) => {
                        receivedKwargs = kwargs;
                        return {
                            age:
                                kwargs?.age ??
                                factory.number.int({ max: 65, min: 18 }),
                            name: kwargs?.name ?? factory.person.firstName(),
                        };
                    },
                );

                const result = factory.build({ age: 30, name: 'Alice' });
                expect(receivedKwargs).toEqual({ age: 30, name: 'Alice' });
                expect(result.name).toBe('Alice');
                expect(result.age).toBe(30);
            });

            it('receives empty object kwargs when no overrides are provided', () => {
                let receivedKwargs: Partial<TestObject> | undefined;
                const factory = new Factory<TestObject>(
                    (factory, _iteration, kwargs) => {
                        receivedKwargs = kwargs;
                        return {
                            age: factory.number.int({ max: 65, min: 18 }),
                            name: factory.person.firstName(),
                        };
                    },
                );

                factory.build();
                expect(receivedKwargs).toEqual({});
            });

            it('can use kwargs to conditionally generate properties', () => {
                const factory = new Factory<TestObject>(
                    (factory, _iteration, kwargs) => {
                        return {
                            age:
                                kwargs?.age ??
                                factory.number.int({ max: 65, min: 0 }),
                            name: 'Default Name',
                        };
                    },
                );

                const withOverrides = factory.build({ name: 'Bob' });
                expect(withOverrides.name).toBe('Bob');
                expect(withOverrides.age).toBeTypeOf('number');

                const withoutOverrides = factory.build();
                expect(withoutOverrides.name).toBe('Default Name');
                expect(withoutOverrides.age).toBeTypeOf('number');
            });

            it('handles partial kwargs correctly', () => {
                const factory = new Factory<TestObject>(
                    (factory, _iteration, kwargs) => {
                        return {
                            age: kwargs?.age ?? 25,
                            name: kwargs?.name ?? factory.person.firstName(),
                        };
                    },
                );

                const partialOverride = factory.build({ name: 'Charlie' });
                expect(partialOverride.name).toBe('Charlie');
                expect(partialOverride.age).toBe(25);
            });

            it('preserves kwargs structure in batch operations', () => {
                const receivedKwargs: (Partial<TestObject> | undefined)[] = [];
                const factory = new Factory<TestObject>(
                    (_factory, iteration, kwargs) => {
                        receivedKwargs.push(kwargs);
                        return {
                            age: kwargs?.age ?? 20 + iteration,
                            name: kwargs?.name ?? `Name-${iteration}`,
                        };
                    },
                );

                const overrides = [
                    { name: 'First' },
                    { age: 40, name: 'Second' },
                    { age: 50 },
                ];

                const results = factory.batch(3, overrides);
                expect(receivedKwargs).toEqual([
                    { name: 'First' },
                    { age: 40, name: 'Second' },
                    { age: 50 },
                ]);
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

                const factory = new Factory<NullableTestObject>(
                    (factory, _iteration, kwargs) => {
                        return {
                            name: kwargs?.name ?? factory.person.firstName(),
                            value:
                                kwargs?.value === undefined
                                    ? factory.number.int()
                                    : kwargs.value,
                        };
                    },
                );

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

                const factory = new Factory<ConditionalObject>(
                    (factory, _iteration, kwargs) => {
                        const type = kwargs?.type ?? 'basic';
                        return {
                            features:
                                type === 'advanced'
                                    ? ['feature1', 'feature2']
                                    : undefined,
                            name: kwargs?.name ?? factory.person.firstName(),
                            type,
                        };
                    },
                );

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
                const factory = new Factory<TestObject>(
                    async (factory, _iteration, kwargs) => {
                        receivedKwargs = kwargs;
                        await new Promise((resolve) => setTimeout(resolve, 1));
                        return {
                            age:
                                kwargs?.age ??
                                factory.number.int({ max: 65, min: 18 }),
                            name: kwargs?.name ?? factory.person.firstName(),
                        };
                    },
                );

                const result = await factory.buildAsync({
                    age: 35,
                    name: 'AsyncAlice',
                });
                expect(receivedKwargs).toEqual({ age: 35, name: 'AsyncAlice' });
                expect(result.name).toBe('AsyncAlice');
                expect(result.age).toBe(35);
            });

            it('handles async operations with kwargs', async () => {
                const factory = new Factory<TestObject>(
                    async (factory, _iteration, kwargs) => {
                        const name = kwargs?.name ?? factory.person.firstName();
                        const processedName = await Promise.resolve(
                            name.toUpperCase(),
                        );
                        return {
                            age:
                                kwargs?.age ??
                                factory.number.int({ max: 65, min: 18 }),
                            name: processedName,
                        };
                    },
                );

                const result = await factory.buildAsync({ name: 'bob' });
                // The framework merges the result with kwargs, so the original kwargs value takes precedence
                expect(result.name).toBe('bob');
            });

            it('works with async batch operations', async () => {
                const receivedKwargs: (Partial<TestObject> | undefined)[] = [];
                const factory = new Factory<TestObject>(
                    async (_factory, iteration, kwargs) => {
                        receivedKwargs.push(kwargs);
                        await new Promise((resolve) => setTimeout(resolve, 1));
                        return {
                            age: kwargs?.age ?? 30 + iteration,
                            name: kwargs?.name ?? `AsyncName-${iteration}`,
                        };
                    },
                );

                const overrides = [{ name: 'AsyncFirst' }, { age: 45 }];

                const results = await factory.batchAsync(2, overrides);
                expect(receivedKwargs).toEqual([
                    { name: 'AsyncFirst' },
                    { age: 45 },
                ]);
                expect(results[0].name).toBe('AsyncFirst');
                expect(results[1].age).toBe(45);
            });
        });

        describe('factory functions without kwargs parameter', () => {
            it('works with factory functions that ignore kwargs parameter', () => {
                const factory = new Factory<TestObject>(
                    (_factory, iteration) => {
                        return {
                            age: 25,
                            name: `Generated-${iteration}`,
                        };
                    },
                );

                const result = factory.build({
                    age: 99,
                    name: 'ShouldBeIgnored',
                });
                // Even though the factory function ignores kwargs, the framework still merges the overrides
                expect(result.name).toBe('ShouldBeIgnored');
                expect(result.age).toBe(99);
            });

            it('works with destructured parameters omitting kwargs', () => {
                const factory = new Factory<TestObject>(
                    ({ number, person }, iteration) => {
                        return {
                            age: number.int({ max: 65, min: 18 }),
                            name: `${person.firstName()}-${iteration}`,
                        };
                    },
                );

                const result = factory.build({ name: 'Override' });
                // Even though the factory function doesn't use kwargs, the framework still merges the overrides
                expect(result.name).toBe('Override');
                expect(result.age).toBeTypeOf('number');
            });
        });

        describe('kwargs with hooks', () => {
            it('kwargs are processed before beforeBuild hooks', () => {
                const callOrder: string[] = [];
                const factory = new Factory<TestObject>(
                    (factory, _iteration, kwargs) => {
                        callOrder.push(
                            `factory-kwargs:${kwargs?.name ?? 'none'}`,
                        );
                        return {
                            age: kwargs?.age ?? 25,
                            name: kwargs?.name ?? factory.person.firstName(),
                        };
                    },
                ).beforeBuild((params) => {
                    callOrder.push(`beforeBuild:${params.name ?? 'none'}`);
                    return params;
                });

                factory.build({ name: 'TestName' });
                expect(callOrder).toEqual([
                    'beforeBuild:TestName',
                    'factory-kwargs:TestName',
                ]);
            });

            it('kwargs work with afterBuild hooks', () => {
                const factory = new Factory<TestObject>(
                    (factory, _iteration, kwargs) => {
                        return {
                            age: kwargs?.age ?? 25,
                            name: kwargs?.name ?? factory.person.firstName(),
                        };
                    },
                ).afterBuild((obj) => {
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

                const baseFactory = new Factory<BaseUser>(
                    (factory, _iteration, kwargs) => ({
                        id: kwargs?.id ?? factory.string.uuid(),
                        name: kwargs?.name ?? factory.person.firstName(),
                    }),
                );

                const extendedFactory = baseFactory.extend<ExtendedUser>(
                    (factory, _iteration, kwargs) => ({
                        email: kwargs?.email ?? factory.internet.email(),
                        id: kwargs?.id ?? factory.string.uuid(),
                        name: kwargs?.name ?? factory.person.firstName(),
                        role: kwargs?.role ?? 'user',
                    }),
                );

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

                const userFactory = new Factory<User>(
                    (factory, _iteration, kwargs) => ({
                        id: kwargs?.id ?? factory.string.uuid(),
                        name: kwargs?.name ?? factory.person.firstName(),
                    }),
                );

                const userWithStatusFactory =
                    userFactory.compose<UserWithStatus>({
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
                        child:
                            level < depth ? createNested(level + 1) : undefined,
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

            await expect(factory.buildAsync()).rejects.toThrow(
                'Async factory error',
            );
        });

        it('should throw error when calling build() with async factory', () => {
            const factory = new Factory<{ value: string }>(async () => {
                return { value: 'async result' };
            });

            expect(() => factory.build()).toThrow(
                'Async factory function detected',
            );
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
