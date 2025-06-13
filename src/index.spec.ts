import { Factory, PersistenceAdapter } from './index.js';
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

    describe('iterate method', () => {
        it('cycles through provided values indefinitely', () => {
            const factory = new Factory<TestObject>(() => defaultObject);
            const values = ['Value 1', 'Value 2', 'Value 3'];
            const generator = factory.iterate(values);
            const cycleLength = values.length * 2; // Test two full cycles
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
                    children: factory.batch(2), // Self-reference
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
                };

                const factory = userFactory.persist({
                    adapter: 'mongoose',
                    model: mockModel,
                });

                const user = await factory.create();
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
                    insertMany: vi
                        .fn()
                        .mockImplementation((docs: any[]) =>
                            Promise.resolve(docs),
                        ),
                };

                const factory = userFactory.persist({
                    adapter: 'mongoose',
                    model: mockModel,
                });

                const users = await factory.createMany(3);
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
                        .mockImplementation((data) => Promise.resolve(data)),
                };

                const factory = userFactory.persist({
                    adapter: 'prisma',
                    model: mockModel,
                });

                const user = await factory.create();
                expect(mockModel.create).toHaveBeenCalledWith({ data: user });
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
                    createMany: vi
                        .fn()
                        .mockImplementation(({ data }: { data: TestUser[] }) =>
                            Promise.resolve({ count: data.length }),
                        ),
                };

                const factory = userFactory.persist({
                    adapter: 'prisma',
                    model: mockModel,
                });

                const users = await factory.createMany(3);
                expect(mockModel.createMany).toHaveBeenCalledWith({
                    data: users,
                });
                expect(users).toHaveLength(3);
            });
        });

        describe('TypeORMAdapter', () => {
            it('creates a single entity', async () => {
                const mockRepository = {
                    save: vi
                        .fn()
                        .mockImplementation((data: any) =>
                            Promise.resolve(data),
                        ),
                };

                const factory = userFactory.persist({
                    adapter: 'typeorm',
                    model: mockRepository,
                });

                const user = await factory.create();
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
                    save: vi
                        .fn()
                        .mockImplementation((data: any) =>
                            Promise.resolve(data),
                        ),
                };

                const factory = userFactory.persist({
                    adapter: 'typeorm',
                    model: mockRepository,
                });

                const users = await factory.createMany(3);
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

                const factory = userFactory.persist({
                    adapter: mockAdapter,
                    model: {}, // Not used for custom adapter
                });

                // Test single create
                const user = await factory.create();
                expect(mockAdapter.create).toHaveBeenCalledWith(user);
                expect(user).toEqual(
                    expect.objectContaining({
                        email: expect.any(String),
                        id: expect.any(String),
                        name: expect.any(String),
                    }),
                );

                // Test batch create
                const users = await factory.createMany(2);
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
                'No persistence adapter configured. Call persist() first.',
            );
        });
    });
});
