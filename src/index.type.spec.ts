/* eslint-disable vitest/expect-expect */

import { expectTypeOf } from 'expect-type';
import { Factory, FactoryFunction, FactorySchema } from './index';

interface Post {
    author: User;
    content: string;
    id: string;
    tags: string[];
    title: string;
    views: number;
}

interface User {
    age: number;
    createdAt: Date;
    email: string;
    id: string;
    isActive: boolean;
    name: string;
}

describe('Factory Type Tests', () => {
    it('should infer correct types from factory function', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const user = userFactory.build();
        expectTypeOf(user).toEqualTypeOf<User>();
        expectTypeOf(user.id).toBeString();
        expectTypeOf(user.age).toBeNumber();
        expectTypeOf(user.isActive).toBeBoolean();
        expectTypeOf(user.createdAt).toEqualTypeOf<Date>();
    });

    it('should handle partial overrides correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const customUser = userFactory.build({
            email: 'john@example.com',
            name: 'John Doe',
        });

        expectTypeOf(customUser).toEqualTypeOf<User>();
        expectTypeOf(customUser.name).toBeString();
        expectTypeOf(customUser.email).toBeString();
    });

    it('should type batch method correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const users = userFactory.batch(5);
        expectTypeOf(users).toEqualTypeOf<User[]>();
        expectTypeOf(users[0]).toEqualTypeOf<User>();
    });

    it('should handle batch with overrides array', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const users = userFactory.batch(3, [
            { name: 'User 1' },
            { age: 25, name: 'User 2' },
            { email: 'user3@example.com' },
        ]);

        expectTypeOf(users).toEqualTypeOf<User[]>();
        expectTypeOf(users.length).toEqualTypeOf<number>();
    });

    it('should handle nested factories with composition', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const postFactory = new Factory<Post>((faker) => ({
            author: userFactory.build(),
            content: faker.lorem.paragraphs(),
            id: faker.string.uuid(),
            tags: faker.helpers.multiple(() => faker.lorem.word(), {
                count: 3,
            }),
            title: faker.lorem.sentence(),
            views: faker.number.int({ max: 10_000, min: 0 }),
        }));

        const post = postFactory.build();
        expectTypeOf(post).toEqualTypeOf<Post>();
        expectTypeOf(post.author).toEqualTypeOf<User>();
        expectTypeOf(post.tags).toEqualTypeOf<string[]>();
    });

    it('should type compose method correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const postFactory = new Factory<Post>((faker) => ({
            author: userFactory.build(),
            content: faker.lorem.paragraphs(),
            id: faker.string.uuid(),
            tags: faker.helpers.multiple(() => faker.lorem.word(), {
                count: 3,
            }),
            title: faker.lorem.sentence(),
            views: faker.number.int({ max: 10_000, min: 0 }),
        }));

        const composedFactory = postFactory.compose({
            author: userFactory,
        });

        const post = composedFactory.build();
        expectTypeOf(post).toEqualTypeOf<Post>();
        expectTypeOf(post.author).toEqualTypeOf<User>();
    });

    it('should type iterate method correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const ages = [20, 30, 40];
        const generator = userFactory.iterate(ages);

        expectTypeOf(generator).toExtend<Generator<number, number, number>>();
        expectTypeOf(generator.next().value).toBeNumber();
    });

    it('should type sample method correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const names = ['Alice', 'Bob', 'Charlie'];
        const generator = userFactory.sample(names);

        expectTypeOf(generator).toExtend<Generator<string, string, string>>();
        expectTypeOf(generator.next().value).toBeString();
    });

    it('should type extend method correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        interface ExtendedUser extends User {
            lastLogin: Date | null;
            role: 'admin' | 'guest' | 'user';
        }

        // The extend method expects a factory function that returns the FULL extended type
        // The base values will be merged with the extended values internally
        const extendedFactory = userFactory.extend<ExtendedUser>((factory) => {
            // Get base user data
            const baseUser = userFactory.build();
            // Return the full extended user
            return {
                ...baseUser,
                lastLogin: factory.datatype.boolean()
                    ? factory.date.recent()
                    : null,
                role: factory.helpers.arrayElement([
                    'admin',
                    'user',
                    'guest',
                ] as const),
            };
        });

        const extendedUser = extendedFactory.build();
        expectTypeOf(extendedUser).toEqualTypeOf<ExtendedUser>();
        expectTypeOf(extendedUser.role).toEqualTypeOf<
            'admin' | 'guest' | 'user'
        >();
        expectTypeOf(extendedUser.lastLogin).toEqualTypeOf<Date | null>();
    });

    it('should type hooks correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const factoryWithHooks = userFactory
            .beforeBuild((data) => {
                expectTypeOf(data).toBeObject();
                expectTypeOf(data).toHaveProperty('id');
                expectTypeOf(data).toHaveProperty('name');
                expectTypeOf(data).toHaveProperty('email');
                return data;
            })
            .afterBuild((data) => {
                expectTypeOf(data).toBeObject();
                expectTypeOf(data).toHaveProperty('id');
                expectTypeOf(data).toHaveProperty('name');
                expectTypeOf(data).toHaveProperty('email');
                return data;
            });

        const user = factoryWithHooks.build();
        expectTypeOf(user).toEqualTypeOf<User>();
    });

    it('should type buildAsync correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const asyncUser = userFactory.buildAsync();
        expectTypeOf(asyncUser).toEqualTypeOf<Promise<User>>();
    });

    it('should type batchAsync correctly', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const asyncUsers = userFactory.batchAsync(5);
        expectTypeOf(asyncUsers).toEqualTypeOf<Promise<User[]>>();
    });

    it('should type FactoryFunction and FactorySchema types correctly', () => {
        const factoryFn: FactoryFunction<User> = (faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        });

        const schema: FactorySchema<User> = {
            age: 25,
            createdAt: new Date(),
            email: 'test@example.com',
            id: 'test-id',
            isActive: true,
            name: 'Test User',
        };

        expectTypeOf(factoryFn).toExtend<FactoryFunction<User>>();
        expectTypeOf(schema).toEqualTypeOf<FactorySchema<User>>();
    });

    it('should handle factories returning other factories', () => {
        const userFactory = new Factory<User>((faker) => ({
            age: faker.number.int({ max: 80, min: 18 }),
            createdAt: faker.date.past(),
            email: faker.internet.email(),
            id: faker.string.uuid(),
            isActive: faker.datatype.boolean(),
            name: faker.person.fullName(),
        }));

        const postFactoryReturningUser = new Factory<Post>((faker) => ({
            author: userFactory.build(),
            content: faker.lorem.paragraphs(),
            id: faker.string.uuid(),
            tags: faker.helpers.multiple(() => faker.lorem.word(), {
                count: 3,
            }),
            title: faker.lorem.sentence(),
            views: faker.number.int({ max: 10_000, min: 0 }),
        }));

        const post = postFactoryReturningUser.build();
        expectTypeOf(post.author).toEqualTypeOf<User>();
        expectTypeOf(post.author).not.toBeAny();
        expectTypeOf(post.author).not.toBeUnknown();
    });
});
