import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createFactoryFromZod } from './zod-factory.js';

describe('Integration Tests', () => {
    describe('Zod Factory Integration', () => {
        it('should generate data that matches Zod schema constraints', () => {
            const UserSchema = z.object({
                age: z.number().int().min(18).max(65),
                email: z.string().email(),
                id: z.string().uuid(),
                isActive: z.boolean(),
                name: z.string().min(1),
                tags: z.array(z.string()).min(1).max(3),
            });

            const UserFactory = createFactoryFromZod(UserSchema);
            const user = UserFactory.build();

            // Validate that generated data matches schema
            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(true);

            // Additional specific validations
            expect(typeof user.id).toBe('string');
            expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(typeof user.name).toBe('string');
            expect(user.name.length).toBeGreaterThan(0);
            expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            expect(typeof user.age).toBe('number');
            expect(Number.isInteger(user.age)).toBe(true);
            expect(user.age).toBeGreaterThanOrEqual(18);
            expect(user.age).toBeLessThanOrEqual(65);
            expect(typeof user.isActive).toBe('boolean');
            expect(Array.isArray(user.tags)).toBe(true);
            expect(user.tags.length).toBeGreaterThanOrEqual(1);
            expect(user.tags.length).toBeLessThanOrEqual(3);
        });

        it('should support complex nested schemas', () => {
            const AddressSchema = z.object({
                city: z.string(),
                street: z.string(),
                zipCode: z.string().length(5),
            });

            const UserSchema = z.object({
                address: AddressSchema,
                age: z.number().int().min(18).max(100),
                email: z.string().email(),
                id: z.string().uuid(),
                isActive: z.boolean(),
                metadata: z.record(z.string()).optional(),
                name: z.string().min(1),
                tags: z.array(z.string()).min(1).max(3),
            });

            const UserFactory = createFactoryFromZod(UserSchema);
            const user = UserFactory.build();

            // Validate against schema
            const result = UserSchema.safeParse(user);
            expect(result.success).toBe(true);

            // Validate structure
            expect(typeof user.address.street).toBe('string');
            expect(typeof user.address.city).toBe('string');
            expect(typeof user.address.zipCode).toBe('string');
            expect(user.address.zipCode.length).toBe(5);
        });

        it('should support factory methods with overrides', () => {
            const ProductSchema = z.object({
                category: z.enum(['electronics', 'clothing', 'books']),
                id: z.string().uuid(),
                inStock: z.boolean(),
                name: z.string(),
                price: z.number().positive(),
            });

            const ProductFactory = createFactoryFromZod(ProductSchema);

            // Test build with overrides
            const product = ProductFactory.build({
                name: 'Custom Product',
                price: 99.99,
            });

            expect(product.name).toBe('Custom Product');
            expect(product.price).toBe(99.99);
            expect(typeof product.id).toBe('string');
            expect(['electronics', 'clothing', 'books']).toContain(product.category);
            expect(typeof product.inStock).toBe('boolean');

            // Validate against schema
            const result = ProductSchema.safeParse(product);
            expect(result.success).toBe(true);

            // Test batch generation
            const products = ProductFactory.batch(3);
            expect(products).toHaveLength(3);
            products.forEach((p) => {
                const batchResult = ProductSchema.safeParse(p);
                expect(batchResult.success).toBe(true);
            });
        });

        it('should handle union types correctly', () => {
            const EventSchema = z.union([
                z.object({
                    element: z.string(),
                    timestamp: z.date(),
                    type: z.literal('click'),
                }),
                z.object({
                    position: z.number(),
                    timestamp: z.date(),
                    type: z.literal('scroll'),
                }),
                z.object({
                    key: z.string(),
                    timestamp: z.date(),
                    type: z.literal('keypress'),
                }),
            ]);

            const EventFactory = createFactoryFromZod(EventSchema);
            const events = EventFactory.batch(10);

            events.forEach((event) => {
                const result = EventSchema.safeParse(event);
                expect(result.success).toBe(true);
                
                expect(['click', 'scroll', 'keypress']).toContain(event.type);
                expect(event.timestamp).toBeInstanceOf(Date);
            });
        });

        it('should work with custom generators', () => {
            const OrderSchema = z.object({
                amount: z.number().positive(),
                customerId: z.string().describe('customerId'),
                id: z.string().describe('orderId'),
                status: z.enum(['pending', 'completed', 'cancelled']),
            });

            const OrderFactory = createFactoryFromZod(OrderSchema, {
                customGenerators: {
                    customerId: () => `CUST-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
                    orderId: () => `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                },
            });

            const order = OrderFactory.build();

            expect(order.id).toMatch(/^ORD-\d+-[a-z0-9]{5}$/);
            expect(order.customerId).toMatch(/^CUST-[A-Z0-9]{8}$/);
            expect(typeof order.amount).toBe('number');
            expect(order.amount).toBeGreaterThan(0);
            expect(['pending', 'completed', 'cancelled']).toContain(order.status);

            // Validate against schema (custom generators should still produce valid data)
            const result = OrderSchema.safeParse(order);
            expect(result.success).toBe(true);
        });

        it('should handle optional and nullable fields', () => {
            const ConfigSchema = z.object({
                apiKey: z.string().nullable(),
                appName: z.string(),
                debug: z.boolean().optional(),
                features: z.array(z.string()).optional(),
                version: z.string(),
            });

            const ConfigFactory = createFactoryFromZod(ConfigSchema);
            const configs = ConfigFactory.batch(10);

            configs.forEach((config) => {
                const result = ConfigSchema.safeParse(config);
                expect(result.success).toBe(true);
                
                expect(typeof config.appName).toBe('string');
                expect(typeof config.version).toBe('string');
                // debug can be boolean or undefined
                if (config.debug !== undefined) {
                    expect(typeof config.debug).toBe('boolean');
                }
                // apiKey can be string or null
                if (config.apiKey !== null) {
                    expect(typeof config.apiKey).toBe('string');
                }
                // features can be array or undefined
                if (config.features !== undefined) {
                    expect(Array.isArray(config.features)).toBe(true);
                }
            });
        });
    });
}); 