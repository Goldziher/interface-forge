import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';

import { createGraphQLFactories, GraphQLFactory } from './graphql.js';
import { COLLECTION_SIZES } from './constants.js';

const SDL = `
    enum Role {
        ADMIN
        USER
    }

    scalar DateTime

    type User {
        active: Boolean!
        age: Int!
        id: ID!
        name: String!
        roles: [Role!]!
        tags: [String!]
    }

    input UserInput {
        age: Int
        name: String!
    }

    type Post {
        author: User!
        createdAt: DateTime
        id: ID!
        score: Float
        tags: [String!]
    }
`;

describe('GraphQL integration', () => {
    it('accepts an SDL string', () => {
        const factories = createGraphQLFactories('type User { id: ID!, name: String! }');
        expect(Object.keys(factories)).toContain('User');
    });

    it('accepts a built GraphQLSchema', () => {
        const schema = buildSchema('type User { id: ID!, name: String! }');
        const factories = createGraphQLFactories(schema);
        const user = factories.User?.build() as { id: string; name: string };
        expect(user.name).toBeTruthy();
        expect(user.id).toMatch(/^[0-9a-f-]{36}$/iu);
    });

    it('generates factories for object and input object types', () => {
        const factories = createGraphQLFactories(SDL);
        expect(Object.keys(factories).sort()).toEqual(['Post', 'User', 'UserInput']);
    });

    it('generates built-in scalars for object fields', () => {
        const factories = createGraphQLFactories(SDL);
        const user = factories.User?.build() as {
            active: boolean;
            age: number;
            id: string;
            name: string;
        };

        expect(typeof user.active).toBe('boolean');
        expect(Number.isInteger(user.age)).toBe(true);
        expect(user.id).toMatch(/^[0-9a-f-]{36}$/iu);
        expect(typeof user.name).toBe('string');
        expect(user.name.length).toBeGreaterThan(0);
    });

    it('generates enum values from their definitions', () => {
        const factories = createGraphQLFactories(SDL);
        const user = factories.User?.build() as { roles: string[] };

        expect(user.roles.length).toBeGreaterThan(0);
        for (const role of user.roles) {
            expect(['ADMIN', 'USER']).toContain(role);
        }
    });

    it('generates lists bounded by the default collection sizes', () => {
        const factories = createGraphQLFactories(SDL);
        const user = factories.User?.build() as { roles: string[] };

        expect(user.roles.length).toBeGreaterThanOrEqual(COLLECTION_SIZES.DEFAULT_ARRAY_MIN);
        expect(user.roles.length).toBeLessThanOrEqual(COLLECTION_SIZES.DEFAULT_ARRAY_MAX);
    });

    it('allows nullable list fields to produce nullable items of any shape', () => {
        const factories = createGraphQLFactories(SDL);
        const post = factories.Post?.build() as { tags: string[] };

        expect(Array.isArray(post.tags)).toBe(true);
        expect(post.tags.every((tag) => typeof tag === 'string')).toBe(true);
    });

    it('resolves simple nested object types', () => {
        const factories = createGraphQLFactories(SDL);
        const post = factories.Post?.build() as {
            author: { id: string; name: string };
            id: string;
        };

        expect(post.id).toMatch(/^[0-9a-f-]{36}$/iu);
        expect(post.author).toBeTypeOf('object');
        expect(typeof post.author?.name).toBe('string');
        expect(post.author?.id).toMatch(/^[0-9a-f-]{36}$/iu);
    });

    it('generates custom scalars with provided generators', () => {
        const factories = createGraphQLFactories(SDL, {
            customScalarGenerators: {
                DateTime: () => '2026-01-01T00:00:00Z',
            },
        });

        const post = factories.Post?.build() as { createdAt: string };
        expect(post.createdAt).toBe('2026-01-01T00:00:00Z');
    });

    it('fails clearly for required custom scalars without generators', () => {
        const factories = createGraphQLFactories('scalar DateTime\n\ntype A { when: DateTime! }');
        expect(() => factories.A?.build()).toThrow('No generator for required scalar "DateTime".');
    });

    it('treats nullable custom scalars without generators as null', () => {
        const factories = createGraphQLFactories('scalar CString\n\ntype A { value: CString }');
        const a = factories.A?.build() as { value: string | null };
        expect(a.value).toBeNull();
    });

    it('handles max depth by returning null for nested objects past the limit', () => {
        const factories = createGraphQLFactories(SDL, { maxDepth: 1 });
        const post = factories.Post?.build() as { author: unknown };
        expect(post.author).toBeNull();
    });

    it('applies factory-function overrides on top of generated values', () => {
        const schema = buildSchema('type User { id: ID!, name: String! }');
        const factory = new GraphQLFactory(schema, schema.getType('User') as never, () => ({
            name: 'Static Name',
        }));

        const user = factory.build() as { id: string; name: string };
        expect(user.name).toBe('Static Name');
        expect(user.id).toMatch(/^[0-9a-f-]{36}$/iu);
    });

    it('keeps optional fields null-free through non-null unwrapping', () => {
        const factories = createGraphQLFactories(SDL);
        const user = factories.User?.build() as { age: number; tags: string[] };
        expect(user.age).not.toBeNull();
        expect(user.tags).not.toBeNull();
    });
});
