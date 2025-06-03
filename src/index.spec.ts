import { Factory } from './index';

interface TestObject {
    age?: number;
    name: string;
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
            const factory = new Factory<ComplexObject>(
                (_factory, _iteration) => ({
                    ...defaults,
                    type: _factory.sample(typeOptions),
                }),
            );

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

        it('cycles through values of an iterable', () => {
            const factory = new Factory<ComplexObject>(
                (_factory, _iteration) => ({
                    name: _factory.person.firstName(),
                    value: _factory.iterate([1, 2, 3]).next().value,
                }),
            );
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

        it('samples values from the iterable', () => {
            const factory = new Factory<ComplexObject>(
                (_factory, _iteration) => ({
                    name: _factory.person.firstName(),
                    value: _factory.iterate([1, 2, 3]).next().value,
                }),
            );
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
                        children: factory.use(complexFactory.batch, 2),
                        type: '1',
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

        it('composes a factory with other factories', () => {
            const UserFactory = new Factory<User>((factory) => ({
                email: factory.internet.email(),
                name: factory.person.fullName(),
            }));

            const PostFactory = new Factory<Post>((factory) => ({
                content: factory.helpers.arrayElement([
                    'Thanks for visiting my personal website.',
                    'I am a software developer passionate about coding.',
                    'Feel free to reach out through the contact form.',
                ]),
                title: factory.helpers.arrayElement([
                    'Welcome to My Website',
                    'About Me',
                    'Contact Information',
                ]),
            }));

            const UserWithPostsFactory = UserFactory.compose<UserWithPosts>({
                posts: PostFactory.batch(3),
            });

            const userWithPosts = UserWithPostsFactory.build();
            expect(userWithPosts.name).toBeDefined();
            expect(userWithPosts.email).toBeDefined();
            expect(userWithPosts.posts).toHaveLength(3);
            expect(userWithPosts.posts[0]).toHaveProperty('title');
            expect(userWithPosts.posts[0]).toHaveProperty('content');
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
            expect(user.name).toBeDefined();
            expect(user.email).toBeDefined();
            expect(user.status).toBe('active');
        });
    });
});
