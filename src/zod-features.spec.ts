import { z } from 'zod/v4';
import { ZodFactory } from './zod';

describe('ZodFactory', () => {
    describe('metadata-based generation', () => {
        it('should use generator from description', () => {
            const schema = z.object({
                userId: z.string().describe('userId'),
            });

            const factory = new ZodFactory(schema, {
                generators: {
                    userId: () => 'user_123',
                },
            });

            const result = factory.build();
            expect(result.userId).toBe('user_123');
        });

        it('should use example from metadata', () => {
            const schema = z.object({
                config: z.string().describe('Configuration string').meta({ example: 'example-config' }),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();
            expect(result.config).toBe('example-config');
        });

        it('should use examples array from metadata', () => {
            const schema = z.object({
                status: z.string().meta({ examples: ['active', 'inactive', 'pending'] }),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(30);

            const statuses = new Set(results.map((r) => r.status));
            expect(statuses.has('active')).toBe(true);
            expect(statuses.has('inactive')).toBe(true);
            expect(statuses.has('pending')).toBe(true);
        });

        it('should use examples object from metadata', () => {
            const schema = z.object({
                role: z.string().meta({
                    examples: {
                        admin: {
                            description: 'Administrator role',
                            value: 'admin',
                        },
                        user: {
                            description: 'Regular user role',
                            value: 'user',
                        },
                    },
                }),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(20);

            const roles = new Set(results.map((r) => r.role));
            expect(roles.has('admin')).toBe(true);
            expect(roles.has('user')).toBe(true);
        });

        it('should use global registry metadata', () => {
            const emailSchema = z.email().describe('emailGenerator');

            const schema = z.object({
                email: emailSchema,
            });

            const factory = new ZodFactory(schema, {
                generators: {
                    emailGenerator: () => 'custom@email.com',
                },
            });

            const result = factory.build();
            expect(result.email).toBe('custom@email.com');
        });

        it('should prefer example over generated value', () => {
            const schema = z.object({
                constant: z.number().meta({ example: 42 }),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(5);

            results.forEach((result) => {
                expect(result.constant).toBe(42);
            });
        });

        it('should use registered schemas with metadata', () => {
            const userIdSchema = z
                .uuid()
                .describe('Unique user identifier')
                .meta({
                    examples: ['550e8400-e29b-41d4-a716-446655440000'],
                    id: 'user_id',
                    title: 'User ID',
                });

            const schema = z.object({
                userId: userIdSchema,
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(result.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
        });
    });

    describe('top-level Zod v4 functions', () => {
        it('should handle top-level email function', () => {
            const schema = z.object({
                email: z.email(),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(10);

            results.forEach((result) => {
                expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            });
        });

        it('should handle top-level uuid functions', () => {
            const schema = z.object({
                id: z.uuid(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should handle top-level url function', () => {
            const schema = z.object({
                website: z.url(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(result.website).toMatch(/^https?:\/\//);
        });

        it('should handle top-level IP functions', () => {
            const schema = z.object({
                ipv4: z.ipv4(),
                ipv6: z.ipv6(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(result.ipv4).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
            expect(result.ipv6).toMatch(/^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i);
        });

        it('should handle top-level base64 functions', () => {
            const schema = z.object({
                encoded: z.base64(),
                urlEncoded: z.base64url(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(() => Buffer.from(result.encoded, 'base64')).not.toThrow();
            expect(() => Buffer.from(result.urlEncoded, 'base64url')).not.toThrow();
        });

        it('should handle top-level date format functions', () => {
            const schema = z.object({
                date: z.iso.date(),
                datetime: z.iso.datetime(),
                duration: z.iso.duration(),
                time: z.iso.time(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(result.datetime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}/);
            expect(result.duration).toMatch(/^PT\d+H\d+M\d+S$/);
        });
    });

    describe('partial factory functions', () => {
        it('should merge schema generation with custom factory', () => {
            const schema = z.object({
                age: z.number().int().min(0).max(100),
                email: z.email(),
                id: z.uuid(),
                name: z.string(),
            });

            const factory = new ZodFactory(schema);

            const result = factory.build({
                age: 25,
                name: 'User 42',
            });

            // From schema
            expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(result.email).toMatch(/@/);

            // From overrides
            expect(result.name).toBe('User 42');
            expect(result.age).toBe(25);
        });

        it('should allow build overrides on top of both', () => {
            const schema = z.object({
                id: z.uuid(),
                name: z.string(),
                role: z.enum(['admin', 'user']),
            });

            const factory = new ZodFactory(schema, (f) => ({
                id: f.string.uuid(),
                name: 'Default User',
                role: 'user' as const,
            }));

            const result = factory.build({
                role: 'admin',
            });

            expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(result.name).toBe('Default User');
            expect(result.role).toBe('admin');
        });
    });

    describe('recursive schemas', () => {
        it('should handle recursive schemas with depth control', () => {
            interface Category {
                name: string;
                subcategories: Category[];
            }

            const categorySchema: z.ZodType<Category> = z.lazy(() =>
                z.object({
                    name: z.string(),
                    subcategories: z.array(categorySchema),
                }),
            );

            const schema = z.object({
                rootCategory: categorySchema,
            });

            const factory = new ZodFactory(schema, { maxDepth: 3 });
            const result = factory.build();

            expect(result.rootCategory.name).toBeDefined();
            expect(Array.isArray(result.rootCategory.subcategories)).toBe(true);

            // Check depth limiting works
            let currentLevel = result.rootCategory;
            let depth = 0;
            while (currentLevel.subcategories.length > 0) {
                depth++;
                const [level] = currentLevel.subcategories;
                currentLevel = level;
            }
            expect(depth).toBeLessThanOrEqual(3);
        });

        it('should handle lazy schemas', () => {
            const schema = z.object({
                node: z.lazy(() =>
                    z.object({
                        children: z.array(z.string()),
                        id: z.string(),
                    }),
                ),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(typeof result.node.id).toBe('string');
            expect(Array.isArray(result.node.children)).toBe(true);
            result.node.children.forEach((child) => {
                expect(typeof child).toBe('string');
            });
        });
    });

    describe('special number formats', () => {
        it('should generate int32 numbers', () => {
            const schema = z.object({
                value: z.number().int(),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(20);

            results.forEach((result) => {
                expect(Number.isInteger(result.value)).toBe(true);
                expect(result.value).toBeGreaterThanOrEqual(-(2 ** 31));
                expect(result.value).toBeLessThanOrEqual(2 ** 31 - 1);
            });
        });

        it('should generate finite numbers', () => {
            const schema = z.object({
                value: z.number(),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(10);

            results.forEach((result) => {
                expect(Number.isFinite(result.value)).toBe(true);
            });
        });
    });

    describe('special types', () => {
        it('should generate NaN values', () => {
            const schema = z.object({
                value: z.nan(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(Number.isNaN(result.value)).toBe(true);
        });

        it('should handle void type', () => {
            const schema = z.object({
                nothing: z.void(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(result.nothing).toBeUndefined();
        });

        it('should require custom handler for function types', () => {
            const schema = z.object({
                callback: z.function(),
            });

            // Functions require custom handlers due to Zod v4 validation limitations
            // This test demonstrates that you must provide a custom handler
            expect(() => {
                new ZodFactory(schema).build();
            }).toThrow(); // Will throw during Zod validation

            // Example of how to properly handle functions:
            // const factory = new ZodFactory(schema).withTypeHandler(
            //     'ZodFunction',
            //     () => () => 'custom function result'
            // );

            // Note: Due to Zod v4 validation constraints, this would still fail
            // in practice. Users should avoid z.function() in schemas or
            // handle them in factory functions instead.
        });

        it('should require custom handler for promise types', () => {
            const schema = z.object({
                asyncData: z.promise(z.string()),
            });

            // Promises require custom handlers due to Zod v4 validation limitations
            // This test demonstrates that promise schemas have validation issues
            expect(() => {
                new ZodFactory(schema).build();
            }).toThrow(); // Will throw during Zod validation

            // Example of how to properly handle promises:
            // const factory = new ZodFactory(schema).withTypeHandler(
            //     'ZodPromise',
            //     (_schema, _generator) => Promise.resolve('custom promise result')
            // );

            // Note: Due to Zod v4 validation constraints, this may still fail
            // in practice. Users should avoid z.promise() in schemas or
            // handle them in factory functions instead.
        });
    });

    describe('date formats', () => {
        it('should generate ISO date strings', () => {
            const schema = z.object({
                date: z.iso.date(),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(10);

            results.forEach((result) => {
                expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            });
        });

        it('should generate ISO datetime strings', () => {
            const schema = z.object({
                timestamp: z.iso.datetime(),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(10);

            results.forEach((result) => {
                expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
                expect(() => new Date(result.timestamp)).not.toThrow();
            });
        });

        it('should generate ISO time strings', () => {
            const schema = z.object({
                time: z.iso.time(),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(10);

            results.forEach((result) => {
                expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}/);
            });
        });

        it('should generate ISO duration strings', () => {
            const schema = z.object({
                duration: z.iso.duration(),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(10);

            results.forEach((result) => {
                expect(result.duration).toMatch(/^PT\d+H\d+M\d+S$/);
            });
        });
    });

    describe('error handling', () => {
        it('should throw for never type', () => {
            const schema = z.object({
                impossible: z.never(),
            });

            const factory = new ZodFactory(schema);
            expect(() => factory.build()).toThrow('ZodNever should never be reached');
        });
    });

    describe('integration with base Factory methods', () => {
        it('should work with batch method', () => {
            const schema = z.object({
                id: z.number().int(),
                name: z.string(),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(5);

            expect(results).toHaveLength(5);
            results.forEach((result) => {
                expect(Number.isInteger(result.id)).toBe(true);
                expect(typeof result.name).toBe('string');
            });
        });

        it('should work with iterate method', () => {
            const schema = z.object({
                status: z.string(),
            });

            const factory = new ZodFactory(schema);
            const iterator = factory.iterate([{ status: 'active' }, { status: 'inactive' }, { status: 'pending' }]);

            const results = Array.from({ length: 6 }, () => iterator.next().value);

            expect(results[0].status).toBe('active');
            expect(results[1].status).toBe('inactive');
            expect(results[2].status).toBe('pending');
            expect(results[3].status).toBe('active');
            expect(results[4].status).toBe('inactive');
            expect(results[5].status).toBe('pending');
        });

        it('should work with sample method', () => {
            const schema = z.object({
                value: z.enum(['a', 'b', 'c']),
            });

            const factory = new ZodFactory(schema);
            const sampler = factory.sample(['a', 'b', 'c']);

            const results = new Set(Array.from({ length: 50 }, () => sampler.next().value));
            expect(results.has('a')).toBe(true);
            expect(results.has('b')).toBe(true);
            expect(results.has('c')).toBe(true);
        });

        it('should work with hooks', () => {
            const schema = z.object({
                createdAt: z.date(),
                id: z.string(),
            });

            let beforeBuildCalled = false;
            let afterBuildCalled = false;

            const factory = new ZodFactory(schema)
                .beforeBuild((params) => {
                    beforeBuildCalled = true;
                    return params;
                })
                .afterBuild((item) => {
                    afterBuildCalled = true;
                    return { ...item, processed: true };
                });

            const result = factory.build() as any;

            expect(beforeBuildCalled).toBe(true);
            expect(afterBuildCalled).toBe(true);
            expect(result.processed).toBe(true);
        });

        it('should validate generated data passes schema', () => {
            const schema = z.object({
                age: z.number().int().min(18).max(65),
                email: z.email(),
                metadata: z.record(z.string(), z.any()).optional(),
                status: z.enum(['active', 'inactive']),
                tags: z.array(z.string()).min(1).max(5),
            });

            const factory = new ZodFactory(schema);
            const results = factory.batch(100);

            // All generated data should pass validation
            results.forEach((result) => {
                expect(() => schema.parse(result)).not.toThrow();
            });
        });
    });

    describe('complex real-world schemas', () => {
        it('should generate user profile data', () => {
            const addressSchema = z.object({
                city: z.string(),
                country: z.string().default('USA'),
                state: z.string().length(2),
                street: z.string(),
                zipCode: z.string().regex(/^\d{5}$/),
            });

            const userSchema = z.object({
                address: addressSchema,
                email: z.email(),
                id: z.uuid(),
                metadata: z.object({
                    createdAt: z.date(),
                    lastLoginAt: z.date().nullable(),
                    loginCount: z.number().int().min(0),
                    updatedAt: z.date(),
                }),
                password: z.string().min(8),
                profile: z.object({
                    avatar: z.url().optional(),
                    bio: z.string().max(500).optional(),
                    dateOfBirth: z.date(),
                    firstName: z.string(),
                    lastName: z.string(),
                    phoneNumber: z.string().regex(/^\+?[\d\s-()]+$/),
                }),
                roles: z.array(z.enum(['user', 'admin', 'moderator'])).min(1),
                settings: z.object({
                    notifications: z.object({
                        email: z.boolean(),
                        push: z.boolean(),
                        sms: z.boolean(),
                    }),
                    privacy: z.object({
                        profileVisibility: z.enum(['public', 'friends', 'private']),
                        showEmail: z.boolean(),
                        showPhone: z.boolean(),
                    }),
                    theme: z.enum(['light', 'dark', 'auto']),
                }),
                username: z.string().min(3).max(20),
            });

            const factory = new ZodFactory(userSchema);
            const users = factory.batch(10);

            users.forEach((user) => {
                // Validate against schema
                expect(() => userSchema.parse(user)).not.toThrow();

                // Check specific constraints
                expect(user.username.length).toBeGreaterThanOrEqual(3);
                expect(user.username.length).toBeLessThanOrEqual(20);
                expect(user.email).toContain('@');
                expect(user.password.length).toBeGreaterThanOrEqual(8);
                expect(user.address.state.length).toBe(2);
                expect(user.address.zipCode).toMatch(/^\d{5}$/);
                expect(user.roles.length).toBeGreaterThanOrEqual(1);
                expect(['light', 'dark', 'auto']).toContain(user.settings.theme);
            });
        });

        it('should generate e-commerce order data', () => {
            const moneySchema = z.object({
                amount: z.number().positive().multipleOf(0.01),
                currency: z.enum(['USD', 'EUR', 'GBP']),
            });

            const productSchema = z.object({
                category: z.enum(['electronics', 'clothing', 'food', 'books', 'other']),
                description: z.string(),
                id: z.uuid(),
                name: z.string(),
                price: moneySchema,
                stock: z.number().int().min(0),
                tags: z.array(z.string()),
            });

            const orderItemSchema = z.object({
                product: productSchema,
                quantity: z.number().int().positive(),
                totalPrice: moneySchema,
                unitPrice: moneySchema,
            });

            const orderSchema = z.object({
                customerId: z.uuid(),
                items: z.array(orderItemSchema).min(1),
                orderId: z.uuid(),
                paymentMethod: z.discriminatedUnion('type', [
                    z.object({
                        brand: z.enum(['visa', 'mastercard', 'amex', 'discover']),
                        last4: z.string().length(4),
                        type: z.literal('credit_card'),
                    }),
                    z.object({
                        email: z.email(),
                        type: z.literal('paypal'),
                    }),
                    z.object({
                        accountNumber: z.string(),
                        type: z.literal('bank_transfer'),
                    }),
                ]),
                shipping: moneySchema,
                shippingAddress: z.object({
                    city: z.string(),
                    country: z.string(),
                    name: z.string(),
                    state: z.string(),
                    street: z.string(),
                    zipCode: z.string(),
                }),
                status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
                subtotal: moneySchema,
                tax: moneySchema,
                timestamps: z.object({
                    createdAt: z.date(),
                    deliveredAt: z.date().optional(),
                    shippedAt: z.date().optional(),
                    updatedAt: z.date(),
                }),
                total: moneySchema,
            });

            const factory = new ZodFactory(orderSchema);
            const orders = factory.batch(5);

            orders.forEach((order) => {
                expect(() => orderSchema.parse(order)).not.toThrow();
                expect(order.items.length).toBeGreaterThanOrEqual(1);
                expect(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).toContain(order.status);
                expect(['credit_card', 'paypal', 'bank_transfer']).toContain(order.paymentMethod.type);

                // Verify discriminated union
                switch (order.paymentMethod.type) {
                    case 'bank_transfer': {
                        expect(typeof order.paymentMethod.accountNumber).toBe('string');
                        break;
                    }
                    case 'credit_card': {
                        expect(order.paymentMethod.last4.length).toBe(4);
                        expect(['visa', 'mastercard', 'amex', 'discover']).toContain(order.paymentMethod.brand);
                        break;
                    }
                    case 'paypal': {
                        expect(order.paymentMethod.email).toContain('@');
                        break;
                    }
                }
            });
        });
    });
});
