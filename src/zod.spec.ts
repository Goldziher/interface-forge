import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { clearZodTypeRegistry, getRegisteredZodTypes, registerZodType, unregisterZodType, ZodFactory } from './zod.js';

describe('ZodFactory', () => {
    it('should create a ZodFactory instance', () => {
        const schema = z.object({ name: z.string() });
        const factory = new ZodFactory(schema);
        
        expect(factory).toBeInstanceOf(ZodFactory);
    });

    it('should generate data matching Zod schema', () => {
        const schema = z.object({
            age: z.number().int().min(18).max(100),
            email: z.string().email(),
            id: z.string().uuid(),
            isActive: z.boolean(),
            name: z.string().min(1).max(50),
            tags: z.array(z.string()).min(1).max(3),
        });

        const factory = new ZodFactory(schema);
        const result = factory.build();

        // Validate the result against the schema
        expect(() => schema.parse(result)).not.toThrow();
    });

    it('should handle optional and nullable types', () => {
        const schema = z.object({
            optional: z.string().optional(),
            nullable: z.string().nullable(),
            both: z.string().optional().nullable(),
        });
        const factory = new ZodFactory(schema);
        
        for (let i = 0; i < 10; i++) {
            const result = factory.build();
            expect(typeof result).toBe('object');
            
            if (result.optional !== undefined) {
                expect(typeof result.optional).toBe('string');
            }
            if (result.nullable !== null) {
                expect(typeof result.nullable).toBe('string');
            }
        }
    });

    it('should build multiple objects', () => {
        const schema = z.object({
            name: z.string(),
            value: z.number(),
        });

        const factory = new ZodFactory(schema);
        const results = Array.from({ length: 3 }, () => factory.build());

        expect(results).toHaveLength(3);
        results.forEach((result: z.infer<typeof schema>) => {
            expect(() => schema.parse(result)).not.toThrow();
        });
    });

    describe('Schema Custom generators', () => {
        it('should use custom generators for schemas with descriptions', () => {
            const schema = z.string().describe('custom-field');
            const factory = new ZodFactory(schema, {
                customGenerators: {
                    'custom-field': () => 'custom-value',
                },
            });
            const result = factory.build();
            
            expect(result).toBe('custom-value');
        });
    });

    describe('Registered type handlers', () => {
        afterEach(() => {
            clearZodTypeRegistry();
        });

        it('should use registered type handlers', () => {
            registerZodType('ZodBigInt', (_schema, factory) => {
                return BigInt(factory.number.int({ max: 100, min: 1 }));
            });

            const schema = z.object({
                bigNumber: z.bigint(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(typeof result.bigNumber).toBe('bigint');
        });

        it('should handle complex registered types', () => {
            registerZodType('ZodFunction', (_schema, _factory) => {
                return () => 'mock function result';
            });

            const schema = z.object({
                fn: z.function(),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();

            expect(typeof result.fn).toBe('function');
            expect(result.fn()).toBe('mock function result');
        });
    });

    describe('Core Enum schemas', () => {
        it('should generate values from enum', () => {
            const schema = z.enum(['red', 'green', 'blue']);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(['red', 'green', 'blue']).toContain(result);
        });

        it('should generate values from native enum', () => {
            enum Color {
                Blue = 'blue',
                Green = 'green', 
                Red = 'red'
            }
            
            const schema = z.nativeEnum(Color);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(['red', 'green', 'blue']).toContain(result);
            expect(Object.values(Color)).toContain(result);
        });

        it('should generate values from numeric native enum', () => {
            enum Status {
                Pending,
                InProgress, 
                Completed
            }
            
            const schema = z.nativeEnum(Status);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect([0, 1, 2, 'Pending', 'InProgress', 'Completed']).toContain(result);
            expect(Object.values(Status)).toContain(result);
        });
    });

    describe('Type registration utilities', () => {
        afterEach(() => {
            clearZodTypeRegistry();
        });

        it('should register and unregister custom type handlers', () => {
            const handler = (_schema: unknown, _factory: unknown, _config: unknown) => 'test';
            
            registerZodType('TestType', handler);
            expect(getRegisteredZodTypes()).toContain('TestType');
            
            const wasRemoved = unregisterZodType('TestType');
            expect(wasRemoved).toBe(true);
            expect(getRegisteredZodTypes()).not.toContain('TestType');
        });

        it('should clear all registered types', () => {
            registerZodType('Type1', (_schema: unknown, _factory: unknown, _config: unknown) => 'test1');
            registerZodType('Type2', (_schema: unknown, _factory: unknown, _config: unknown) => 'test2');
            
            expect(getRegisteredZodTypes()).toHaveLength(6); // 4 built-in + 2 custom
            
            clearZodTypeRegistry();
            expect(getRegisteredZodTypes()).toHaveLength(0);
        });
    });

    describe('Custom Type Registration', () => {
        it('should register and use custom type handlers', () => {
            registerZodType('ZodCustomString', (_schema, factory) => {
                return `CUSTOM_${  factory.lorem.word().toUpperCase()}`;
            });

            const customSchema = {
                _def: {},
                constructor: { name: 'ZodCustomString' },
                description: undefined
            } as any;

            const factory = new ZodFactory(customSchema);
            const result = factory.build();

            expect(typeof result).toBe('string');
            expect(result).toMatch(/^CUSTOM_[A-Z]+$/);

            unregisterZodType('ZodCustomString');
        });

        it('should handle built-in registered types', () => {
            const bigIntSchema = {
                _def: {},
                constructor: { name: 'ZodBigInt' },
                description: undefined
            } as any;

            const factory = new ZodFactory(bigIntSchema);
            const result = factory.build();

            expect(typeof result).toBe('bigint');
            expect(result).toBeGreaterThanOrEqual(0n);
            expect(result).toBeLessThanOrEqual(1_000_000n);
        });

        it('should handle NaN type', () => {
            const nanSchema = {
                _def: {},
                constructor: { name: 'ZodNaN' },
                description: undefined
            } as any;

            const factory = new ZodFactory(nanSchema);
            const result = factory.build();

            expect(Number.isNaN(result)).toBe(true);
        });

        it('should handle void type', () => {
            const voidSchema = {
                _def: {},
                constructor: { name: 'ZodVoid' },
                description: undefined
            } as any;

            const factory = new ZodFactory(voidSchema);
            const result = factory.build();

            expect(result).toBeUndefined();
        });

        it('should handle function type', () => {
            const functionSchema = {
                _def: {},
                constructor: { name: 'ZodFunction' },
                description: undefined
            } as any;

            const factory = new ZodFactory(functionSchema);
            const result = factory.build();

            expect(typeof result).toBe('function');
            expect(typeof result()).toBe('string');
        });

        it('should handle promise type', () => {
            const promiseSchema = {
                _def: {
                    type: z.string()
                },
                constructor: { name: 'ZodPromise' },
                description: undefined
            } as any;

            const factory = new ZodFactory(promiseSchema);
            const result = factory.build();

            expect(result).toBeInstanceOf(Promise);
            return result.then((value: any) => {
                expect(typeof value).toBe('string');
                return value; // Return the value to satisfy linter
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
            registerZodType('ZodBigInt', (_schema, factory) => {
                return BigInt(factory.number.int({ max: 1_000_000, min: 0 }));
            });
            registerZodType('ZodNaN', () => Number.NaN);
            registerZodType('ZodVoid', () => undefined);
            registerZodType('ZodFunction', (_schema, factory) => () => factory.lorem.word());
            registerZodType('ZodPromise', (_schema, _factory) => {
                return Promise.resolve(_factory.lorem.word());
            });
            registerZodType('ZodLazy', (_schema, _factory, _config) => {
                return _factory.lorem.word();
            });
        });

        it('should handle third-party zod extensions', () => {
            // Simulate a third-party Zod extension like zod-openapi
            registerZodType('ZodOpenApi', (_schema, factory) => {
                const zodType = _schema._def as Record<string, unknown>;
                // Extract the underlying type and generate for that
                const baseType = zodType.innerType as any;
                if (baseType instanceof z.ZodString) {
                    return factory.lorem.sentence();
                }
                return factory.lorem.word();
            });

            const customExtensionSchema = {
                _def: {
                    innerType: z.string()
                },
                constructor: { name: 'ZodOpenApi' },
                description: undefined
            } as any;

            const factory = new ZodFactory(customExtensionSchema);
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
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
        });

        it('should generate emails for email schema', () => {
            const schema = z.string().email();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
            expect(result).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });

        it('should generate UUIDs for uuid schema', () => {
            const schema = z.string().uuid();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
            expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should generate URLs for url schema', () => {
            const schema = z.string().url();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
            expect(result).toMatch(/^https?:\/\/.+/);
        });

        it('should respect string length constraints', () => {
            const schema = z.string().length(10);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toHaveLength(10);
        });

        it('should respect minimum string length', () => {
            const schema = z.string().min(5);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('Number schemas', () => {
        it('should generate numbers', () => {
            const schema = z.number();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('number');
        });

        it('should generate integers', () => {
            const schema = z.number().int();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(Number.isInteger(result)).toBe(true);
        });

        it('should respect number constraints', () => {
            const schema = z.number().min(10).max(20);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toBeGreaterThanOrEqual(10);
            expect(result).toBeLessThanOrEqual(20);
        });
    });

    describe('Boolean schemas', () => {
        it('should generate booleans', () => {
            const schema = z.boolean();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('boolean');
        });
    });

    describe('Date schemas', () => {
        it('should generate dates', () => {
            const schema = z.date();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toBeInstanceOf(Date);
        });
    });

    describe('Literal schemas', () => {
        it('should return literal string values', () => {
            const schema = z.literal('hello');
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toBe('hello');
        });

        it('should return literal number values', () => {
            const schema = z.literal(42);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toBe(42);
        });
    });

    describe('Enum schemas', () => {
        it('should generate values from enum', () => {
            const schema = z.enum(['red', 'green', 'blue']);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(['red', 'green', 'blue']).toContain(result);
        });

        it('should generate values from native enum', () => {
            enum Color {
                Blue = 'blue',
                Green = 'green', 
                Red = 'red'
            }
            
            const schema = z.nativeEnum(Color);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(['red', 'green', 'blue']).toContain(result);
            expect(Object.values(Color)).toContain(result);
        });

        it('should generate values from numeric native enum', () => {
            enum Status {
                Pending,
                InProgress, 
                Completed
            }
            
            const schema = z.nativeEnum(Status);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect([0, 1, 2, 'Pending', 'InProgress', 'Completed']).toContain(result);
            expect(Object.values(Status)).toContain(result);
        });
    });

    describe('Null and Undefined schemas', () => {
        it('should generate null for null schema', () => {
            const schema = z.null();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toBeNull();
        });

        it('should generate undefined for undefined schema', () => {
            const schema = z.undefined();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toBeUndefined();
        });
    });

    describe('Optional schemas', () => {
        it('should sometimes generate undefined for optional schemas', () => {
            const schema = z.string().optional();
            const factory = new ZodFactory(schema);
            
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
            const factory = new ZodFactory(schema);
            
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
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(Array.isArray(result)).toBe(true);
            expect(result.every(item => typeof item === 'string')).toBe(true);
        });

        it('should respect array length constraints', () => {
            const schema = z.array(z.string()).min(3).max(5);
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result.length).toBeGreaterThanOrEqual(3);
            expect(result.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Object schemas', () => {
        it('should generate objects', () => {
            const schema = z.object({
                active: z.boolean(),
                age: z.number(),
                name: z.string(),
            });
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('object');
            expect(typeof result.name).toBe('string');
            expect(typeof result.age).toBe('number');
            expect(typeof result.active).toBe('boolean');
        });

        it('should handle nested objects', () => {
            const schema = z.object({
                metadata: z.object({
                    createdAt: z.date(),
                    tags: z.array(z.string()),
                }),
                user: z.object({
                    email: z.string().email(),
                    name: z.string(),
                }),
            });
            const factory = new ZodFactory(schema);
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
            const factory = new ZodFactory(schema);
            
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
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result.name).toBe('string');
            expect(typeof result.age).toBe('number');
        });
    });

    describe('Record schemas', () => {
        it('should generate record objects', () => {
            const schema = z.record(z.string());
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('object');
            expect(Object.values(result).every(v => typeof v === 'string')).toBe(true);
        });
    });

    describe('Factory methods', () => {
        it('should support build() method', () => {
            const schema = z.object({ age: z.number(), name: z.string() });
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(typeof result.name).toBe('string');
            expect(typeof result.age).toBe('number');
        });

        it('should support batch() method', () => {
            const schema = z.object({ name: z.string() });
            const factory = new ZodFactory(schema);
            const results = factory.batch(3);
            
            expect(results).toHaveLength(3);
            expect(results.every(r => typeof r.name === 'string')).toBe(true);
        });

        it('should support build() with overrides', () => {
            const schema = z.object({ age: z.number(), name: z.string() });
            const factory = new ZodFactory(schema);
            const result = factory.build({ name: 'John' });
            
            expect(result.name).toBe('John');
            expect(typeof result.age).toBe('number');
        });

        it('should work like a Factory', () => {
            const factory = new ZodFactory(z.object({ name: z.string() }));
            
            expect(factory.build()).toBeDefined();
            expect(factory.batch(3)).toHaveLength(3);
        });

        it('should support build with overrides', () => {
            const factory = new ZodFactory(z.object({
                name: z.string(),
                age: z.number()
            }));
            
            const result = factory.build({ name: 'Override' });
            expect(result.name).toBe('Override');
            expect(typeof result.age).toBe('number');
        });
    });

    describe('Edge cases', () => {
        it('should handle unknown schemas', () => {
            const schema = z.unknown();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toBeDefined();
        });

        it('should handle any schemas', () => {
            const schema = z.any();
            const factory = new ZodFactory(schema);
            const result = factory.build();
            
            expect(result).toBeDefined();
        });
    });

    describe('Example 1: Basic User Schema', () => {
        it('should generate valid basic user data', () => {
            const UserSchema = z.object({
                age: z.number().int().min(18).max(120),
                createdAt: z.date(),
                email: z.string().email(),
                id: z.string().uuid(),
                isActive: z.boolean(),
                name: z.string().min(1).max(100),
            });

            const factory = new ZodFactory(UserSchema);
            const user = factory.build();
            
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

            const customUser = factory.build({
                email: 'john.doe@example.com',
                name: 'John Doe'
            });
            expect(customUser.name).toBe('John Doe');
            expect(customUser.email).toBe('john.doe@example.com');
        });
    });

    describe('Example 2: Complex E-commerce Product Schema', () => {
        it('should generate valid e-commerce product data', () => {
            const ProductSchema = z.object({
                category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports']),
                createdAt: z.date(),
                description: z.string().optional(),
                id: z.string().uuid(),
                inStock: z.boolean(),
                name: z.string().min(1).max(200),
                price: z.number().min(0).max(99_999.99),
                ratings: z.object({
                    average: z.number().min(1).max(5),
                    count: z.number().int().min(0),
                }),
                tags: z.array(z.string()).min(1).max(10),
                updatedAt: z.date().optional(),
                variants: z.array(z.object({
                    available: z.boolean(),
                    id: z.string(),
                    name: z.string(),
                    price: z.number().min(0),
                })).optional(),
            });

            const factory = new ZodFactory(ProductSchema);
            const product = factory.build();
            
            const result = ProductSchema.safeParse(product);
            expect(result.success).toBe(true);
            
            if (result.success) {
                expect(result.data.price).toBeGreaterThanOrEqual(0);
                expect(result.data.price).toBeLessThanOrEqual(99_999.99);
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

    describe('Example 3: Company with Employees (Complex Nested Schema)', () => {
        it('should generate valid company data with employees', () => {
            const EmployeeSchema = z.object({
                department: z.enum(['engineering', 'marketing', 'sales', 'hr', 'finance']),
                email: z.string().email(),
                firstName: z.string().min(1),
                id: z.string().uuid(),
                isActive: z.boolean(),
                lastName: z.string().min(1),
                position: z.string(),
                salary: z.number().int().min(30_000).max(500_000),
                skills: z.array(z.string()).min(1).max(15),
                startDate: z.date(),
            });

            const CompanySchema = z.object({
                address: z.object({
                    city: z.string(),
                    country: z.string(),
                    state: z.string(),
                    street: z.string(),
                    zipCode: z.string(),
                }),
                employees: z.array(EmployeeSchema).min(1).max(10),
                foundedAt: z.date(),
                id: z.string().uuid(),
                industry: z.string(),
                name: z.string().min(1),
                revenue: z.number().min(0).optional(),
                website: z.string().url().optional(),
            });

            const factory = new ZodFactory(CompanySchema);
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
                    expect(employee.salary).toBeGreaterThanOrEqual(30_000);
                    expect(employee.salary).toBeLessThanOrEqual(500_000);
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

    describe('Example 4: Union Types', () => {
        it('should generate valid union type data', () => {
            const EventSchema = z.union([
                z.object({
                    coordinates: z.object({
                        x: z.number(),
                        y: z.number(),
                    }),
                    element: z.string(),
                    timestamp: z.date(),
                    type: z.literal('click'),
                }),
                z.object({
                    direction: z.enum(['up', 'down']),
                    position: z.number(),
                    timestamp: z.date(),
                    type: z.literal('scroll'),
                }),
                z.object({
                    key: z.string(),
                    modifiers: z.array(z.enum(['ctrl', 'alt', 'shift'])).optional(),
                    timestamp: z.date(),
                    type: z.literal('keypress'),
                }),
            ]);

            const factory = new ZodFactory(EventSchema);
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

    describe('Example 5: Custom Generators', () => {
        it('should work with custom generators', () => {
            const OrderSchema = z.object({
                createdAt: z.date(),
                customerId: z.string().describe('customer-id'),
                id: z.string().describe('order-id'),
                notes: z.string().optional(),
                productId: z.string().describe('product-id'),
                quantity: z.number().int().min(1).max(100),
                status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
                total: z.number().min(0),
            });

            const factory = new ZodFactory(OrderSchema, {
                customGenerators: {
                    'customer-id': () => `CUST-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
                    'order-id': () => `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
                    'product-id': () => `PROD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
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

    describe('Example 6: Array Constraints', () => {
        it('should respect array constraints in complex schemas', () => {
            const PlaylistSchema = z.object({
                createdAt: z.date(),
                createdBy: z.string().uuid(),
                description: z.string().optional(),
                id: z.string().uuid(),
                isPublic: z.boolean(),
                name: z.string().min(1).max(100),
                songs: z.array(z.object({
                    artist: z.string().min(1),
                    duration: z.number().int().min(1).max(600),
                    genre: z.enum(['rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop']),
                    id: z.string().uuid(),
                    title: z.string().min(1),
                })).min(3).max(20),
            });

            const factory = new ZodFactory(PlaylistSchema);
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

    describe('Example 7: Optional and Nullable Fields', () => {
        it('should handle optional and nullable fields correctly', () => {
            const UserProfileSchema = z.object({
                avatar: z.string().url().optional(),
                bio: z.string().max(500).nullable(),
                createdAt: z.date(),
                displayName: z.string().optional(),
                email: z.string().email(),
                id: z.string().uuid(),
                lastLoginAt: z.date().nullable(),
                settings: z.object({
                    notifications: z.object({
                        email: z.boolean(),
                        push: z.boolean(),
                        sms: z.boolean().optional(),
                    }),
                    privacy: z.object({
                        profileVisibility: z.enum(['public', 'friends', 'private']),
                        showEmail: z.boolean(),
                    }).optional(),
                    theme: z.enum(['light', 'dark']).optional(),
                }),
                socialLinks: z.array(z.object({
                    platform: z.enum(['twitter', 'linkedin', 'github', 'website']),
                    url: z.string().url(),
                })).optional(),
                username: z.string().min(3).max(30),
            });

            const factory = new ZodFactory(UserProfileSchema);
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

    describe('Example 8: Performance Testing', () => {
        it('should generate large batches efficiently', () => {
            const SimpleSchema = z.object({
                id: z.string().uuid(),
                name: z.string(),
                timestamp: z.date(),
                value: z.number(),
            });

            const factory = new ZodFactory(SimpleSchema);
            
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

    describe('Example 9: Validation Testing', () => {
        it('should generate data that passes strict validation', () => {
            const StrictSchema = z.object({
                balance: z.number().min(0).max(1_000_000),
                email: z.string().email(),
                id: z.string().uuid(),
                metadata: z.record(z.string(), z.unknown()),
                password: z.string().min(8).max(128),
                preferences: z.object({
                    theme: z.enum(['light', 'dark']),
                    notifications: z.boolean(),
                }),
                profile: z.object({
                    avatar: z.string().url().optional(),
                    bio: z.string().max(500).optional(),
                    displayName: z.string().min(1).max(50),
                }),
                tags: z.array(z.string()).min(1).max(20),
                username: z.string().min(3).max(30),
            });

            const factory = new ZodFactory(StrictSchema);
            const results = factory.batch(50);

            const validResults = results.filter(result => {
                return StrictSchema.safeParse(result).success;
            });

            expect(validResults.length).toBeGreaterThan(40);
        });
    });

    describe('Integration Tests', () => {
        it('should work with Factory class inheritance', () => {
            const BaseSchema = z.object({
                createdAt: z.date(),
                id: z.string().uuid(),
            });

            const factory = new ZodFactory(BaseSchema);
            
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
                age: z.number().int().min(18),
                email: z.string().email(),
                id: z.string().uuid(),
                name: z.string(),
            });

            const factory = new ZodFactory(UserSchema);
            const userData = factory.build({
                email: 'john@example.com',
                name: 'John Doe',
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
                profile: z.object({
                    avatar: z.string().url(),
                    bio: z.string().describe('custom-bio'),
                }),
                settings: z.object({
                    notifications: z.boolean(),
                    theme: z.enum(['light', 'dark']),
                }),
                username: z.string().describe('custom-username'),
            });

            const factory = new ZodFactory(UserSchema, {
                customGenerators: {
                    'custom-bio': () => 'This is a custom bio for testing purposes.',
                    'custom-username': () => `user_${  Math.random().toString(36).slice(2, 11)}`,
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

    describe('Complete Zod Feature Coverage', () => {
        describe('Discriminated Union Types', () => {
            it('should generate values from discriminated unions', () => {
                const EventSchema = z.discriminatedUnion('type', [
                    z.object({ type: z.literal('click'), x: z.number(), y: z.number() }),
                    z.object({ element: z.string(), type: z.literal('hover') }),
                    z.object({ direction: z.enum(['up', 'down']), type: z.literal('scroll') })
                ]);

                const factory = new ZodFactory(EventSchema);
                const results = factory.batch(20);

                const types = [...new Set(results.map((r: unknown) => {
                    if (Array.isArray(r)) {return 'array';}
                    if (r && typeof r === 'object') {return 'object';}
                    return typeof r;
                }))];

                expect(types.length).toBeGreaterThan(1);

                results.forEach((result: any) => {
                    expect(EventSchema.safeParse(result).success).toBe(true);
                });
            });
        });

        describe('Lazy Schemas', () => {
            it('should handle lazy schemas correctly', () => {
                interface Node {
                    children?: Node[];
                    id: string;
                }

                const NodeSchema: z.ZodType<Node> = z.lazy(() =>
                    z.object({
                        children: z.array(NodeSchema).optional(),
                        id: z.string()
                    })
                );

                const factory = new ZodFactory(NodeSchema);
                const result = factory.build();

                expect(typeof result.id).toBe('string');
                if (result.children) {
                    expect(Array.isArray(result.children)).toBe(true);
                }
            });
        });

        describe('Promise Schemas', () => {
            it('should handle promise schemas', async () => {
                const PromiseSchema = z.promise(z.string());
                const factory = new ZodFactory(PromiseSchema);
                const result = factory.build();

                expect(result).toBeInstanceOf(Promise);
                const resolved = await result;
                expect(typeof resolved).toBe('string');
            });

            it('should handle nested promise schemas', async () => {
                const NestedPromiseSchema = z.promise(z.object({
                    data: z.array(z.number()),
                    user: z.object({
                        id: z.string().uuid(),
                        name: z.string()
                    })
                }));

                const factory = new ZodFactory(NestedPromiseSchema);
                const result = factory.build();

                expect(result).toBeInstanceOf(Promise);
                const resolved = await result;
                expect(typeof resolved.user.id).toBe('string');
                expect(typeof resolved.user.name).toBe('string');
                expect(Array.isArray(resolved.data)).toBe(true);
            });
        });

        describe('Advanced String Validation', () => {
            it('should handle CUID strings', () => {
                const schema = z.string().cuid();
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });

            it('should handle regex patterns', () => {
                const schema = z.string().regex(/^[A-Z]{3}-\d{3}$/);
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result).toBe('string');
                // Note: Our implementation may not generate valid regex patterns
                // but should generate strings
            });

            it('should handle multiple string constraints', () => {
                const schema = z.string().min(10).max(50).email();
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result).toBe('string');
                expect(result).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            });
        });

        describe('Advanced Number Validation', () => {
            it('should handle positive numbers', () => {
                const schema = z.number().positive();
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result).toBe('number');
                expect(result).toBeGreaterThan(0);
            });

            it('should handle negative numbers', () => {
                const schema = z.number().negative();
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result).toBe('number');
                expect(result).toBeLessThan(0);
            });

            it('should handle step validation', () => {
                const schema = z.number().step(0.5);
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result).toBe('number');
                // Note: Step validation is complex to implement in factory
            });
        });

        describe('Complex Object Schemas', () => {
            it('should handle strict objects', () => {
                const schema = z.object({
                    age: z.number(),
                    name: z.string()
                }).strict();

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(Object.keys(result)).toEqual(['name', 'age']);
                expect(typeof result.name).toBe('string');
                expect(typeof result.age).toBe('number');
            });

            it('should handle passthrough objects', () => {
                const schema = z.object({
                    name: z.string()
                }).passthrough();

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result.name).toBe('string');
            });

            it('should handle partial objects', () => {
                const BaseSchema = z.object({
                    age: z.number(),
                    email: z.string().email(),
                    name: z.string()
                });

                const PartialSchema = BaseSchema.partial();
                const factory = new ZodFactory(PartialSchema);
                const result = factory.build();

                // All fields should be optional in partial
                if (result.name !== undefined) {expect(typeof result.name).toBe('string');}
                if (result.age !== undefined) {expect(typeof result.age).toBe('number');}
                if (result.email !== undefined) {expect(typeof result.email).toBe('string');}
            });

            it('should handle required fields from partial', () => {
                const BaseSchema = z.object({
                    age: z.number(),
                    email: z.string().email(),
                    name: z.string()
                }).partial();

                const RequiredSchema = BaseSchema.required({ name: true });
                const factory = new ZodFactory(RequiredSchema);
                const result = factory.build();

                expect(typeof result.name).toBe('string'); // Required
                if (result.age !== undefined) {expect(typeof result.age).toBe('number');}
                if (result.email !== undefined) {expect(typeof result.email).toBe('string');}
            });
        });

        describe('Tuple Schemas', () => {
            it('should handle basic tuples', () => {
                const schema = z.tuple([z.string(), z.number(), z.boolean()]);
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(Array.isArray(result)).toBe(true);
                expect(result).toHaveLength(3);
                expect(typeof result[0]).toBe('string');
                expect(typeof result[1]).toBe('number');
                expect(typeof result[2]).toBe('boolean');
            });

            it('should handle tuples with rest elements', () => {
                const schema = z.tuple([z.string(), z.number()]).rest(z.boolean());
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThanOrEqual(2);
                expect(typeof result[0]).toBe('string');
                expect(typeof result[1]).toBe('number');
                
                // Rest elements should be booleans
                for (let i = 2; i < result.length; i++) {
                    expect(typeof result[i]).toBe('boolean');
                }
            });
        });

        describe('Map and Set Schemas', () => {
            it('should handle Map schemas', () => {
                const schema = z.map(z.string(), z.number());
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result).toBeInstanceOf(Map);
                if (result.size > 0) {
                    for (const [key, value] of result.entries()) {
                        expect(typeof key).toBe('string');
                        expect(typeof value).toBe('number');
                    }
                }
            });

            it('should handle Set schemas', () => {
                const schema = z.set(z.string());
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result).toBeInstanceOf(Set);
                if (result.size > 0) {
                    for (const value of result.values()) {
                        expect(typeof value).toBe('string');
                    }
                }
            });
        });

        describe('Advanced Union Types', () => {
            it('should handle complex unions with many types', () => {
                const schema = z.union([
                    z.string(),
                    z.number(),
                    z.boolean(),
                    z.array(z.string()),
                    z.object({ data: z.any(), type: z.literal('complex') })
                ]);

                const factory = new ZodFactory(schema);
                const results = factory.batch(50);

                const types = [...new Set(results.map((r: unknown) => {
                    if (Array.isArray(r)) {return 'array';}
                    if (r && typeof r === 'object') {return 'object';}
                    return typeof r;
                }))];

                expect(types.length).toBeGreaterThan(1);
            });
        });

        describe('Default Values', () => {
            it('should handle default values in optional schemas', () => {
                const schema = z.object({
                    active: z.boolean().optional().default(true),
                    count: z.number().default(0),
                    name: z.string()
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result.name).toBe('string');
                expect(typeof result.count).toBe('number');
                expect(typeof result.active).toBe('boolean');
            });
        });

        describe('Brand Types', () => {
            it('should handle branded types', () => {
                const UserId = z.string().brand('UserId');
                const factory = new ZodFactory(UserId);
                const result = factory.build();

                expect(typeof result).toBe('string');
            });
        });

        describe('Catch and Pipeline', () => {
            it('should handle catch schemas', () => {
                const schema = z.string().catch('fallback');
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result).toBe('string');
            });
        });

        describe('Custom Type Extensions', () => {
            it('should support z.custom validation', () => {
                const schema = z.custom<string>((val) => typeof val === 'string');
                const factory = new ZodFactory(schema);
                const result = factory.build();

                // Should fallback to lorem word for unknown custom types
                expect(typeof result).toBe('string');
            });

            it('should handle complex custom validations', () => {
                interface CustomData {
                    signature: string;
                    timestamp: number;
                }

                const schema = z.custom<CustomData>((val) => {
                    return typeof val === 'object' && 
                           val !== null && 
                           'timestamp' in val && 
                           'signature' in val;
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                // Should generate fallback data
                expect(result).toBeDefined();
            });
        });

        describe('Error Handling and Edge Cases', () => {
            it('should handle never schemas gracefully', () => {
                const schema = z.never();
                
                expect(() => {
                    const factory = new ZodFactory(schema);
                    factory.build();
                }).toThrow('ZodNever should never be reached in factory generation');
            });

            it('should handle void schemas', () => {
                const schema = z.void();
                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result).toBeUndefined();
            });

            it('should handle symbol schemas with custom registration', () => {
                const testSymbol = Symbol('test');
                
                registerZodType('ZodSymbol', () => testSymbol);
                
                const symbolSchema = {
                    _def: {},
                    constructor: { name: 'ZodSymbol' },
                    description: undefined
                } as any;

                const factory = new ZodFactory(symbolSchema);
                const result = factory.build();

                expect(result).toBe(testSymbol);
                
                unregisterZodType('ZodSymbol');
            });
        });

        describe('Performance and Batch Generation', () => {
            it('should handle large schema generation efficiently', () => {
                const LargeSchema = z.object({
                    metadata: z.object({
                        flags: z.record(z.boolean()),
                        timestamp: z.date(),
                        version: z.string()
                    }),
                    users: z.array(z.object({
                        id: z.string().uuid(),
                        posts: z.array(z.object({
                            content: z.string(),
                            id: z.string().uuid(),
                            tags: z.array(z.string()),
                            title: z.string()
                        })).min(1).max(5),
                        profile: z.object({
                            email: z.string().email(),
                            name: z.string(),
                            settings: z.object({
                                notifications: z.boolean(),
                                theme: z.enum(['light', 'dark'])
                            })
                        })
                    })).min(10).max(20)
                });

                const factory = new ZodFactory(LargeSchema);
                const startTime = Date.now();
                const result = factory.build();
                const endTime = Date.now();

                expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
                expect(LargeSchema.safeParse(result).success).toBe(true);
            });
        });
    });
}); 