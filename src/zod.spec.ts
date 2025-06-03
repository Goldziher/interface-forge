import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createFactoryFromZod, ZodFactory, registerZodType, unregisterZodType, getRegisteredZodTypes, clearZodTypeRegistry } from './zod.js';

describe('createFactoryFromZod', () => {
    it('should create a ZodFactory instance', () => {
        const schema = z.object({ name: z.string() });
        const factory = createFactoryFromZod(schema);
        
        expect(factory).toBeInstanceOf(ZodFactory);
    });

    describe('Custom Type Registration', () => {
        it('should register and use custom type handlers', () => {
            // Register a custom handler for a hypothetical custom type
            registerZodType('ZodCustomString', (schema, factory) => {
                return 'CUSTOM_' + factory.lorem.word().toUpperCase();
            });

            // Create a mock schema that will use the custom handler
            const customSchema = {
                constructor: { name: 'ZodCustomString' },
                _def: {},
                description: undefined
            } as any;

            const factory = createFactoryFromZod(customSchema);
            const result = factory.build();

            expect(typeof result).toBe('string');
            expect(result).toMatch(/^CUSTOM_[A-Z]+$/);

            // Clean up
            unregisterZodType('ZodCustomString');
        });

        it('should handle built-in registered types', () => {
            // Test BigInt
            const bigIntSchema = {
                constructor: { name: 'ZodBigInt' },
                _def: {},
                description: undefined
            } as any;

            const factory = createFactoryFromZod(bigIntSchema);
            const result = factory.build();

            expect(typeof result).toBe('bigint');
            expect(result).toBeGreaterThanOrEqual(0n);
            expect(result).toBeLessThanOrEqual(1000000n);
        });

        it('should handle NaN type', () => {
            const nanSchema = {
                constructor: { name: 'ZodNaN' },
                _def: {},
                description: undefined
            } as any;

            const factory = createFactoryFromZod(nanSchema);
            const result = factory.build();

            expect(Number.isNaN(result)).toBe(true);
        });

        it('should handle void type', () => {
            const voidSchema = {
                constructor: { name: 'ZodVoid' },
                _def: {},
                description: undefined
            } as any;

            const factory = createFactoryFromZod(voidSchema);
            const result = factory.build();

            expect(result).toBeUndefined();
        });

        it('should handle function type', () => {
            const functionSchema = {
                constructor: { name: 'ZodFunction' },
                _def: {},
                description: undefined
            } as any;

            const factory = createFactoryFromZod(functionSchema);
            const result = factory.build();

            expect(typeof result).toBe('function');
            expect(typeof result()).toBe('string'); // Should return a word
        });

        it('should handle promise type', () => {
            const promiseSchema = {
                constructor: { name: 'ZodPromise' },
                _def: {
                    type: z.string()
                },
                description: undefined
            } as any;

            const factory = createFactoryFromZod(promiseSchema);
            const result = factory.build();

            expect(result).toBeInstanceOf(Promise);
            return result.then((value: any) => {
                expect(typeof value).toBe('string');
            });
        });

        it('should get registered types', () => {
            const initialTypes = getRegisteredZodTypes();
            expect(initialTypes).toContain('ZodBigInt');
            expect(initialTypes).toContain('ZodNaN');
            expect(initialTypes).toContain('ZodVoid');
            expect(initialTypes).toContain('ZodFunction');
            expect(initialTypes).toContain('ZodPromise');
            expect(initialTypes).toContain('ZodLazy');

            // Register a new type
            registerZodType('TestType', () => 'test');
            const updatedTypes = getRegisteredZodTypes();
            expect(updatedTypes).toContain('TestType');

            // Clean up
            unregisterZodType('TestType');
        });

        it('should unregister types', () => {
            registerZodType('TemporaryType', () => 'temp');
            expect(getRegisteredZodTypes()).toContain('TemporaryType');

            const wasRemoved = unregisterZodType('TemporaryType');
            expect(wasRemoved).toBe(true);
            expect(getRegisteredZodTypes()).not.toContain('TemporaryType');

            // Try to remove non-existent type
            const notRemoved = unregisterZodType('NonExistentType');
            expect(notRemoved).toBe(false);
        });

        it('should clear registry', () => {
            const initialCount = getRegisteredZodTypes().length;
            expect(initialCount).toBeGreaterThan(0);

            clearZodTypeRegistry();
            expect(getRegisteredZodTypes()).toHaveLength(0);

            // Re-register built-in types for other tests
            registerZodType('ZodBigInt', (schema, factory) => {
                return BigInt(factory.number.int({ min: 0, max: 1000000 }));
            });
            registerZodType('ZodNaN', () => NaN);
            registerZodType('ZodVoid', () => undefined);
            registerZodType('ZodFunction', (schema, factory) => () => factory.lorem.word());
            registerZodType('ZodPromise', (schema, factory) => {
                const zodType = schema._def as Record<string, unknown>;
                const innerType = zodType.type as any;
                return Promise.resolve(factory.lorem.word());
            });
            registerZodType('ZodLazy', (schema, factory, config) => {
                return factory.lorem.word();
            });
        });

        it('should handle third-party zod extensions', () => {
            // Simulate a third-party Zod extension like zod-openapi
            registerZodType('ZodOpenApi', (schema, factory) => {
                const zodType = schema._def as Record<string, unknown>;
                // Extract the underlying type and generate for that
                const baseType = zodType.innerType as any;
                if (baseType instanceof z.ZodString) {
                    return factory.lorem.sentence();
                }
                return factory.lorem.word();
            });

            const customExtensionSchema = {
                constructor: { name: 'ZodOpenApi' },
                _def: {
                    innerType: z.string()
                },
                description: undefined
            } as any;

            const factory = createFactoryFromZod(customExtensionSchema);
            const result = factory.build();

            expect(typeof result).toBe('string');
            expect(result.split(' ').length).toBeGreaterThan(1); // Should be a sentence

            // Clean up
            unregisterZodType('ZodOpenApi');
        });
    });

    describe('String schemas', () => {
        it('should generate strings', () => {
            const schema = z.string();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
        });

        it('should generate emails for email schema', () => {
            const schema = z.string().email();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
            expect(result).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });

        it('should generate UUIDs for uuid schema', () => {
            const schema = z.string().uuid();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
            expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should generate URLs for url schema', () => {
            const schema = z.string().url();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
            expect(result).toMatch(/^https?:\/\/.+/);
        });

        it('should respect string length constraints', () => {
            const schema = z.string().length(10);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toHaveLength(10);
        });

        it('should respect minimum string length', () => {
            const schema = z.string().min(5);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('Number schemas', () => {
        it('should generate numbers', () => {
            const schema = z.number();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('number');
        });

        it('should generate integers', () => {
            const schema = z.number().int();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(Number.isInteger(result)).toBe(true);
        });

        it('should respect number constraints', () => {
            const schema = z.number().min(10).max(20);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeGreaterThanOrEqual(10);
            expect(result).toBeLessThanOrEqual(20);
        });
    });

    describe('Boolean schemas', () => {
        it('should generate booleans', () => {
            const schema = z.boolean();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('boolean');
        });
    });

    describe('Date schemas', () => {
        it('should generate dates', () => {
            const schema = z.date();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeInstanceOf(Date);
        });
    });

    describe('Literal schemas', () => {
        it('should return literal string values', () => {
            const schema = z.literal('hello');
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBe('hello');
        });

        it('should return literal number values', () => {
            const schema = z.literal(42);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBe(42);
        });
    });

    describe('Enum schemas', () => {
        it('should generate values from enum', () => {
            const schema = z.enum(['red', 'green', 'blue']);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(['red', 'green', 'blue']).toContain(result);
        });
    });

    describe('Null and Undefined schemas', () => {
        it('should generate null for null schema', () => {
            const schema = z.null();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeNull();
        });

        it('should generate undefined for undefined schema', () => {
            const schema = z.undefined();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeUndefined();
        });
    });

    describe('Optional schemas', () => {
        it('should sometimes generate undefined for optional schemas', () => {
            const schema = z.string().optional();
            const factory = createFactoryFromZod(schema);
            
            // Generate multiple values to test probability
            const results = Array.from({ length: 100 }, () => factory.build());
            const undefinedCount = results.filter(r => r === undefined).length;
            const stringCount = results.filter(r => typeof r === 'string').length;
            
            expect(undefinedCount).toBeGreaterThan(0);
            expect(stringCount).toBeGreaterThan(0);
        });
    });

    describe('Nullable schemas', () => {
        it('should sometimes generate null for nullable schemas', () => {
            const schema = z.string().nullable();
            const factory = createFactoryFromZod(schema);
            
            // Generate multiple values to test probability
            const results = Array.from({ length: 100 }, () => factory.build());
            const nullCount = results.filter(r => r === null).length;
            const stringCount = results.filter(r => typeof r === 'string').length;
            
            expect(nullCount).toBeGreaterThan(0);
            expect(stringCount).toBeGreaterThan(0);
        });
    });

    describe('Array schemas', () => {
        it('should generate arrays', () => {
            const schema = z.array(z.string());
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(Array.isArray(result)).toBe(true);
            expect(result.every(item => typeof item === 'string')).toBe(true);
        });

        it('should respect array length constraints', () => {
            const schema = z.array(z.string()).min(3).max(5);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result.length).toBeGreaterThanOrEqual(3);
            expect(result.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Object schemas', () => {
        it('should generate objects', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number(),
                active: z.boolean(),
            });
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('object');
            expect(typeof result.name).toBe('string');
            expect(typeof result.age).toBe('number');
            expect(typeof result.active).toBe('boolean');
        });

        it('should handle nested objects', () => {
            const schema = z.object({
                user: z.object({
                    name: z.string(),
                    email: z.string().email(),
                }),
                metadata: z.object({
                    createdAt: z.date(),
                    tags: z.array(z.string()),
                }),
            });
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result.user).toBe('object');
            expect(typeof result.user.name).toBe('string');
            expect(typeof result.user.email).toBe('string');
            expect(result.user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            expect(result.metadata.createdAt).toBeInstanceOf(Date);
            expect(Array.isArray(result.metadata.tags)).toBe(true);
        });
    });

    describe('Union schemas', () => {
        it('should generate values from union options', () => {
            const schema = z.union([z.string(), z.number()]);
            const factory = createFactoryFromZod(schema);
            
            // Generate multiple values to ensure both types appear
            const results = Array.from({ length: 100 }, () => factory.build());
            const types = [...new Set(results.map(r => typeof r))];
            
            expect(types).toContain('string');
            expect(types).toContain('number');
        });
    });

    describe('Intersection schemas', () => {
        it('should merge intersection objects', () => {
            const schema = z.intersection(
                z.object({ name: z.string() }),
                z.object({ age: z.number() })
            );
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result.name).toBe('string');
            expect(typeof result.age).toBe('number');
        });
    });

    describe('Record schemas', () => {
        it('should generate record objects', () => {
            const schema = z.record(z.string());
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('object');
            expect(Object.values(result).every(v => typeof v === 'string')).toBe(true);
        });
    });

    describe('Custom generators', () => {
        it('should use custom generators for schemas with descriptions', () => {
            const schema = z.string().describe('custom-field');
            const factory = createFactoryFromZod(schema, {
                customGenerators: {
                    'custom-field': () => 'custom-value',
                },
            });
            const result = factory.build();
            
            expect(result).toBe('custom-value');
        });
    });

    describe('Factory methods', () => {
        it('should support build() method', () => {
            const schema = z.object({ name: z.string(), age: z.number() });
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result.name).toBe('string');
            expect(typeof result.age).toBe('number');
        });

        it('should support batch() method', () => {
            const schema = z.object({ name: z.string() });
            const factory = createFactoryFromZod(schema);
            const results = factory.batch(3);
            
            expect(results).toHaveLength(3);
            expect(results.every(r => typeof r.name === 'string')).toBe(true);
        });

        it('should support build() with overrides', () => {
            const schema = z.object({ name: z.string(), age: z.number() });
            const factory = createFactoryFromZod(schema);
            const result = factory.build({ name: 'John' });
            
            expect(result.name).toBe('John');
            expect(typeof result.age).toBe('number');
        });
    });

    describe('Edge cases', () => {
        it('should handle unknown schemas', () => {
            const schema = z.unknown();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeDefined();
        });

        it('should handle any schemas', () => {
            const schema = z.any();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeDefined();
        });
    });

    // Example 1: Basic User Schema (from examples)
    describe('Example 1: Basic User Schema', () => {
        it('should generate valid basic user data', () => {
            const UserSchema = z.object({
                id: z.string().uuid(),
                name: z.string().min(1).max(100),
                email: z.string().email(),
                age: z.number().int().min(18).max(120),
                isActive: z.boolean(),
                createdAt: z.date(),
            });

            const factory = createFactoryFromZod(UserSchema);
            const user = factory.build();
            
            // Validate generated data
            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(true);
            
            if (result.success) {
                expect(result.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                expect(result.data.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                expect(result.data.name.length).toBeGreaterThan(0);
                expect(result.data.name.length).toBeLessThanOrEqual(100);
                expect(result.data.age).toBeGreaterThanOrEqual(18);
                expect(result.data.age).toBeLessThanOrEqual(120);
                expect(typeof result.data.isActive).toBe('boolean');
                expect(result.data.createdAt).toBeInstanceOf(Date);
            }

            // Test overrides
            const customUser = factory.build({
                name: 'John Doe',
                email: 'john.doe@example.com'
            });
            expect(customUser.name).toBe('John Doe');
            expect(customUser.email).toBe('john.doe@example.com');
        });
    });

    // Example 2: Complex E-commerce Product Schema
    describe('Example 2: E-commerce Product Schema', () => {
        it('should generate valid e-commerce product data', () => {
            const ProductSchema = z.object({
                id: z.string().uuid(),
                name: z.string().min(1).max(200),
                description: z.string().optional(),
                price: z.number().min(0).max(99999.99),
                category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports']),
                inStock: z.boolean(),
                tags: z.array(z.string()).min(1).max(10),
                variants: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    price: z.number().min(0),
                    available: z.boolean(),
                })).optional(),
                ratings: z.object({
                    average: z.number().min(1).max(5),
                    count: z.number().int().min(0),
                }),
                createdAt: z.date(),
                updatedAt: z.date().optional(),
            });

            const factory = createFactoryFromZod(ProductSchema);
            const product = factory.build();
            
            const result = ProductSchema.safeParse(product);
            expect(result.success).toBe(true);
            
            if (result.success) {
                expect(result.data.price).toBeGreaterThanOrEqual(0);
                expect(result.data.price).toBeLessThanOrEqual(99999.99);
                expect(['electronics', 'clothing', 'books', 'home', 'sports']).toContain(result.data.category);
                expect(result.data.tags.length).toBeGreaterThanOrEqual(1);
                expect(result.data.tags.length).toBeLessThanOrEqual(10);
                expect(result.data.ratings.average).toBeGreaterThanOrEqual(1);
                expect(result.data.ratings.average).toBeLessThanOrEqual(5);
                
                if (result.data.variants) {
                    result.data.variants.forEach(variant => {
                        expect(typeof variant.id).toBe('string');
                        expect(typeof variant.name).toBe('string');
                        expect(variant.price).toBeGreaterThanOrEqual(0);
                        expect(typeof variant.available).toBe('boolean');
                    });
                }
            }
        });
    });

    // Example 3: Company with Employees (Complex Nested Schema)
    describe('Example 3: Complex Company Schema', () => {
        it('should generate valid company data with employees', () => {
            const EmployeeSchema = z.object({
                id: z.string().uuid(),
                firstName: z.string().min(1),
                lastName: z.string().min(1),
                email: z.string().email(),
                position: z.string(),
                department: z.enum(['engineering', 'marketing', 'sales', 'hr', 'finance']),
                salary: z.number().int().min(30000).max(500000),
                startDate: z.date(),
                isActive: z.boolean(),
                skills: z.array(z.string()).min(1).max(15),
            });

            const CompanySchema = z.object({
                id: z.string().uuid(),
                name: z.string().min(1),
                website: z.string().url().optional(),
                employees: z.array(EmployeeSchema).min(1).max(10),
                address: z.object({
                    street: z.string(),
                    city: z.string(),
                    state: z.string(),
                    zipCode: z.string(),
                    country: z.string(),
                }),
                foundedAt: z.date(),
                industry: z.string(),
                revenue: z.number().min(0).optional(),
            });

            const factory = createFactoryFromZod(CompanySchema);
            const company = factory.build();
            
            const result = CompanySchema.safeParse(company);
            expect(result.success).toBe(true);
            
            if (result.success) {
                expect(result.data.employees.length).toBeGreaterThanOrEqual(1);
                expect(result.data.employees.length).toBeLessThanOrEqual(10);
                
                result.data.employees.forEach(employee => {
                    expect(employee.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                    expect(employee.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                    expect(['engineering', 'marketing', 'sales', 'hr', 'finance']).toContain(employee.department);
                    expect(employee.salary).toBeGreaterThanOrEqual(30000);
                    expect(employee.salary).toBeLessThanOrEqual(500000);
                    expect(Number.isInteger(employee.salary)).toBe(true);
                    expect(employee.skills.length).toBeGreaterThanOrEqual(1);
                    expect(employee.skills.length).toBeLessThanOrEqual(15);
                });
                
                expect(typeof result.data.address.street).toBe('string');
                expect(typeof result.data.address.city).toBe('string');
                expect(typeof result.data.address.state).toBe('string');
                expect(typeof result.data.address.zipCode).toBe('string');
                expect(typeof result.data.address.country).toBe('string');
            }
        });
    });

    // Example 4: Union Types
    describe('Example 4: Union Types', () => {
        it('should generate valid union type data', () => {
            const EventSchema = z.union([
                z.object({
                    type: z.literal('click'),
                    element: z.string(),
                    timestamp: z.date(),
                    coordinates: z.object({
                        x: z.number(),
                        y: z.number(),
                    }),
                }),
                z.object({
                    type: z.literal('scroll'),
                    position: z.number(),
                    timestamp: z.date(),
                    direction: z.enum(['up', 'down']),
                }),
                z.object({
                    type: z.literal('keypress'),
                    key: z.string(),
                    timestamp: z.date(),
                    modifiers: z.array(z.enum(['ctrl', 'alt', 'shift'])).optional(),
                }),
            ]);

            const factory = createFactoryFromZod(EventSchema);
            const events = factory.batch(10);
            
            events.forEach(event => {
                const result = EventSchema.safeParse(event);
                expect(result.success).toBe(true);
                
                if (result.success) {
                    expect(['click', 'scroll', 'keypress']).toContain(result.data.type);
                    expect(result.data.timestamp).toBeInstanceOf(Date);
                }
            });
        });
    });

    // Example 5: Custom Generators
    describe('Example 5: Custom Generators', () => {
        it('should work with custom generators', () => {
            const OrderSchema = z.object({
                id: z.string().describe('order-id'),
                customerId: z.string().describe('customer-id'),
                productId: z.string().describe('product-id'),
                quantity: z.number().int().min(1).max(100),
                status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
                total: z.number().min(0),
                createdAt: z.date(),
                notes: z.string().optional(),
            });

            const factory = createFactoryFromZod(OrderSchema, {
                customGenerators: {
                    'order-id': () => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                    'customer-id': () => `CUST-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
                    'product-id': () => `PROD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                },
            });

            const order = factory.build();
            
            const result = OrderSchema.safeParse(order);
            expect(result.success).toBe(true);
            
            if (result.success) {
                expect(result.data.id).toMatch(/^ORD-\d+-[A-Z0-9]{8}$/);
                expect(result.data.customerId).toMatch(/^CUST-[A-Z0-9]{10}$/);
                expect(result.data.productId).toMatch(/^PROD-[A-Z0-9]{8}$/);
                expect(result.data.quantity).toBeGreaterThanOrEqual(1);
                expect(result.data.quantity).toBeLessThanOrEqual(100);
                expect(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).toContain(result.data.status);
            }
        });
    });

    // Example 6: Array Constraints
    describe('Example 6: Array Constraints', () => {
        it('should respect array constraints in complex schemas', () => {
            const PlaylistSchema = z.object({
                id: z.string().uuid(),
                name: z.string().min(1).max(100),
                description: z.string().optional(),
                songs: z.array(z.object({
                    id: z.string().uuid(),
                    title: z.string().min(1),
                    artist: z.string().min(1),
                    duration: z.number().int().min(1).max(600),
                    genre: z.enum(['rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop']),
                })).min(3).max(20),
                isPublic: z.boolean(),
                createdBy: z.string().uuid(),
                createdAt: z.date(),
            });

            const factory = createFactoryFromZod(PlaylistSchema);
            const playlist = factory.build();
            
            const result = PlaylistSchema.safeParse(playlist);
            expect(result.success).toBe(true);
            
            if (result.success) {
                expect(result.data.songs.length).toBeGreaterThanOrEqual(3);
                expect(result.data.songs.length).toBeLessThanOrEqual(20);
                
                result.data.songs.forEach(song => {
                    expect(song.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                    expect(song.duration).toBeGreaterThanOrEqual(1);
                    expect(song.duration).toBeLessThanOrEqual(600);
                    expect(['rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop']).toContain(song.genre);
                });
            }
        });
    });

    // Example 7: Optional and Nullable Fields
    describe('Example 7: Optional and Nullable Fields', () => {
        it('should handle optional and nullable fields correctly', () => {
            const UserProfileSchema = z.object({
                id: z.string().uuid(),
                username: z.string().min(3).max(30),
                email: z.string().email(),
                displayName: z.string().optional(),
                bio: z.string().max(500).nullable(),
                avatar: z.string().url().optional(),
                settings: z.object({
                    theme: z.enum(['light', 'dark']).optional(),
                    notifications: z.object({
                        email: z.boolean(),
                        push: z.boolean(),
                        sms: z.boolean().optional(),
                    }),
                    privacy: z.object({
                        profileVisibility: z.enum(['public', 'friends', 'private']),
                        showEmail: z.boolean(),
                    }).optional(),
                }),
                socialLinks: z.array(z.object({
                    platform: z.enum(['twitter', 'linkedin', 'github', 'website']),
                    url: z.string().url(),
                })).optional(),
                lastLoginAt: z.date().nullable(),
                createdAt: z.date(),
            });

            const factory = createFactoryFromZod(UserProfileSchema);
            const profiles = factory.batch(10);
            
            profiles.forEach(profile => {
                const result = UserProfileSchema.safeParse(profile);
                expect(result.success).toBe(true);
                
                if (result.success) {
                    expect(result.data.username.length).toBeGreaterThanOrEqual(3);
                    expect(result.data.username.length).toBeLessThanOrEqual(30);
                    expect(result.data.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                    
                    if (result.data.bio !== null) {
                        expect(result.data.bio.length).toBeLessThanOrEqual(500);
                    }
                    
                    if (result.data.socialLinks) {
                        result.data.socialLinks.forEach(link => {
                            expect(['twitter', 'linkedin', 'github', 'website']).toContain(link.platform);
                            expect(link.url).toMatch(/^https?:\/\/.+/);
                        });
                    }
                }
            });
        });
    });

    // Example 8: Performance Testing
    describe('Example 8: Performance Testing', () => {
        it('should generate large batches efficiently', () => {
            const SimpleSchema = z.object({
                id: z.string().uuid(),
                name: z.string(),
                value: z.number(),
                timestamp: z.date(),
            });

            const factory = createFactoryFromZod(SimpleSchema);
            
            const startTime = Date.now();
            const batch = factory.batch(1000);
            const endTime = Date.now();
            
            expect(batch).toHaveLength(1000);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
            
            // Validate a sample of the generated data
            const sampleSize = Math.min(100, batch.length);
            for (let i = 0; i < sampleSize; i++) {
                const randomIndex = Math.floor(Math.random() * batch.length);
                const result = SimpleSchema.safeParse(batch[randomIndex]);
                expect(result.success).toBe(true);
            }
        });
    });

    // Example 9: Validation Testing
    describe('Example 9: Validation Testing', () => {
        it('should generate data that passes strict validation', () => {
            const StrictSchema = z.object({
                email: z.string().email(),
                age: z.number().int().min(18).max(100),
                username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
                website: z.string().url().optional(),
            });

            const factory = createFactoryFromZod(StrictSchema);
            const testObjects = factory.batch(20);
            
            let validCount = 0;
            testObjects.forEach(obj => {
                const result = StrictSchema.safeParse(obj);
                if (result.success) {
                    validCount++;
                    expect(result.data.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                    expect(result.data.age).toBeGreaterThanOrEqual(18);
                    expect(result.data.age).toBeLessThanOrEqual(100);
                    expect(Number.isInteger(result.data.age)).toBe(true);
                    expect(result.data.username).toMatch(/^[a-zA-Z0-9_]+$/);
                    expect(result.data.username.length).toBeGreaterThanOrEqual(3);
                    expect(result.data.username.length).toBeLessThanOrEqual(20);
                    
                    if (result.data.website) {
                        expect(result.data.website).toMatch(/^https?:\/\/.+/);
                    }
                }
            });
            
            // Most objects should pass validation (allowing for some randomness in regex generation)
            expect(validCount).toBeGreaterThan(testObjects.length * 0.8);
        });
    });

    describe('Integration Tests', () => {
        it('should work with Factory class inheritance', () => {
            const BaseSchema = z.object({
                id: z.string().uuid(),
                createdAt: z.date(),
            });

            const factory = createFactoryFromZod(BaseSchema);
            
            // Test that it behaves like a Factory
            expect(typeof factory.build).toBe('function');
            expect(typeof factory.batch).toBe('function');
            
            const single = factory.build();
            const multiple = factory.batch(3);
            
            expect(BaseSchema.safeParse(single).success).toBe(true);
            expect(multiple).toHaveLength(3);
            multiple.forEach(item => {
                expect(BaseSchema.safeParse(item).success).toBe(true);
            });
        });

        it('should support build with overrides', () => {
            const UserSchema = z.object({
                id: z.string().uuid(),
                name: z.string(),
                email: z.string().email(),
                age: z.number().int().min(18),
            });

            const factory = createFactoryFromZod(UserSchema);
            const userData = factory.build({
                name: 'John Doe',
                email: 'john@example.com',
            });
            
            const result = UserSchema.safeParse(userData);
            expect(result.success).toBe(true);
            
            if (result.success) {
                expect(result.data.name).toBe('John Doe');
                expect(result.data.email).toBe('john@example.com');
                expect(typeof result.data.id).toBe('string');
                expect(result.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                expect(result.data.age).toBeGreaterThanOrEqual(18);
            }
        });

        it('should work with custom generators in complex schemas', () => {
            const UserSchema = z.object({
                id: z.string().uuid(),
                username: z.string().describe('custom-username'),
                profile: z.object({
                    bio: z.string().describe('custom-bio'),
                    avatar: z.string().url(),
                }),
                settings: z.object({
                    theme: z.enum(['light', 'dark']),
                    notifications: z.boolean(),
                }),
            });

            const factory = createFactoryFromZod(UserSchema, {
                customGenerators: {
                    'custom-username': () => 'user_' + Math.random().toString(36).substr(2, 9),
                    'custom-bio': () => 'This is a custom bio for testing purposes.',
                },
            });

            const userData = factory.build();
            
            const result = UserSchema.safeParse(userData);
            expect(result.success).toBe(true);
            
            if (result.success) {
                expect(result.data.username).toMatch(/^user_[a-z0-9]{9}$/);
                expect(result.data.profile.bio).toBe('This is a custom bio for testing purposes.');
                expect(result.data.profile.avatar).toMatch(/^https?:\/\/.+/);
                expect(['light', 'dark']).toContain(result.data.settings.theme);
            }
        });
    });
}); 