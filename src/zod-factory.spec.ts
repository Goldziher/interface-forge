import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createFactoryFromZod } from './zod-factory.js';

describe('createFactoryFromZod', () => {
    describe('basic types', () => {
        it('should generate string values', () => {
            const schema = z.string();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('should generate number values', () => {
            const schema = z.number();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(1000);
        });

        it('should generate boolean values', () => {
            const schema = z.boolean();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('boolean');
        });

        it('should generate date values', () => {
            const schema = z.date();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getTime()).toBeGreaterThan(new Date('2020-01-01').getTime());
            expect(result.getTime()).toBeLessThan(new Date('2030-12-31').getTime());
        });
    });

    describe('string constraints', () => {
        it('should respect string length constraints', () => {
            const schema = z.string().min(10).max(20);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result.length).toBeGreaterThanOrEqual(10);
            expect(result.length).toBeLessThanOrEqual(20);
        });

        it('should generate email strings', () => {
            const schema = z.string().email();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });

        it('should generate URL strings', () => {
            const schema = z.string().url();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toMatch(/^https?:\/\/.+/);
        });

        it('should generate UUID strings', () => {
            const schema = z.string().uuid();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });

    describe('number constraints', () => {
        it('should respect number min/max constraints', () => {
            const schema = z.number().min(5).max(15);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeGreaterThanOrEqual(5);
            expect(result).toBeLessThanOrEqual(15);
        });

        it('should generate integers when specified', () => {
            const schema = z.number().int().min(1).max(100);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(Number.isInteger(result)).toBe(true);
            expect(result).toBeGreaterThanOrEqual(1);
            expect(result).toBeLessThanOrEqual(100);
        });
    });

    describe('complex types', () => {
        it('should generate objects with nested properties', () => {
            const schema = z.object({
                age: z.number().int().min(0).max(120),
                createdAt: z.date(),
                email: z.string().email(),
                id: z.string().uuid(),
                isActive: z.boolean(),
                name: z.string().min(1),
            });
            
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result.id).toBe('string');
            expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(typeof result.name).toBe('string');
            expect(result.name.length).toBeGreaterThan(0);
            expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            expect(typeof result.age).toBe('number');
            expect(Number.isInteger(result.age)).toBe(true);
            expect(result.age).toBeGreaterThanOrEqual(0);
            expect(result.age).toBeLessThanOrEqual(120);
            expect(typeof result.isActive).toBe('boolean');
            expect(result.createdAt).toBeInstanceOf(Date);
        });

        it('should generate arrays with correct element types', () => {
            const schema = z.array(z.string()).min(2).max(5);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThanOrEqual(2);
            expect(result.length).toBeLessThanOrEqual(5);
            result.forEach((item: string) => {
                expect(typeof item).toBe('string');
            });
        });

        it('should handle nested objects and arrays', () => {
            const schema = z.object({
                children: z.array(z.object({
                    id: z.number(),
                    name: z.string(),
                })).optional(),
                metadata: z.record(z.unknown()).optional(),
                name: z.string(),
                tags: z.array(z.string()),
            });
            
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result.name).toBe('string');
            expect(Array.isArray(result.tags)).toBe(true);
            result.tags.forEach((tag: string) => {
                expect(typeof tag).toBe('string');
            });
            
            if (result.children) {
                expect(Array.isArray(result.children)).toBe(true);
                result.children.forEach((child: { id: number; name: string }) => {
                    expect(typeof child.id).toBe('number');
                    expect(typeof child.name).toBe('string');
                });
            }
        });
    });

    describe('union and intersection types', () => {
        it('should handle union types', () => {
            const schema = z.union([z.string(), z.number(), z.boolean()]);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(['string', 'number', 'boolean']).toContain(typeof result);
        });

        it('should handle intersection types', () => {
            const baseSchema = z.object({ id: z.number() });
            const extendedSchema = z.object({ name: z.string() });
            const schema = z.intersection(baseSchema, extendedSchema);
            
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result.id).toBe('number');
            expect(typeof result.name).toBe('string');
        });
    });

    describe('optional and nullable types', () => {
        it('should handle optional fields', () => {
            const schema = z.object({
                optional: z.string().optional(),
                required: z.string(),
            });
            
            const factory = createFactoryFromZod(schema);
            const results = Array.from({ length: 10 }, () => factory.build());
            
            // All should have required field
            results.forEach(result => {
                expect(typeof result.required).toBe('string');
            });
            
            // Some should have optional field undefined
            const hasUndefined = results.some(result => result.optional === undefined);
            const hasDefined = results.some(result => typeof result.optional === 'string');
            expect(hasUndefined || hasDefined).toBe(true);
        });

        it('should handle nullable fields', () => {
            const schema = z.object({
                nullable: z.string().nullable(),
                required: z.string(),
            });
            
            const factory = createFactoryFromZod(schema);
            const results = Array.from({ length: 10 }, () => factory.build());
            
            // All should have required field
            results.forEach(result => {
                expect(typeof result.required).toBe('string');
            });
            
            // Some should have nullable field as null
            const hasNull = results.some(result => result.nullable === null);
            const hasString = results.some(result => typeof result.nullable === 'string');
            expect(hasNull || hasString).toBe(true);
        });
    });

    describe('enum and literal types', () => {
        it('should handle enum types', () => {
            const schema = z.enum(['red', 'green', 'blue']);
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(['red', 'green', 'blue']).toContain(result);
        });

        it('should handle literal types', () => {
            const schema = z.literal('constant');
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBe('constant');
        });
    });

    describe('record types', () => {
        it('should generate record types', () => {
            const schema = z.record(z.string());
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
            expect(Object.keys(result).length).toBeGreaterThan(0);
            Object.values(result).forEach(value => {
                expect(typeof value).toBe('string');
            });
        });
    });

    describe('factory methods', () => {
        it('should support build method', () => {
            const schema = z.object({
                age: z.number(),
                name: z.string(),
            });
            
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(typeof result.name).toBe('string');
            expect(typeof result.age).toBe('number');
        });

        it('should support build with overrides', () => {
            const schema = z.object({
                age: z.number(),
                name: z.string(),
            });
            
            const factory = createFactoryFromZod(schema);
            const result = factory.build({ name: 'Custom Name' });
            
            expect(result.name).toBe('Custom Name');
            expect(typeof result.age).toBe('number');
        });

        it('should support batch method', () => {
            const schema = z.object({
                age: z.number(),
                name: z.string(),
            });
            
            const factory = createFactoryFromZod(schema);
            const results = factory.batch(5);
            
            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(typeof result.name).toBe('string');
                expect(typeof result.age).toBe('number');
            });
        });
    });

    describe('custom generators', () => {
        it('should use custom generators when provided', () => {
            const schema = z.string().describe('customField');
            const factory = createFactoryFromZod(schema, {
                customGenerators: {
                    customField: () => 'custom-value',
                },
            });
            
            const result = factory.build();
            expect(result).toBe('custom-value');
        });
    });

    describe('edge cases', () => {
        it('should handle null type', () => {
            const schema = z.null();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeNull();
        });

        it('should handle undefined type', () => {
            const schema = z.undefined();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            expect(result).toBeUndefined();
        });

        it('should handle any type', () => {
            const schema = z.any();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            // Should generate some value (faker's json method)
            expect(result).toBeDefined();
        });

        it('should handle unknown type', () => {
            const schema = z.unknown();
            const factory = createFactoryFromZod(schema);
            const result = factory.build();
            
            // Should generate some value (faker's json method)
            expect(result).toBeDefined();
        });
    });
}); 