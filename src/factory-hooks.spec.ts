import type { PersistenceAdapter } from './index.js';
import { Factory } from './index.js';
import { MongooseAdapter } from '../examples/adapters/mongoose-adapter.js';
import { PrismaAdapter } from '../examples/adapters/prisma-adapter.js';
import { TypeORMAdapter } from '../examples/adapters/typeorm-adapter.js';
import { describe, expect, it, vi } from 'vitest';

interface User {
    email: string;
    firstName: string;
    lastName: string;
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
            expect(user.email).toBe(`${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`);
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
            expect(user.email).toBe(`${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`);
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
            await expect(UserFactory.buildAsync()).rejects.toThrow('Error in beforeBuild');
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
            await expect(UserFactory.buildAsync()).rejects.toThrow('Error in afterBuild');
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
            expect(user.email).toBe(`${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@example.com`);
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

            expect(() => UserFactory.build()).toThrow('Incorrect type returned by hook');
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
                    create: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
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
                    insertMany: vi.fn().mockImplementation((docs: any[]) => Promise.resolve(docs)),
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
                    create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
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
                    save: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
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
                    save: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
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
                    create: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
                    createMany: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
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
                create: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
                createMany: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
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
                create: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
                createMany: vi.fn().mockImplementation((data: any) => Promise.resolve(data)),
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
});
