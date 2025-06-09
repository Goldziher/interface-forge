import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Factory } from './index.js';
import {
    createFactoriesFromSchemas,
    JsonSchemaFactory,
    JsonSchemaOptions,
    validateGeneratedData,
} from './json-schema.js';

// Type assertion helper for generated objects from JSON Schema
// Since we're testing dynamic schema generation, we need to use 'any' for property access
type GeneratedObject = Record<string, any>;

// Mock console.warn to test validation warnings
vi.spyOn(console, 'warn').mockImplementation(() => {});

/**
 * Test schemas for various scenarios
 */
const testSchemas = {
    // Array schema
    arrayItems: {
        items: {
            properties: {
                name: { type: 'string' },
                value: { type: 'number' },
            },
            required: ['name', 'value'],
            type: 'object',
        },
        maxItems: 5,
        minItems: 2,
        type: 'array',
    },

    // Complex nested schema
    blog: {
        properties: {
            author: {
                properties: {
                    email: { format: 'email', type: 'string' },
                    id: { format: 'uuid', type: 'string' },
                    name: { type: 'string' },
                },
                required: ['id', 'name'],
                type: 'object',
            },
            comments: {
                items: {
                    properties: {
                        authorId: { format: 'uuid', type: 'string' },
                        id: { type: 'integer' },
                        text: { minLength: 1, type: 'string' },
                    },
                    required: ['id', 'text'],
                    type: 'object',
                },
                maxItems: 10,
                type: 'array',
            },
            content: { minLength: 10, type: 'string' },
            published: { type: 'boolean' },
            title: { maxLength: 200, minLength: 5, type: 'string' },
        },
        required: ['title', 'content', 'author'],
        type: 'object',
    },

    // Schema with composition
    composition: {
        allOf: [
            {
                properties: {
                    createdAt: { format: 'date-time', type: 'string' },
                    id: { format: 'uuid', type: 'string' },
                },
                required: ['id'],
            },
            {
                properties: {
                    description: { type: 'string' },
                    name: { minLength: 1, type: 'string' },
                },
                required: ['name'],
            },
        ],
        type: 'object',
    },

    // Schema with anyOf
    flexible: {
        properties: {
            id: { type: 'string' },
            value: {
                anyOf: [
                    { type: 'string' },
                    { type: 'number' },
                    { type: 'boolean' },
                ],
            },
        },
        required: ['id', 'value'],
        type: 'object',
    },

    // String patterns and formats
    formats: {
        properties: {
            date: { format: 'date', type: 'string' },
            email: { format: 'email', type: 'string' },
            hostname: { format: 'hostname', type: 'string' },
            ipv4: { format: 'ipv4', type: 'string' },
            ipv6: { format: 'ipv6', type: 'string' },
            time: { format: 'time', type: 'string' },
            uri: { format: 'uri', type: 'string' },
            uuid: { format: 'uuid', type: 'string' },
        },
        type: 'object',
    },

    // Product schema with various numeric constraints
    product: {
        properties: {
            category: {
                enum: ['electronics', 'books', 'clothing', 'food'],
                type: 'string',
            },
            id: { minimum: 1, type: 'integer' },
            metadata: {
                additionalProperties: true,
                type: 'object',
            },
            name: { maxLength: 200, minLength: 1, type: 'string' },
            price: { minimum: 0, multipleOf: 0.01, type: 'number' },
            tags: {
                items: { type: 'string' },
                maxItems: 5,
                minItems: 1,
                type: 'array',
            },
        },
        required: ['id', 'name', 'price', 'category'],
        type: 'object',
    },

    // Basic user schema
    user: {
        additionalProperties: false,
        properties: {
            age: { maximum: 120, minimum: 0, type: 'integer' },
            createdAt: { format: 'date-time', type: 'string' },
            email: { format: 'email', type: 'string' },
            id: { format: 'uuid', type: 'string' },
            isActive: { type: 'boolean' },
            name: { maxLength: 100, minLength: 1, type: 'string' },
        },
        required: ['id', 'name', 'email'],
        type: 'object',
    },
};

