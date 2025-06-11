/**
 * JSON Schema Integration Example
 *
 * This example demonstrates how to use Interface-Forge with JSON Schema definitions:
 * - Creating factories from JSON schemas
 * - Working with complex nested schemas
 * - Using schema composition (allOf, anyOf, oneOf)
 * - Custom format generators
 * - Performance comparisons with manual factories
 * - Integration with OpenAPI/Swagger specifications
 *
 * Prerequisites:
 * npm install ajv ajv-formats
 */

import {
    createFactoriesFromSchemas,
    JsonSchemaFactory,
    JsonSchemaOptions,
    validateGeneratedData,
} from '../src/json-schema.js';
import { Factory } from '../src/index.js';
import type { Faker } from '@faker-js/faker';

// Type definitions for our generated objects
interface GeneratedArticle {
    [key: string]: unknown;
    author: { email?: string; id: string; name: string };
    content: string;
    id: string;
    title: string;
}

interface GeneratedProduct {
    [key: string]: unknown;
    id: number;
    name: string;
    price: { amount: number; currency: string };
}

interface GeneratedUser {
    [key: string]: unknown;
    email: string;
    id: string;
    name: string;
}

async function runExamples(): Promise<void> {
    // Example 1: Basic JSON Schema to Factory
    console.log('Example 1: Basic User Schema');

    const userSchema = {
        additionalProperties: false,
        properties: {
            age: { maximum: 120, minimum: 0, type: 'integer' },
            createdAt: { format: 'date-time', type: 'string' },
            email: { format: 'email', type: 'string' },
            id: { format: 'uuid', type: 'string' },
            isActive: { type: 'boolean' },
            name: { maxLength: 100, minLength: 1, type: 'string' },
            preferences: {
                properties: {
                    language: { default: 'en', type: 'string' },
                    notifications: { type: 'boolean' },
                    theme: { enum: ['light', 'dark', 'auto'], type: 'string' },
                },
                required: ['theme'],
                type: 'object',
            },
            tags: {
                items: { type: 'string' },
                maxItems: 10,
                minItems: 0,
                type: 'array',
            },
        },
        required: ['id', 'name', 'email', 'isActive'],
        type: 'object',
    };

    const UserFactory = await JsonSchemaFactory.create(userSchema);

    // Generate a single user
    const user = UserFactory.build() as Record<string, unknown>;
    console.log('Generated user:', JSON.stringify(user, null, 2));

    // Generate multiple users with overrides
    const users = UserFactory.batch(3, { isActive: true });
    console.log(`Generated ${users.length} active users`);

    // Example 2: Complex E-commerce Schema
    console.log('\n Example 2: E-commerce Product Schema');

    const productSchema = {
        additionalProperties: false,
        properties: {
            attributes: {
                items: {
                    properties: {
                        name: { type: 'string' },
                        type: {
                            enum: ['text', 'number', 'boolean', 'select'],
                            type: 'string',
                        },
                        value: { type: 'string' },
                    },
                    required: ['name', 'value', 'type'],
                    type: 'object',
                },
                maxItems: 20,
                type: 'array',
            },
            category: {
                properties: {
                    id: { minimum: 1, type: 'integer' },
                    name: { type: 'string' },
                    path: { pattern: '^(/[a-z-]+)+$', type: 'string' },
                },
                required: ['id', 'name', 'path'],
                type: 'object',
            },
            createdAt: { format: 'date-time', type: 'string' },
            description: { maxLength: 1000, minLength: 10, type: 'string' },
            id: { minimum: 1, type: 'integer' },
            inventory: {
                properties: {
                    available: { minimum: 0, type: 'integer' },
                    reserved: { minimum: 0, type: 'integer' },
                    stock: { minimum: 0, type: 'integer' },
                },
                required: ['stock', 'reserved', 'available'],
                type: 'object',
            },
            isActive: { type: 'boolean' },
            name: { maxLength: 200, minLength: 1, type: 'string' },
            price: {
                properties: {
                    amount: { minimum: 0, multipleOf: 0.01, type: 'number' },
                    currency: {
                        enum: ['USD', 'EUR', 'GBP', 'JPY'],
                        type: 'string',
                    },
                },
                required: ['amount', 'currency'],
                type: 'object',
            },
            sku: { pattern: '^[A-Z]{2}-\\d{6}$', type: 'string' },
            tags: {
                items: { type: 'string' },
                type: 'array',
                uniqueItems: true,
            },
            updatedAt: { format: 'date-time', type: 'string' },
        },
        required: ['id', 'name', 'price', 'category', 'inventory', 'isActive'],
        type: 'object',
    };

    const ProductFactory = await JsonSchemaFactory.create(productSchema);
    const product = ProductFactory.build() as GeneratedProduct;
    console.log('Generated product:', JSON.stringify(product, null, 2));

    // Example 3: Schema Composition with allOf
    console.log('\n Example 3: Schema Composition (allOf)');

    const baseEntitySchema = {
        properties: {
            createdAt: { format: 'date-time', type: 'string' },
            id: { format: 'uuid', type: 'string' },
            updatedAt: { format: 'date-time', type: 'string' },
            version: { minimum: 1, type: 'integer' },
        },
        required: ['id', 'createdAt', 'updatedAt', 'version'],
        type: 'object',
    };

    const articleSchema = {
        allOf: [
            baseEntitySchema,
            {
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
                    content: { minLength: 10, type: 'string' },
                    publishedAt: { format: 'date-time', type: 'string' },
                    status: {
                        enum: ['draft', 'published', 'archived'],
                        type: 'string',
                    },
                    title: { maxLength: 200, minLength: 5, type: 'string' },
                },
                required: ['title', 'content', 'author', 'status'],
            },
        ],
        type: 'object',
    };

    const ArticleFactory = await JsonSchemaFactory.create(articleSchema);
    const article = ArticleFactory.build() as GeneratedArticle;
    console.log('Generated article:', JSON.stringify(article, null, 2));

    // Example 4: Schema with anyOf (flexible types)
    console.log('\n Example 4: Flexible Schema (anyOf)');

    const notificationSchema = {
        properties: {
            content: {
                anyOf: [
                    {
                        properties: {
                            body: { type: 'string' },
                            html: { type: 'boolean' },
                            subject: { type: 'string' },
                        },
                        required: ['subject', 'body'],
                        type: 'object',
                    },
                    {
                        properties: {
                            message: { maxLength: 160, type: 'string' },
                            sender: { type: 'string' },
                        },
                        required: ['message'],
                        type: 'object',
                    },
                    {
                        properties: {
                            actions: {
                                items: {
                                    properties: {
                                        action: { type: 'string' },
                                        title: { type: 'string' },
                                    },
                                    type: 'object',
                                },
                                type: 'array',
                            },
                            body: { type: 'string' },
                            icon: { format: 'uri', type: 'string' },
                            title: { type: 'string' },
                        },
                        required: ['title', 'body'],
                        type: 'object',
                    },
                ],
            },
            delivered: { default: false, type: 'boolean' },
            id: { format: 'uuid', type: 'string' },
            recipient: { type: 'string' },
            timestamp: { format: 'date-time', type: 'string' },
            type: { enum: ['email', 'sms', 'push', 'webhook'], type: 'string' },
        },
        required: ['id', 'type', 'recipient', 'content', 'timestamp'],
        type: 'object',
    };

    const NotificationFactory =
        await JsonSchemaFactory.create(notificationSchema);
    const notifications = NotificationFactory.batch(3);
    console.log(
        'Generated notifications:',
        JSON.stringify(notifications, null, 2),
    );

    // Example 5: Custom Format Generators
    console.log('\n Example 5: Custom Format Generators');

    const customFormats = {
        'hex-color': (faker: Faker) =>
            `#${faker.string.hexadecimal({ casing: 'lower', length: 6, prefix: '' })}`,
        'license-plate': (faker: Faker) =>
            `${faker.string.alpha({ casing: 'upper', length: 3 })}-${faker.string.numeric(3)}`,
        'product-code': (faker: Faker) =>
            `${faker.string.alpha({ casing: 'upper', length: 3 })}-${faker.string.numeric(6)}`,
        'version': (faker: Faker) =>
            `${faker.number.int({ max: 10, min: 1 })}.${faker.number.int({ max: 20, min: 0 })}.${faker.number.int({ max: 100, min: 0 })}`,
    };

    const customSchema = {
        properties: {
            brandColor: { format: 'hex-color', type: 'string' },
            licensePlate: { format: 'license-plate', type: 'string' },
            productCode: { format: 'product-code', type: 'string' },
            standardEmail: { format: 'email', type: 'string' }, // Standard format
            version: { format: 'version', type: 'string' },
        },
        required: ['productCode', 'brandColor', 'version'],
        type: 'object',
    };

    const options: JsonSchemaOptions = { customFormats };
    const CustomFactory = await JsonSchemaFactory.create(customSchema, options);
    const customItems = CustomFactory.batch(3);
    console.log(
        'Generated items with custom formats:',
        JSON.stringify(customItems, null, 2),
    );

    // Example 6: Multiple Factories from Schema Collection
    console.log('\n Example 6: Multiple Factories from Schema Collection');

    const blogSchemas = {
        article: articleSchema,
        comment: {
            properties: {
                articleId: { format: 'uuid', type: 'string' },
                authorId: { format: 'uuid', type: 'string' },
                content: { maxLength: 1000, minLength: 1, type: 'string' },
                createdAt: { format: 'date-time', type: 'string' },
                edited: { default: false, type: 'boolean' },
                id: { format: 'uuid', type: 'string' },
                likes: { minimum: 0, type: 'integer' },
                parentId: { format: 'uuid', type: 'string' },
            },
            required: ['id', 'articleId', 'authorId', 'content', 'createdAt'],
            type: 'object',
        },
        user: userSchema,
    };

    const blogFactories = await createFactoriesFromSchemas(blogSchemas);

    // Generate related content
    const blogUser = blogFactories.user.build() as GeneratedUser;
    const blogArticle = blogFactories.article.build({
        author: {
            email: blogUser.email,
            id: blogUser.id,
            name: blogUser.name,
        },
    }) as GeneratedArticle;
    const comments = blogFactories.comment.batch(3, {
        articleId: blogArticle.id,
        authorId: blogUser.id,
    });

    console.log('Blog ecosystem:');
    console.log('User:', JSON.stringify(blogUser, null, 2));
    console.log('Article:', JSON.stringify(blogArticle, null, 2));
    console.log('Comments:', JSON.stringify(comments, null, 2));

    // Example 7: OpenAPI/Swagger Integration
    console.log('\n Example 7: OpenAPI/Swagger Style Schema');

    // Typical OpenAPI component schema
    const apiResponseSchema = {
        properties: {
            data: {
                items: {
                    properties: {
                        attributes: {
                            properties: {
                                createdAt: {
                                    format: 'date-time',
                                    type: 'string',
                                },
                                email: { format: 'email', type: 'string' },
                                name: { type: 'string' },
                            },
                            required: ['name', 'email'],
                            type: 'object',
                        },
                        id: { type: 'integer' },
                        relationships: {
                            properties: {
                                posts: {
                                    properties: {
                                        data: {
                                            items: {
                                                properties: {
                                                    id: { type: 'integer' },
                                                    type: { type: 'string' },
                                                },
                                                required: ['id', 'type'],
                                                type: 'object',
                                            },
                                            type: 'array',
                                        },
                                    },
                                    required: ['data'],
                                    type: 'object',
                                },
                            },
                            type: 'object',
                        },
                        type: { type: 'string' },
                    },
                    required: ['id', 'type', 'attributes'],
                    type: 'object',
                },
                type: 'array',
            },
            meta: {
                properties: {
                    page: { minimum: 1, type: 'integer' },
                    perPage: { maximum: 100, minimum: 1, type: 'integer' },
                    total: { minimum: 0, type: 'integer' },
                },
                required: ['total', 'page', 'perPage'],
                type: 'object',
            },
        },
        required: ['data', 'meta'],
        type: 'object',
    };

    const APIResponseFactory =
        await JsonSchemaFactory.create(apiResponseSchema);
    const apiResponse = APIResponseFactory.build() as Record<string, unknown>;
    console.log(
        'Generated API response:',
        JSON.stringify(apiResponse, null, 2),
    );

    // Example 8: Performance Comparison
    console.log('\n Example 8: Performance Comparison');

    // Manual factory for comparison
    const manualUserFactory = new Factory((faker) => ({
        age: faker.number.int({ max: 120, min: 0 }),
        createdAt: faker.date.recent(),
        email: faker.internet.email(),
        id: faker.string.uuid(),
        isActive: faker.datatype.boolean(),
        name: faker.person.fullName(),
        preferences: {
            language: 'en',
            notifications: faker.datatype.boolean(),
            theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
        },
        tags: faker.helpers.multiple(() => faker.lorem.word(), {
            count: { max: 10, min: 0 },
        }),
    }));

    const iterations = 1000;

    // Benchmark JSON Schema factory
    console.time('JSON Schema Factory');
    for (let i = 0; i < iterations; i++) {
        UserFactory.build();
    }
    console.timeEnd('JSON Schema Factory');

    // Benchmark manual factory
    console.time('Manual Factory');
    for (let i = 0; i < iterations; i++) {
        manualUserFactory.build();
    }
    console.timeEnd('Manual Factory');

    // Example 9: Validation
    console.log('\n Example 9: Data Validation');

    const generatedUser = UserFactory.build();
    const validation = await validateGeneratedData(generatedUser, userSchema);

    console.log('Validation result:', validation);

    if (validation.valid) {
        console.log('Generated data is valid!');
    } else {
        console.log('Generated data is invalid:', validation.errors);
    }

    // Example 10: Integration with Existing Factory Features
    console.log('\n Example 10: Integration with Core Factory Features');

    // Extend a schema-based factory
    const ExtendedUserFactory = UserFactory.extend((faker) => ({
        displayName: faker.internet.displayName(),
        lastLoginAt: faker.date.recent(),
        metadata: {
            source: 'api',
            version: '1.0',
        },
    }));

    const extendedUser = ExtendedUserFactory.build();
    console.log('Extended user:', JSON.stringify(extendedUser, null, 2));

    // Compose with other factories
    const UserWithProductsFactory = UserFactory.compose({
        favoriteProducts: ProductFactory.batch(2),
        recentlyViewed: ProductFactory.batch(5),
    });

    const userWithProducts = UserWithProductsFactory.build();
    console.log(
        'User with products:',
        JSON.stringify(userWithProducts, null, 2),
    );

    // Use with hooks
    const UserWithHooksFactory = UserFactory.beforeBuild((params) => {
        console.log('Before build hook executed');
        return { ...params, isActive: true }; // Ensure all users are active
    }).afterBuild((user: unknown) => {
        console.log('After build hook executed');
        (user as Record<string, unknown>).processedAt =
            new Date().toISOString();
        return user;
    });

    const hookedUser = UserWithHooksFactory.build();
    console.log('User with hooks:', JSON.stringify(hookedUser, null, 2));

    // Example 11: Enhanced Schema Features (New in this version)
    console.log('\n Example 11: Enhanced Schema Composition & $ref Support');

    // Schema with $ref self-references (now properly handled)
    const treeNodeSchema = {
        properties: {
            children: {
                items: { $ref: '#' },
                maxItems: 3,
                type: 'array',
            },
            name: { type: 'string' },
            value: { type: 'number' },
        },
        required: ['name', 'value'],
        type: 'object',
    };

    console.log(
        'Creating factory with self-referencing schema (tree structure)...',
    );
    const TreeFactory = await JsonSchemaFactory.create(treeNodeSchema, {
        maxDepth: 3,
    });
    const trees = TreeFactory.batch(2);
    console.log('Generated tree structures:', JSON.stringify(trees, null, 2));

    // Enhanced allOf with constraint merging
    const advancedCompositionSchema = {
        allOf: [
            {
                properties: {
                    id: { format: 'uuid', type: 'string' },
                    timestamp: { format: 'date-time', type: 'string' },
                },
                required: ['id'],
            },
            {
                properties: {
                    name: { maxLength: 50, minLength: 2, type: 'string' },
                    score: { maximum: 100, minimum: 0, type: 'number' },
                },
                required: ['name'],
            },
            {
                properties: {
                    category: { enum: ['A', 'B', 'C'], type: 'string' },
                    metadata: {
                        additionalProperties: true,
                        type: 'object',
                    },
                },
            },
        ],
        type: 'object',
    };

    console.log('Creating factory with enhanced allOf composition...');
    const ComposedFactory = await JsonSchemaFactory.create(
        advancedCompositionSchema,
    );
    const composedItems = ComposedFactory.batch(3);
    console.log(
        'Generated composed items:',
        JSON.stringify(composedItems, null, 2),
    );

    // anyOf with recursion prevention
    const recursiveAnyOfSchema = {
        properties: {
            id: { type: 'string' },
            nested: {
                anyOf: [
                    { type: 'string' },
                    { type: 'number' },
                    {
                        properties: {
                            deep: { $ref: '#' },
                        },
                        type: 'object',
                    },
                ],
            },
        },
        required: ['id', 'nested'],
        type: 'object',
    };

    console.log('Creating factory with recursive anyOf (recursion-safe)...');
    const RecursiveFactory = await JsonSchemaFactory.create(
        recursiveAnyOfSchema,
        { maxDepth: 2 },
    );
    const recursiveItems = RecursiveFactory.batch(3);
    console.log(
        'Generated recursive items (safe):',
        JSON.stringify(recursiveItems, null, 2),
    );

    console.log('\n JSON Schema integration examples completed!');
    console.log('\n Tips:');
    console.log(
        '- Use JSON Schema for teams that already have schema definitions',
    );
    console.log('- Great for OpenAPI/Swagger API testing');
    console.log(
        '- Custom formats let you extend beyond standard JSON Schema formats',
    );
    console.log('- Combine with core Factory features for maximum flexibility');
    console.log(
        '- Use validation to ensure generated data meets your schema requirements',
    );
    console.log(
        '- batch() method provides API compatibility with JSON Schema requirements',
    );
    console.log(
        '- Enhanced $ref and allOf support handles complex schema compositions',
    );
    console.log(
        '- Recursion-safe generation prevents infinite loops in self-referencing schemas',
    );
    console.log(
        '- Set maxDepth option to control how deep nested structures can go',
    );
}

// Run the examples
runExamples().catch(console.error);
