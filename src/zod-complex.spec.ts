import { z } from 'zod/v4';
import { ZodFactory } from './zod';

describe('ZodFactory', () => {
    describe('complex types', () => {
        describe('objects', () => {
            it('should generate nested objects', () => {
                const schema = z.object({
                    user: z.object({
                        email: z.email(),
                        name: z.string(),
                        profile: z.object({
                            age: z.number().int().min(0).max(120),
                            bio: z.string(),
                        }),
                    }),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.user).toBeDefined();
                expect(typeof result.user.name).toBe('string');
                expect(result.user.email).toMatch(/@/);
                expect(result.user.profile).toBeDefined();
                expect(typeof result.user.profile.bio).toBe('string');
                expect(result.user.profile.age).toBeGreaterThanOrEqual(0);
                expect(result.user.profile.age).toBeLessThanOrEqual(120);
            });

            it('should respect maxDepth option', () => {
                const schema = z.object({
                    level1: z.object({
                        level2: z.object({
                            level3: z.object({
                                level4: z
                                    .object({
                                        level5: z
                                            .object({
                                                value: z.string(),
                                            })
                                            .optional(),
                                    })
                                    .optional(),
                            }),
                        }),
                    }),
                });

                const factory = new ZodFactory(schema, { maxDepth: 3 });
                const result = factory.build();

                expect(result.level1).toBeDefined();
                expect(result.level1.level2).toBeDefined();
                expect(result.level1.level2.level3).toBeDefined();
                // Level 4 should be empty due to depth limit (maxDepth=3 means we stop at depth 3)
                expect(Object.keys(result.level1.level2.level3.level4 ?? {}).length).toBe(0);
            });
        });

        describe('arrays', () => {
            it('should generate arrays of primitives', () => {
                const schema = z.object({
                    tags: z.array(z.string()),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(Array.isArray(result.tags)).toBe(true);
                result.tags.forEach((tag) => {
                    expect(typeof tag).toBe('string');
                });
            });

            it('should generate arrays with min length', () => {
                const schema = z.object({
                    items: z.array(z.number()).min(3),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.items.length).toBeGreaterThanOrEqual(3);
                });
            });

            it('should generate arrays with max length', () => {
                const schema = z.object({
                    items: z.array(z.string()).max(5),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.items.length).toBeLessThanOrEqual(5);
                });
            });

            it('should generate arrays with exact length', () => {
                const schema = z.object({
                    coordinates: z.array(z.number()).length(2),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.coordinates.length).toBe(2);
                });
            });

            it('should generate non-empty arrays', () => {
                const schema = z.object({
                    items: z.array(z.string()).nonempty(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.items.length).toBeGreaterThan(0);
                });
            });

            it('should generate arrays of objects', () => {
                const schema = z.object({
                    users: z.array(
                        z.object({
                            active: z.boolean(),
                            id: z.uuid(),
                            name: z.string(),
                        }),
                    ),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(Array.isArray(result.users)).toBe(true);
                result.users.forEach((user) => {
                    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                    expect(typeof user.name).toBe('string');
                    expect(typeof user.active).toBe('boolean');
                });
            });
        });

        describe('tuples', () => {
            it('should generate fixed tuples', () => {
                const schema = z.object({
                    coordinate: z.tuple([z.number(), z.number()]),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(Array.isArray(result.coordinate)).toBe(true);
                expect(result.coordinate.length).toBe(2);
                expect(typeof result.coordinate[0]).toBe('number');
                expect(typeof result.coordinate[1]).toBe('number');
            });

            it('should generate tuples with different types', () => {
                const schema = z.object({
                    entry: z.tuple([z.string(), z.number(), z.boolean()]),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.entry.length).toBe(3);
                expect(typeof result.entry[0]).toBe('string');
                expect(typeof result.entry[1]).toBe('number');
                expect(typeof result.entry[2]).toBe('boolean');
            });

            it('should generate tuples with rest elements', () => {
                const schema = z.object({
                    data: z.tuple([z.string(), z.number()]).rest(z.boolean()),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.data.length).toBeGreaterThanOrEqual(2);
                expect(typeof result.data[0]).toBe('string');
                expect(typeof result.data[1]).toBe('number');
                // Rest elements should be booleans
                for (let i = 2; i < result.data.length; i++) {
                    expect(typeof result.data[i]).toBe('boolean');
                }
            });
        });

        describe('records', () => {
            it('should generate records with string keys', () => {
                const schema = z.object({
                    scores: z.record(z.string(), z.number()),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result.scores).toBe('object');
                Object.entries(result.scores).forEach(([key, value]) => {
                    expect(typeof key).toBe('string');
                    expect(typeof value).toBe('number');
                });
            });

            it('should generate records with specific key types', () => {
                const schema = z.object({
                    data: z.record(z.string().regex(/^key_/), z.boolean()),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                Object.entries(result.data).forEach(([key, value]) => {
                    expect(typeof key).toBe('string');
                    expect(typeof value).toBe('boolean');
                });
            });
        });

        describe('maps', () => {
            it('should generate Map objects', () => {
                const schema = z.object({
                    cache: z.map(z.string(), z.number()),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.cache).toBeInstanceOf(Map);
                result.cache.forEach((value, key) => {
                    expect(typeof key).toBe('string');
                    expect(typeof value).toBe('number');
                });
            });
        });

        describe('sets', () => {
            it('should generate Set objects', () => {
                const schema = z.object({
                    uniqueTags: z.set(z.string()),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.uniqueTags).toBeInstanceOf(Set);
                result.uniqueTags.forEach((value) => {
                    expect(typeof value).toBe('string');
                });
            });
        });

        describe('enums', () => {
            it('should generate native enum values', () => {
                enum Status {
                    Active = 'ACTIVE',
                    Inactive = 'INACTIVE',
                    Pending = 'PENDING',
                }

                const schema = z.object({
                    status: z.enum(Status),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(30);

                const statusCounts = { ACTIVE: 0, INACTIVE: 0, PENDING: 0 };
                results.forEach((result) => {
                    expect(Object.values(Status)).toContain(result.status);
                    statusCounts[result.status as keyof typeof statusCounts]++;
                });

                // Check that all enum values are generated
                expect(statusCounts.ACTIVE).toBeGreaterThan(0);
                expect(statusCounts.INACTIVE).toBeGreaterThan(0);
                expect(statusCounts.PENDING).toBeGreaterThan(0);
            });

            it('should generate numeric enum values', () => {
                enum Priority {
                    High = 2,
                    Low = 0,
                    Medium = 1,
                }

                const schema = z.object({
                    priority: z.enum(Priority),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(30);

                results.forEach((result) => {
                    expect([0, 1, 2]).toContain(result.priority);
                });
            });

            it('should generate Zod enum values', () => {
                const schema = z.object({
                    role: z.enum(['admin', 'user', 'guest']),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(30);

                const roleCounts = { admin: 0, guest: 0, user: 0 };
                results.forEach((result) => {
                    expect(['admin', 'user', 'guest']).toContain(result.role);
                    roleCounts[result.role]++;
                });

                expect(roleCounts.admin).toBeGreaterThan(0);
                expect(roleCounts.user).toBeGreaterThan(0);
                expect(roleCounts.guest).toBeGreaterThan(0);
            });
        });

        describe('unions', () => {
            it('should generate values from union types', () => {
                const schema = z.object({
                    value: z.union([z.string(), z.number(), z.boolean()]),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(30);

                const typeCounts = { boolean: 0, number: 0, string: 0 };
                results.forEach((result) => {
                    const type = typeof result.value;
                    expect(['string', 'number', 'boolean']).toContain(type);
                    typeCounts[type as keyof typeof typeCounts]++;
                });

                // Check that all types are generated
                expect(typeCounts.string).toBeGreaterThan(0);
                expect(typeCounts.number).toBeGreaterThan(0);
                expect(typeCounts.boolean).toBeGreaterThan(0);
            });

            it('should generate values from discriminated unions', () => {
                const schema = z.object({
                    shape: z.discriminatedUnion('type', [
                        z.object({
                            radius: z.number(),
                            type: z.literal('circle'),
                        }),
                        z.object({
                            side: z.number(),
                            type: z.literal('square'),
                        }),
                        z.object({
                            height: z.number(),
                            type: z.literal('rectangle'),
                            width: z.number(),
                        }),
                    ]),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(30);

                const shapeCounts = { circle: 0, rectangle: 0, square: 0 };
                results.forEach((result) => {
                    expect(['circle', 'square', 'rectangle']).toContain(result.shape.type);
                    shapeCounts[result.shape.type]++;

                    switch (result.shape.type) {
                        case 'circle': {
                            expect(typeof result.shape.radius).toBe('number');
                            break;
                        }
                        case 'rectangle': {
                            expect(typeof result.shape.width).toBe('number');
                            expect(typeof result.shape.height).toBe('number');
                            break;
                        }
                        case 'square': {
                            expect(typeof result.shape.side).toBe('number');
                            break;
                        }
                    }
                });

                expect(shapeCounts.circle).toBeGreaterThan(0);
                expect(shapeCounts.square).toBeGreaterThan(0);
                expect(shapeCounts.rectangle).toBeGreaterThan(0);
            });
        });

        describe('intersections', () => {
            it('should generate values from intersection types', () => {
                const baseSchema = z.object({ id: z.uuid() });
                const extendedSchema = z.object({
                    active: z.boolean(),
                    name: z.string(),
                });

                const schema = z.object({
                    user: z.intersection(baseSchema, extendedSchema),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                expect(typeof result.user.name).toBe('string');
                expect(typeof result.user.active).toBe('boolean');
            });
        });
    });

    describe('modifiers', () => {
        describe('optional', () => {
            it('should generate optional values', () => {
                const schema = z.object({
                    name: z.string(),
                    nickname: z.string().optional(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                const withNickname = results.filter((r) => r.nickname !== undefined);
                const withoutNickname = results.filter((r) => r.nickname === undefined);

                expect(withNickname.length).toBeGreaterThan(0);
                expect(withoutNickname.length).toBeGreaterThan(0);

                withNickname.forEach((result) => {
                    expect(typeof result.nickname).toBe('string');
                });
            });
        });

        describe('nullable', () => {
            it('should generate nullable values', () => {
                const schema = z.object({
                    middleName: z.string().nullable(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                const withValue = results.filter((r) => r.middleName !== null);
                const withNull = results.filter((r) => r.middleName === null);

                expect(withValue.length).toBeGreaterThan(0);
                expect(withNull.length).toBeGreaterThan(0);

                withValue.forEach((result) => {
                    expect(typeof result.middleName).toBe('string');
                });
            });
        });

        describe('default', () => {
            it('should handle default values', () => {
                const schema = z.object({
                    status: z.string().default('pending'),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                // Default schemas should still generate values
                expect(typeof result.status).toBe('string');
            });
        });

        describe('catch', () => {
            it('should handle catch values', () => {
                const schema = z.object({
                    config: z.string().catch('default'),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result.config).toBe('string');
            });
        });

        describe('transform', () => {
            it('should handle transform schemas', () => {
                const schema = z.object({
                    value: z.string().transform((s) => s.toUpperCase()),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                // Transformed values should be generated (though transform isn't applied during generation)
                expect(typeof result.value).toBe('string');
            });
        });

        describe('pipe', () => {
            it('should handle piped schemas', () => {
                const schema = z.object({
                    email: z.string().pipe(z.email()),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result.email).toBe('string');
            });
        });
    });

    describe('custom type handlers', () => {
        it('should use custom type handler for specific types', () => {
            const schema = z.object({
                id: z.bigint(),
            });

            const factory = new ZodFactory(schema).withTypeHandler('ZodBigInt', () => 999n);

            const result = factory.build();
            expect(result.id).toBe(999n);
        });

        it('should register multiple type handlers', () => {
            const schema = z.object({
                data: z.unknown(),
                id: z.bigint(),
            });

            const factory = new ZodFactory(schema).withTypeHandlers({
                ZodBigInt: () => 123n,
                ZodUnknown: () => ({ custom: 'data' }),
            });

            const result = factory.build();
            expect(result.id).toBe(123n);
            expect(result.data).toEqual({ custom: 'data' });
        });

        it('should throw for unsupported custom types', () => {
            const customValidator = z.custom<{ special: true }>(
                (val) => typeof val === 'object' && val !== null && 'special' in val,
            );

            const schema = z.object({
                custom: customValidator,
            });

            const factory = new ZodFactory(schema);
            expect(() => factory.build()).toThrow('ZodFactory cannot generate data for z.custom()');
        });

        it('should handle custom types with registered handler', () => {
            const customValidator = z.custom<{ special: true }>(
                (val) => typeof val === 'object' && val !== null && 'special' in val,
            );

            const schema = z.object({
                custom: customValidator,
            });

            const factory = new ZodFactory(schema).withTypeHandler('ZodCustom', () => ({ special: true }));

            const result = factory.build();
            expect(result.custom).toEqual({ special: true });
        });
    });
});
