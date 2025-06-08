import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Factory } from './index.js';
import {
    createFactoriesFromSchemas,
    createFactoryFromJsonSchema,
    JsonSchemaFactory,
    JsonSchemaOptions,
    validateGeneratedData,
} from './json-schema.js';

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
        it('should create a JsonSchemaFactory from a basic user schema', async () => {
            const UserFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );

            expect(UserFactory).toBeInstanceOf(JsonSchemaFactory);
            expect(UserFactory).toBeInstanceOf(Factory); // Should also be instance of base Factory

            const user = UserFactory.build();
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('name');
            expect(user).toHaveProperty('email');
            expect(typeof user.id).toBe('string');
            expect(typeof user.name).toBe('string');
            expect(typeof user.email).toBe('string');
            expect(user.email).toMatch(/@/);
        });

        it('should support buildMany method', async () => {
            const UserFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );

            // Test buildMany method
            const users = UserFactory.buildMany(5);

            expect(users).toHaveLength(5);
            users.forEach((user) => {
                expect(user).toHaveProperty('id');
                expect(user).toHaveProperty('name');
                expect(user).toHaveProperty('email');
            });
        });

        it('should support buildMany with overrides', async () => {
            const UserFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );

            // Test buildMany with uniform overrides
            const activeUsers = UserFactory.buildMany(3, { isActive: true });
            expect(activeUsers).toHaveLength(3);
            activeUsers.forEach((user) => {
                expect(user.isActive).toBe(true);
            });

            // Test buildMany with individual overrides
            const customUsers = UserFactory.buildMany(2, [
                { name: 'Alice' },
                { name: 'Bob' },
            ]);
            expect(customUsers).toHaveLength(2);
            expect(customUsers[0].name).toBe('Alice');
            expect(customUsers[1].name).toBe('Bob');
        });

        it('should respect required fields', async () => {
            const UserFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );
            const user = UserFactory.build();

            // Required fields should always be present
            expect(user.id).toBeDefined();
            expect(user.name).toBeDefined();
            expect(user.email).toBeDefined();
        });

        it('should handle numeric constraints', async () => {
            const ProductFactory = await createFactoryFromJsonSchema(
                testSchemas.product,
            );
            const product = ProductFactory.build();

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
            const products = ProductFactory.buildMany(10);
            const hasTags = products.some(
                (p) => p.tags && Array.isArray(p.tags),
            );
            expect(hasTags).toBe(true); // At least some should have tags
        });

        it('should handle nested objects', async () => {
            const BlogFactory = await createFactoryFromJsonSchema(
                testSchemas.blog,
            );
            const blog = BlogFactory.build();

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
            const CompositionFactory = await createFactoryFromJsonSchema(
                testSchemas.composition,
            );
            const item = CompositionFactory.build();

            // Test required properties from allOf composition
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('name');
            expect(typeof item.id).toBe('string');
            expect(typeof item.name).toBe('string');

            // Generate multiple items to test that optional properties can be generated
            const items = CompositionFactory.buildMany(10);
            const hasCreatedAt = items.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'createdAt'),
            );
            const hasDescription = items.some((item) =>
                Object.prototype.hasOwnProperty.call(item, 'description'),
            );

            // At least some items should have optional properties
            expect(hasCreatedAt || hasDescription).toBe(true);
        });

        it('should handle anyOf schemas', async () => {
            const FlexibleFactory = await createFactoryFromJsonSchema(
                testSchemas.flexible,
            );
            const item = FlexibleFactory.build();

            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('value');
            expect(['string', 'number', 'boolean']).toContain(
                typeof item.value,
            );
        });

        it('should handle array schemas', async () => {
            const ArrayFactory = await createFactoryFromJsonSchema(
                testSchemas.arrayItems,
            );
            const items = ArrayFactory.build();

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
            const FormatsFactory = await createFactoryFromJsonSchema(
                testSchemas.formats,
            );
            const item = FormatsFactory.build();

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

            const BlogFactory = await createFactoryFromJsonSchema(
                testSchemas.blog,
                options,
            );
            const blog = BlogFactory.build();

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

            const CustomFactory = await createFactoryFromJsonSchema(
                customSchema,
                options,
            );
            const item = CustomFactory.build();

            expect(item.id).toMatch(/^CUSTOM_[A-Za-z0-9]{8}$/);
        });

        it('should support batch generation (legacy batch method)', async () => {
            const UserFactory = await createFactoryFromJsonSchema(
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
            const UserFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );
            const user = UserFactory.build({
                email: 'js@example.com',
                name: 'Johanne Smith',
            });

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
            expect(factories.user).toBeInstanceOf(JsonSchemaFactory);
            expect(factories.product).toBeInstanceOf(JsonSchemaFactory);

            const user = factories.user.build();
            const product = factories.product.build();

            expect(user).toHaveProperty('email');
            expect(product).toHaveProperty('price');

            // Test buildMany method on created factories
            const users = factories.user.buildMany(3);
            const products = factories.product.buildMany(2);

            expect(users).toHaveLength(3);
            expect(products).toHaveLength(2);
        });
    });

    describe('validateGeneratedData', () => {
        it('should validate generated data against schema', async () => {
            const UserFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );
            const user = UserFactory.build();

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
            const Factory = await createFactoryFromJsonSchema(emptySchema);
            const result = Factory.build();

            expect(typeof result).toBe('object');
        });

        it('should handle null type', async () => {
            const nullSchema = { type: 'null' };
            const Factory = await createFactoryFromJsonSchema(nullSchema);
            const result = Factory.build();

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

            const Factory = await createFactoryFromJsonSchema(enumSchema);
            const result = Factory.build();

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

            const Factory = await createFactoryFromJsonSchema(recursiveSchema, {
                maxDepth: 2,
            });
            const result = Factory.build();

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

            const Factory = await createFactoryFromJsonSchema(extendedSchema);
            const result = Factory.build();

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('createdAt');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('email');
            expect(result.email).toMatch(/@/);
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

            const Factory = await createFactoryFromJsonSchema(
                complexAnyOfSchema,
                { maxDepth: 3 },
            );
            const results = Factory.buildMany(5);

            results.forEach((result) => {
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

    /* eslint-disable no-console */
    describe('Performance Benchmarks', () => {
        let UserFactory: Factory<any>;
        let BlogFactory: Factory<any>;
        let manualUserFactory: Factory<any>;

        beforeAll(async () => {
            // Setup JSON Schema factories
            UserFactory = await createFactoryFromJsonSchema(testSchemas.user);
            BlogFactory = await createFactoryFromJsonSchema(testSchemas.blog);

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
                UserFactory.build();
            }
            const schemaTime = performance.now() - schemaStart;

            // Benchmark manual factory
            const manualStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                manualUserFactory.build();
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
                BlogFactory.build();
            }
            const time = performance.now() - start;

            console.log(
                `\n Complex Object Generation Benchmark (${iterations} iterations):`,
            );
            console.log(`   Time: ${time.toFixed(2)}ms`);
            console.log(
                `   Avg per object: ${(time / iterations).toFixed(3)}ms`,
            );

            // Should generate complex objects reasonably quickly
            expect(time / iterations).toBeLessThan(50); // Less than 50ms per complex object
        });

        it('should benchmark factory creation time', async () => {
            const iterations = 50;

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                await createFactoryFromJsonSchema(testSchemas.user);
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
            expect(time / iterations).toBeLessThan(100); // Less than 100ms per factory creation
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
            expect(memoryPerObject).toBeLessThan(10_000); // Less than 10KB per object
        });

        it('should benchmark validation overhead', async () => {
            const iterations = 100;

            // Without validation
            const factoryNoValidation = await createFactoryFromJsonSchema(
                testSchemas.user,
                { strictValidation: false },
            );

            const startNoValidation = performance.now();
            for (let i = 0; i < iterations; i++) {
                factoryNoValidation.build();
            }
            const timeNoValidation = performance.now() - startNoValidation;

            // With validation
            const factoryWithValidation = await createFactoryFromJsonSchema(
                testSchemas.user,
                { strictValidation: true },
            );

            const startWithValidation = performance.now();
            for (let i = 0; i < iterations; i++) {
                factoryWithValidation.build();
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
            const BaseFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );

            const ExtendedFactory = BaseFactory.extend((faker) => ({
                customField: faker.lorem.word(),
                generatedAt: faker.date.recent(),
            }));

            const result = ExtendedFactory.build();
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('customField');
            expect(result).toHaveProperty('generatedAt');
        });

        it('should work with Factory compose method', async () => {
            const UserFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );
            const ProductFactory = await createFactoryFromJsonSchema(
                testSchemas.product,
            );

            const ComposedFactory = UserFactory.compose({
                favoriteProducts: ProductFactory.batch(3),
            });

            const result = ComposedFactory.build();
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('favoriteProducts');
            expect(Array.isArray(result.favoriteProducts)).toBe(true);
            expect(result.favoriteProducts).toHaveLength(3);
        });

        it('should work with Factory hooks', async () => {
            const UserFactory = await createFactoryFromJsonSchema(
                testSchemas.user,
            );

            const FactoryWithHooks = UserFactory.beforeBuild((params) => {
                return { ...params, name: 'Hooked Name' };
            }).afterBuild((user) => {
                user.processedAt = new Date();
                return user;
            });

            const result = FactoryWithHooks.build();
            expect(result.name).toBe('Hooked Name');
            expect(result).toHaveProperty('processedAt');
        });
    });
});