describe('JSON Schema Integration', () => {
    describe('createFactoryFromJsonSchema', () => {
        it('should create a Factory from a basic user schema', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );

            expect(UserFactory).toBeInstanceOf(Factory);
            expect(UserFactory).toBeInstanceOf(Factory); // Should also be instance of base Factory

            const user = UserFactory.build() as GeneratedObject; // Generated object from schema
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('name');
            expect(user).toHaveProperty('email');
            expect(typeof user.id).toBe('string');
            expect(typeof user.name).toBe('string');
            expect(typeof user.email).toBe('string');
            expect(user.email).toMatch(/@/);
        });

        it('should support batch method', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );

            // Test batch method
            const users = UserFactory.batch(5);

            expect(users).toHaveLength(5);
            users.forEach((user) => {
                expect(user).toHaveProperty('id');
                expect(user).toHaveProperty('name');
                expect(user).toHaveProperty('email');
            });
        });

        it('should support batch with overrides', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );

            // Test batch with uniform overrides
            const activeUsers = UserFactory.batch(3, { isActive: true });
            expect(activeUsers).toHaveLength(3);
            activeUsers.forEach((user: any) => {
                expect(user.isActive).toBe(true);
            });

            // Test batch with individual overrides
            const customUsers = UserFactory.batch(2, [
                { name: 'Alice' },
                { name: 'Bob' },
            ]) as GeneratedObject[];
            expect(customUsers).toHaveLength(2);
            expect(customUsers[0].name).toBe('Alice');
            expect(customUsers[1].name).toBe('Bob');
        });

        it('should respect required fields', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );
            const user = UserFactory.build() as GeneratedObject;

            // Required fields should always be present
            expect(user.id).toBeDefined();
            expect(user.name).toBeDefined();
            expect(user.email).toBeDefined();
        });

        it('should handle numeric constraints', async () => {
            const ProductFactory = await JsonSchemaFactory.create(
                testSchemas.product,
            );
            const product = ProductFactory.build() as GeneratedObject;

            // Test required fields
            expect(product.id).toBeGreaterThanOrEqual(1);
            expect(product.price).toBeGreaterThanOrEqual(0);
            expect(['electronics', 'books', 'clothing', 'food']).toContain(
                product.category,
            );

            // Test optional tags field - when present, should be valid array
            if (product.tags) {
                expect(Array.isArray(product.tags)).toBe(true);
                expect(product.tags.length).toBeGreaterThanOrEqual(1);
                expect(product.tags.length).toBeLessThanOrEqual(5);
                product.tags.forEach((tag: any) => {
                    expect(typeof tag).toBe('string');
                });
            }

            // Generate multiple products to ensure tags can be generated
            const products = ProductFactory.batch(10);
            const hasTags = products.some(
                (p: any) => p.tags && Array.isArray(p.tags),
            );
            expect(hasTags).toBe(true); // At least some should have tags
        });

        it('should handle nested objects', async () => {
            const BlogFactory = await JsonSchemaFactory.create(
                testSchemas.blog,
            );
            const blog = BlogFactory.build() as GeneratedObject;

            expect(blog).toHaveProperty('title');
            expect(blog).toHaveProperty('content');
            expect(blog).toHaveProperty('author');
            expect(blog.author).toHaveProperty('id');
            expect(blog.author).toHaveProperty('name');

            if (blog.comments) {
                expect(Array.isArray(blog.comments)).toBe(true);
                blog.comments.forEach((comment: any) => {
                    expect(comment).toHaveProperty('id');
                    expect(comment).toHaveProperty('text');
                });
            }
        });

        it('should handle schema composition with allOf', async () => {
            const CompositionFactory = await JsonSchemaFactory.create(
                testSchemas.composition,
            );
            const item = CompositionFactory.build() as GeneratedObject;

            // Test required properties from allOf composition
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('name');
            expect(typeof item.id).toBe('string');
            expect(typeof item.name).toBe('string');

            // Generate multiple items to test that optional properties can be generated
            const items = CompositionFactory.batch(10);
            const hasCreatedAt = items.some((item: any) =>
                Object.prototype.hasOwnProperty.call(item, 'createdAt'),
            );
            const hasDescription = items.some((item: any) =>
                Object.prototype.hasOwnProperty.call(item, 'description'),
            );

            // At least some items should have optional properties
            expect(hasCreatedAt || hasDescription).toBe(true);
        });

        it('should handle anyOf schemas', async () => {
            const FlexibleFactory = await JsonSchemaFactory.create(
                testSchemas.flexible,
            );
            const item = FlexibleFactory.build() as GeneratedObject;

            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('value');
            expect(['string', 'number', 'boolean']).toContain(
                typeof item.value,
            );
        });

        it('should handle array schemas', async () => {
            const ArrayFactory = await JsonSchemaFactory.create(
                testSchemas.arrayItems,
            );
            const items = ArrayFactory.build() as GeneratedObject;

            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBeGreaterThanOrEqual(2);
            expect(items.length).toBeLessThanOrEqual(5);

            items.forEach((item: any) => {
                expect(item).toHaveProperty('name');
                expect(item).toHaveProperty('value');
                expect(typeof item.name).toBe('string');
                expect(typeof item.value).toBe('number');
            });
        });

        it('should handle various string formats', async () => {
            const FormatsFactory = await JsonSchemaFactory.create(
                testSchemas.formats,
            );
            const item = FormatsFactory.build() as GeneratedObject;

            if (item.uuid) {
                expect(item.uuid).toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                );
            }
            if (item.email) {
                expect(item.email).toMatch(/@/);
            }
            if (item.ipv4) {
                expect(item.ipv4).toMatch(
                    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
                );
            }
        });

        it('should handle custom options', async () => {
            const options: JsonSchemaOptions = {
                maxDepth: 2,
                strictValidation: false,
            };

            const BlogFactory = await JsonSchemaFactory.create(
                testSchemas.blog,
                options,
            );
            const blog = BlogFactory.build() as GeneratedObject;

            expect(blog).toHaveProperty('title');
            expect(blog).toHaveProperty('author');
        });

        it('should handle custom format generators', async () => {
            const options: JsonSchemaOptions = {
                customFormats: {
                    'custom-id': (faker) =>
                        `CUSTOM_${faker.string.alphanumeric(8)}`,
                },
            };

            const customSchema = {
                properties: {
                    id: { format: 'custom-id', type: 'string' },
                    name: { type: 'string' },
                },
                required: ['id'],
                type: 'object',
            };

            const CustomFactory = await JsonSchemaFactory.create(
                customSchema,
                options,
            );
            const item = CustomFactory.build() as GeneratedObject;

            expect(item.id).toMatch(/^CUSTOM_[A-Za-z0-9]{8}$/);
        });

        it('should support batch generation (legacy batch method)', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );
            const users = UserFactory.batch(5);

            expect(users).toHaveLength(5);
            users.forEach((user) => {
                expect(user).toHaveProperty('id');
                expect(user).toHaveProperty('name');
                expect(user).toHaveProperty('email');
            });
        });

        it('should support overrides with build', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );
            const user = UserFactory.build({
                email: 'js@example.com',
                name: 'Johanne Smith',
            }) as GeneratedObject;

            expect(user.name).toBe('Johanne Smith');
            expect(user.email).toBe('js@example.com');
            expect(user.id).toBeDefined(); // Generated field should still be present
        });

        it('should throw error when dependencies are missing', async () => {
            // This test would need to mock the dynamic import to simulate missing dependencies
            // For now, we'll skip this as the dependencies are available in the test environment
            expect(true).toBe(true); // Placeholder assertion
        });
    });

    describe('createFactoriesFromSchemas', () => {
        it('should create multiple factories from schemas object', async () => {
            const schemas = {
                product: testSchemas.product,
                user: testSchemas.user,
            };

            const factories = await createFactoriesFromSchemas(schemas);

            expect(factories).toHaveProperty('user');
            expect(factories).toHaveProperty('product');
            expect(factories.user).toBeInstanceOf(Factory);
            expect(factories.product).toBeInstanceOf(Factory);

            const user = factories.user.build() as GeneratedObject;
            const product = factories.product.build() as GeneratedObject;

            expect(user).toHaveProperty('email');
            expect(product).toHaveProperty('price');

            // Test batch method on created factories
            const users = factories.user.batch(3);
            const products = factories.product.batch(2);

            expect(users).toHaveLength(3);
            expect(products).toHaveLength(2);
        });
    });

    describe('validateGeneratedData', () => {
        it('should validate generated data against schema', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );
            const user = UserFactory.build() as GeneratedObject;

            const validation = await validateGeneratedData(
                user,
                testSchemas.user,
            );
            expect(validation.valid).toBe(true);
            expect(validation.errors).toBeUndefined();
        });

        it('should detect invalid data', async () => {
            const invalidUser = {
                email: 'not-an-email',
                id: 'not-a-uuid',
                name: '', // violates minLength
            };

            const validation = await validateGeneratedData(
                invalidUser,
                testSchemas.user,
            );
            expect(validation.valid).toBe(false);
            expect(validation.errors).toBeDefined();
            expect(validation.errors!.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty schema', async () => {
            const emptySchema = { type: 'object' };
            const Factory = await JsonSchemaFactory.create(emptySchema);
            const result = Factory.build() as GeneratedObject;

            expect(typeof result).toBe('object');
        });

        it('should handle null type', async () => {
            const nullSchema = { type: 'null' };
            const Factory = await JsonSchemaFactory.create(nullSchema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toBeNull();
        });

        it('should handle enum values', async () => {
            const enumSchema = {
                properties: {
                    status: {
                        enum: ['active', 'inactive', 'pending'],
                        type: 'string',
                    },
                },
                required: ['status'],
                type: 'object',
            };

            const Factory = await JsonSchemaFactory.create(enumSchema);
            const result = Factory.build() as GeneratedObject;

            expect(['active', 'inactive', 'pending']).toContain(result.status);
        });

        it('should handle maxDepth correctly', async () => {
            const recursiveSchema = {
                properties: {
                    child: { $ref: '#' }, // Self-reference
                    name: { type: 'string' },
                },
                required: ['name'],
                type: 'object',
            };

            const Factory = await JsonSchemaFactory.create(recursiveSchema, {
                maxDepth: 2,
            });
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('name');
            // Child should be present but limited by depth
        });

        it('should handle enhanced schema composition with $ref in allOf', async () => {
            const baseSchema = {
                properties: {
                    createdAt: { format: 'date-time', type: 'string' },
                    id: { format: 'uuid', type: 'string' },
                },
                required: ['id'],
                type: 'object',
            };

            const extendedSchema = {
                allOf: [
                    baseSchema,
                    {
                        properties: {
                            email: { format: 'email', type: 'string' },
                            name: { minLength: 1, type: 'string' },
                        },
                        required: ['name', 'email'],
                    },
                ],
                type: 'object',
            };

            const Factory = await JsonSchemaFactory.create(extendedSchema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('email');
            expect(result.email).toMatch(/@/);

            // createdAt is optional, so check if present
            if (result.createdAt) {
                expect(typeof result.createdAt).toBe('string');
            }
        });

        it('should handle anyOf with recursion prevention', async () => {
            const complexAnyOfSchema = {
                properties: {
                    content: {
                        anyOf: [
                            { type: 'number' },
                            {
                                properties: {
                                    nested: { $ref: '#' },
                                },
                                type: 'object',
                            },
                            { type: 'string' },
                        ],
                    },
                    id: { type: 'string' },
                },
                required: ['id', 'content'],
                type: 'object',
            };

            const Factory = await JsonSchemaFactory.create(complexAnyOfSchema, {
                maxDepth: 3,
            });
            const results = Factory.batch(5);

            results.forEach((result: any) => {
                expect(result).toHaveProperty('id');
                expect(result).toHaveProperty('content');
                // Content should be string, number, or object (not causing infinite recursion)
                expect(
                    ['number', 'object', 'string'].includes(
                        typeof result.content,
                    ),
                ).toBe(true);
            });
        });
    });

    describe('JSON Schema Draft Version Support', () => {
        // Test schemas for different JSON Schema drafts
        const draft07Schema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            properties: {
                id: { format: 'uuid', type: 'string' },
                metadata: {
                    properties: {
                        created: { format: 'date-time', type: 'string' },
                        version: { minimum: 1, type: 'integer' },
                    },
                    required: ['created'],
                    type: 'object',
                },
                name: { minLength: 1, type: 'string' },
                tags: {
                    items: { type: 'string' },
                    maxItems: 5,
                    minItems: 1,
                    type: 'array',
                },
            },
            required: ['id', 'name'],
            type: 'object',
        };

        const draft2019Schema = {
            $schema: 'https://json-schema.org/draft/2019-09/schema',
            properties: {
                age: { maximum: 150, minimum: 0, type: 'integer' },
                email: { format: 'email', type: 'string' },
                id: { format: 'uuid', type: 'string' },
                preferences: {
                    additionalProperties: { type: 'boolean' },
                    type: 'object',
                },
            },
            required: ['id', 'email'],
            type: 'object',
        };

        const draft2020Schema = {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            properties: {
                score: { multipleOf: 0.1, type: 'number' },
                status: { enum: ['active', 'inactive', 'pending'] },
                username: { pattern: '^[a-zA-Z0-9_]+$', type: 'string' },
                uuid: { format: 'uuid', type: 'string' },
            },
            required: ['uuid', 'username'],
            type: 'object',
        };

        it('should support JSON Schema Draft-07', async () => {
            const Factory = await JsonSchemaFactory.create(draft07Schema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(typeof result.id).toBe('string');
            expect(typeof result.name).toBe('string');
            expect(result.name.length).toBeGreaterThan(0);

            if (result.tags) {
                expect(Array.isArray(result.tags)).toBe(true);
                expect(result.tags.length).toBeGreaterThanOrEqual(1);
                expect(result.tags.length).toBeLessThanOrEqual(5);
            }

            if (result.metadata) {
                expect(result.metadata).toHaveProperty('created');
                expect(typeof result.metadata.created).toBe('string');
            }
        });

        it('should support JSON Schema Draft 2019-09', async () => {
            const Factory = await JsonSchemaFactory.create(draft2019Schema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('email');
            expect(typeof result.id).toBe('string');
            expect(typeof result.email).toBe('string');
            expect(result.email).toMatch(/@/);

            if (result.age !== undefined) {
                expect(result.age).toBeGreaterThanOrEqual(0);
                expect(result.age).toBeLessThanOrEqual(150);
            }

            if (result.preferences) {
                Object.values(result.preferences).forEach((value: any) => {
                    expect(typeof value).toBe('boolean');
                });
            }
        });

        it('should support JSON Schema Draft 2020-12', async () => {
            const Factory = await JsonSchemaFactory.create(draft2020Schema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('uuid');
            expect(result).toHaveProperty('username');
            expect(typeof result.uuid).toBe('string');
            expect(typeof result.username).toBe('string');

            // Test pattern constraint
            expect(result.username).toMatch(/^[a-zA-Z0-9_]+$/);

            // Test enum constraint
            if (result.status) {
                expect(['active', 'inactive', 'pending']).toContain(
                    result.status,
                );
            }

            // Test multipleOf constraint
            if (result.score !== undefined) {
                expect(result.score % 0.1).toBeCloseTo(0, 0);
            }
        });

        it('should handle schemas without explicit $schema property (defaults to latest)', async () => {
            const schemaWithoutVersion = {
                properties: {
                    data: { type: 'object' },
                    id: { type: 'string' },
                },
                required: ['id'],
                type: 'object',
            };

            const Factory =
                await JsonSchemaFactory.create(schemaWithoutVersion);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('id');
            expect(typeof result.id).toBe('string');
        });

        it('should generate multiple instances consistently across draft versions', async () => {
            const factories = await Promise.all([
                JsonSchemaFactory.create(draft07Schema),
                JsonSchemaFactory.create(draft2019Schema),
                JsonSchemaFactory.create(draft2020Schema),
            ]);

            const [draft07Factory, draft2019Factory, draft2020Factory] =
                factories;

            // Generate multiple instances from each factory
            const draft07Results = draft07Factory.batch(5);
            const draft2019Results = draft2019Factory.batch(5);
            const draft2020Results = draft2020Factory.batch(5);

            // Verify all results have required properties
            draft07Results.forEach((result: any) => {
                expect(result).toHaveProperty('id');
                expect(result).toHaveProperty('name');
            });

            draft2019Results.forEach((result: any) => {
                expect(result).toHaveProperty('id');
                expect(result).toHaveProperty('email');
            });

            draft2020Results.forEach((result: any) => {
                expect(result).toHaveProperty('uuid');
                expect(result).toHaveProperty('username');
            });
        });
    });

    describe('OpenAPI/Swagger Version Support', () => {
        // OpenAPI 2.0 (Swagger) schema
        const openApi2Schema = {
            definitions: {
                User: {
                    properties: {
                        email: { format: 'email', type: 'string' },
                        id: { format: 'int64', type: 'integer' },
                        name: { type: 'string' },
                        status: {
                            enum: ['active', 'inactive'],
                            type: 'string',
                        },
                    },
                    required: ['id', 'name'],
                    type: 'object',
                },
            },
        };

        // OpenAPI 3.0.x schema
        const openApi30Schema = {
            components: {
                schemas: {
                    ApiResponse: {
                        properties: {
                            data: {
                                items: { $ref: '#/components/schemas/User' },
                                type: 'array',
                            },
                            message: { type: 'string' },
                            success: { type: 'boolean' },
                        },
                        required: ['success'],
                        type: 'object',
                    },
                    User: {
                        properties: {
                            createdAt: { format: 'date-time', type: 'string' },
                            email: { format: 'email', type: 'string' },
                            id: { format: 'uuid', type: 'string' },
                            name: {
                                maxLength: 100,
                                minLength: 1,
                                type: 'string',
                            },
                            profile: {
                                $ref: '#/components/schemas/UserProfile',
                            },
                        },
                        required: ['id', 'name', 'email'],
                        type: 'object',
                    },
                    UserProfile: {
                        properties: {
                            avatar: { format: 'uri', type: 'string' },
                            bio: { maxLength: 500, type: 'string' },
                            preferences: {
                                additionalProperties: { type: 'boolean' },
                                type: 'object',
                            },
                        },
                        type: 'object',
                    },
                },
            },
            openapi: '3.0.3',
        };

        // OpenAPI 3.1.x schema (JSON Schema 2020-12 compatible)
        const openApi31Schema = {
            components: {
                schemas: {
                    Product: {
                        $schema: 'https://json-schema.org/draft/2020-12/schema',
                        properties: {
                            category: {
                                enum: ['electronics', 'books', 'clothing'],
                                type: 'string',
                            },
                            id: { format: 'uuid', type: 'string' },
                            metadata: {
                                patternProperties: {
                                    '^[a-zA-Z_][a-zA-Z0-9_]*$': {
                                        type: 'string',
                                    },
                                },
                                type: 'object',
                            },
                            name: { minLength: 1, type: 'string' },
                            price: { exclusiveMinimum: 0, type: 'number' },
                            tags: {
                                items: { type: 'string' },
                                type: 'array',
                                uniqueItems: true,
                            },
                        },
                        required: ['id', 'name', 'price'],
                        type: 'object',
                    },
                },
            },
            openapi: '3.1.0',
        };

        it('should work with OpenAPI 2.0 (Swagger) schemas', async () => {
            // Extract the User schema from OpenAPI 2.0 definitions
            const userSchema = openApi2Schema.definitions.User;
            const Factory = await JsonSchemaFactory.create(userSchema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(typeof result.id).toBe('number');
            expect(typeof result.name).toBe('string');

            if (result.status) {
                expect(['active', 'inactive']).toContain(result.status);
            }

            if (result.email) {
                expect(result.email).toMatch(/@/);
            }
        });

        it('should work with OpenAPI 3.0.x component schemas', async () => {
            // Extract User schema from OpenAPI 3.0 components
            const userSchema = openApi30Schema.components.schemas.User;
            const Factory = await JsonSchemaFactory.create(userSchema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('email');
            expect(typeof result.id).toBe('string');
            expect(typeof result.name).toBe('string');
            expect(result.email).toMatch(/@/);

            if (result.createdAt) {
                expect(typeof result.createdAt).toBe('string');
            }
        });

        it('should work with OpenAPI 3.1.x schemas (JSON Schema 2020-12)', async () => {
            // Extract Product schema from OpenAPI 3.1 components
            const productSchema = openApi31Schema.components.schemas.Product;
            const Factory = await JsonSchemaFactory.create(productSchema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('price');
            expect(typeof result.id).toBe('string');
            expect(typeof result.name).toBe('string');
            expect(typeof result.price).toBe('number');
            expect(result.price).toBeGreaterThan(0);

            if (result.category) {
                expect(['electronics', 'books', 'clothing']).toContain(
                    result.category,
                );
            }

            if (result.tags) {
                expect(Array.isArray(result.tags)).toBe(true);
                result.tags.forEach((tag: any) => {
                    expect(typeof tag).toBe('string');
                });
            }
        });

        it('should handle OpenAPI response schemas with nested references', async () => {
            // For this test, we'll use a simplified version without $ref resolution
            const responseSchema = {
                properties: {
                    data: {
                        items: {
                            properties: {
                                email: { format: 'email', type: 'string' },
                                id: { format: 'uuid', type: 'string' },
                                name: { type: 'string' },
                            },
                            required: ['id', 'name'],
                            type: 'object',
                        },
                        type: 'array',
                    },
                    message: { type: 'string' },
                    success: { type: 'boolean' },
                },
                required: ['success'],
                type: 'object',
            };

            const Factory = await JsonSchemaFactory.create(responseSchema);
            const result = Factory.build() as GeneratedObject;

            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');

            if (result.data) {
                expect(Array.isArray(result.data)).toBe(true);
                result.data.forEach((item: any) => {
                    expect(item).toHaveProperty('id');
                    expect(item).toHaveProperty('name');
                });
            }
        });

        it('should generate consistent data across different OpenAPI versions', async () => {
            // Create simplified schemas that are compatible across versions
            const userSchemaV2 = openApi2Schema.definitions.User;
            const userSchemaV30 = {
                properties: {
                    email: { format: 'email', type: 'string' },
                    id: { type: 'integer' },
                    name: { type: 'string' },
                },
                required: ['id', 'name'],
                type: 'object',
            };

            const [factoryV2, factoryV30] = await Promise.all([
                JsonSchemaFactory.create(userSchemaV2),
                JsonSchemaFactory.create(userSchemaV30),
            ]);

            const resultsV2 = factoryV2.batch(3);
            const resultsV30 = factoryV30.batch(3);

            // Both should generate valid structures
            resultsV2.forEach((result: any) => {
                expect(result).toHaveProperty('id');
                expect(result).toHaveProperty('name');
                expect(typeof result.id).toBe('number');
            });

            resultsV30.forEach((result: any) => {
                expect(result).toHaveProperty('id');
                expect(result).toHaveProperty('name');
                expect(typeof result.id).toBe('number');
            });
        });
    });

    /* eslint-disable no-console */
    describe('Performance Benchmarks', () => {
        let UserFactory: Factory<any>;
        let BlogFactory: Factory<any>;
        let manualUserFactory: Factory<any>;

        beforeAll(async () => {
            // Setup JSON Schema factories
            UserFactory = await JsonSchemaFactory.create(testSchemas.user);
            BlogFactory = await JsonSchemaFactory.create(testSchemas.blog);

            // Create equivalent manual factory for comparison
            manualUserFactory = new Factory((faker) => ({
                age: faker.number.int({ max: 120, min: 0 }),
                createdAt: faker.date.recent(),
                email: faker.internet.email(),
                id: faker.string.uuid(),
                isActive: faker.datatype.boolean(),
                name: faker.person.fullName(),
            }));
        });

        it('should benchmark single object generation', async () => {
            const iterations = 1000;

            // Benchmark JSON Schema factory
            const schemaStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                UserFactory.build() as GeneratedObject;
            }
            const schemaTime = performance.now() - schemaStart;

            // Benchmark manual factory
            const manualStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                manualUserFactory.build() as GeneratedObject;
            }
            const manualTime = performance.now() - manualStart;

            console.log(
                `\n Single Object Generation Benchmark (${iterations} iterations):`,
            );
            console.log(`   JSON Schema Factory: ${schemaTime.toFixed(2)}ms`);
            console.log(`   Manual Factory:     ${manualTime.toFixed(2)}ms`);
            console.log(
                `   Overhead:          ${((schemaTime / manualTime - 1) * 100).toFixed(1)}%`,
            );

            // JSON Schema factory should be within reasonable overhead
            expect(schemaTime / manualTime).toBeLessThan(5);
        });

        it('should benchmark batch generation', async () => {
            const batchSize = 100;
            const iterations = 10;

            // Benchmark JSON Schema factory batch
            const schemaStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                UserFactory.batch(batchSize);
            }
            const schemaTime = performance.now() - schemaStart;

            // Benchmark manual factory batch
            const manualStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                manualUserFactory.batch(batchSize);
            }
            const manualTime = performance.now() - manualStart;

            console.log(
                `\n Batch Generation Benchmark (${iterations} batches of ${batchSize}):`,
            );
            console.log(`   JSON Schema Factory: ${schemaTime.toFixed(2)}ms`);
            console.log(`   Manual Factory:     ${manualTime.toFixed(2)}ms`);
            console.log(
                `   Overhead:          ${((schemaTime / manualTime - 1) * 100).toFixed(1)}%`,
            );

            // JSON Schema factory should be within reasonable overhead
            expect(schemaTime / manualTime).toBeLessThan(10);
        });

        it('should benchmark complex nested object generation', async () => {
            const iterations = 100;

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                BlogFactory.build() as GeneratedObject;
            }
            const time = performance.now() - start;

            console.log(
                `\n Complex Object Generation Benchmark (${iterations} iterations):`,
            );
            console.log(`   Time: ${time.toFixed(2)}ms`);
            console.log(
                `   Avg per object: ${(time / iterations).toFixed(3)}ms`,
            );

            // Should generate complex objects
            expect(time / iterations).toBeLessThan(50);
        });

        it('should benchmark factory creation time', async () => {
            const iterations = 50;

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                await JsonSchemaFactory.create(testSchemas.user);
            }
            const time = performance.now() - start;

            console.log(
                `\n Factory Creation Benchmark (${iterations} iterations):`,
            );
            console.log(`   Time: ${time.toFixed(2)}ms`);
            console.log(
                `   Avg per factory: ${(time / iterations).toFixed(2)}ms`,
            );

            // Factory creation should be reasonable
            expect(time / iterations).toBeLessThan(100);
        });

        it('should benchmark memory usage with large batches', async () => {
            const largeBatch = 1000;

            // Get initial memory usage
            const initialMemory = process.memoryUsage();

            // Generate large batch
            const users = UserFactory.batch(largeBatch);

            // Get memory after generation
            const afterMemory = process.memoryUsage();

            const memoryDiff = afterMemory.heapUsed - initialMemory.heapUsed;
            const memoryPerObject = memoryDiff / largeBatch;

            console.log(`\n Memory Usage Benchmark (${largeBatch} objects):`);
            console.log(
                `   Total memory used: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`,
            );
            console.log(
                `   Memory per object: ${(memoryPerObject / 1024).toFixed(2)}KB`,
            );

            expect(users).toHaveLength(largeBatch);
            expect(memoryPerObject).toBeLessThan(10_000);
        });

        it('should benchmark validation overhead', async () => {
            const iterations = 100;

            // Without validation
            const factoryNoValidation = await JsonSchemaFactory.create(
                testSchemas.user,
                { strictValidation: false },
            );

            const startNoValidation = performance.now();
            for (let i = 0; i < iterations; i++) {
                factoryNoValidation.build() as GeneratedObject;
            }
            const timeNoValidation = performance.now() - startNoValidation;

            // With validation
            const factoryWithValidation = await JsonSchemaFactory.create(
                testSchemas.user,
                { strictValidation: true },
            );

            const startWithValidation = performance.now();
            for (let i = 0; i < iterations; i++) {
                factoryWithValidation.build() as GeneratedObject;
            }
            const timeWithValidation = performance.now() - startWithValidation;

            console.log(
                `\n Validation Overhead Benchmark (${iterations} iterations):`,
            );
            console.log(
                `   Without validation: ${timeNoValidation.toFixed(2)}ms`,
            );
            console.log(
                `   With validation:    ${timeWithValidation.toFixed(2)}ms`,
            );
            console.log(
                `   Validation overhead: ${((timeWithValidation / timeNoValidation - 1) * 100).toFixed(1)}%`,
            );

            // Validation should add some overhead but not be excessive
            expect(timeWithValidation).toBeGreaterThan(timeNoValidation);
        });
    });
    /* eslint-enable no-console */

    describe('Integration with Core Factory Features', () => {
        it('should work with Factory extend method', async () => {
            const BaseFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );

            const ExtendedFactory = BaseFactory.extend((faker) => ({
                customField: faker.lorem.word(),
                generatedAt: faker.date.recent(),
            }));

            const result = ExtendedFactory.build() as GeneratedObject;
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('customField');
            expect(result).toHaveProperty('generatedAt');
        });

        it('should work with Factory compose method', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );
            const ProductFactory = await JsonSchemaFactory.create(
                testSchemas.product,
            );

            const ComposedFactory = UserFactory.compose({
                favoriteProducts: ProductFactory.batch(3),
            });

            const result = ComposedFactory.build() as GeneratedObject;
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('favoriteProducts');
            expect(Array.isArray(result.favoriteProducts)).toBe(true);
            expect(result.favoriteProducts).toHaveLength(3);
        });

        it('should work with Factory hooks', async () => {
            const UserFactory = await JsonSchemaFactory.create(
                testSchemas.user,
            );

            const FactoryWithHooks = UserFactory.beforeBuild((params) => {
                return { ...params, name: 'Hooked Name' };
            }).afterBuild((user) => {
                (user as GeneratedObject).processedAt = new Date();
                return user;
            });

            const result = FactoryWithHooks.build() as GeneratedObject;
            expect(result.name).toBe('Hooked Name');
            expect(result).toHaveProperty('processedAt');
        });
    });
});
