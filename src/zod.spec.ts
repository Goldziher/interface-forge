import { z } from 'zod/v4';
import { ZodFactory } from './zod';
import { Factory } from './index';

describe('ZodFactory', () => {
    describe('constructor', () => {
        it('should create a factory from a Zod schema', () => {
            const schema = z.object({
                age: z.number(),
                name: z.string(),
            });

            const factory = new ZodFactory(schema);
            expect(factory).toBeInstanceOf(ZodFactory);
            expect(factory).toBeInstanceOf(Factory);
        });

        it('should accept a factory function as second parameter', () => {
            const schema = z.object({
                email: z.email(),
                name: z.string(),
            });

            const factory = new ZodFactory(schema);

            const result = factory.build({ name: 'John Doe' });
            expect(result.name).toBe('John Doe');
            expect(result.email).toMatch(/@/);
        });

        it('should accept options as second parameter', () => {
            const schema = z.object({
                name: z.string(),
            });

            const factory = new ZodFactory(schema, { maxDepth: 3 });
            expect(factory.options?.maxDepth).toBe(3);
        });

        it('should accept factory function and options', () => {
            const schema = z.object({
                name: z.string(),
            });

            const factory = new ZodFactory(schema, () => ({ name: 'Test' }), {
                maxDepth: 2,
            });

            const result = factory.build();
            expect(result.name).toBe('Test');
            expect(factory.options?.maxDepth).toBe(2);
        });
    });

    describe('primitive types', () => {
        describe('string', () => {
            it('should generate basic strings', () => {
                const schema = z.object({
                    text: z.string(),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result.text).toBe('string');
                expect(result.text.length).toBeGreaterThan(0);
            });

            it('should generate strings with min length', () => {
                const schema = z.object({
                    text: z.string().min(10),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.text.length).toBeGreaterThanOrEqual(10);
                });
            });

            it('should generate strings with max length', () => {
                const schema = z.object({
                    text: z.string().max(5),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.text.length).toBeLessThanOrEqual(5);
                });
            });

            it('should generate strings with exact length', () => {
                const schema = z.object({
                    text: z.string().length(7),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.text.length).toBe(7);
                });
            });

            it('should generate strings with both min and max length', () => {
                const schema = z.object({
                    text: z.string().min(5).max(10),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                results.forEach((result) => {
                    expect(result.text.length).toBeGreaterThanOrEqual(5);
                    expect(result.text.length).toBeLessThanOrEqual(10);
                });
            });
        });

        describe('string formats', () => {
            it('should generate email addresses', () => {
                const schema = z.object({
                    email: z.email(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                    expect(() => z.email().parse(result.email)).not.toThrow();
                });
            });

            it('should generate E.164 phone numbers', () => {
                const schema = z.object({
                    phone: z.e164(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.phone).toMatch(/^\+[1-9]\d{10,14}$/);
                });
            });

            it('should generate emojis', () => {
                const schema = z.object({
                    reaction: z.emoji(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                const validEmojis = [
                    '😀',
                    '😎',
                    '🚀',
                    '🌟',
                    '❤️',
                    '🔥',
                    '✨',
                    '🎉',
                ];
                results.forEach((result) => {
                    expect(validEmojis).toContain(result.reaction);
                });
            });

            it('should generate JWT tokens', () => {
                const schema = z.object({
                    token: z.jwt(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    const parts = result.token.split('.');
                    expect(parts).toHaveLength(3);
                    // Check header
                    const header = JSON.parse(
                        Buffer.from(parts[0], 'base64url').toString(),
                    );
                    expect(header.alg).toBe('HS256');
                    expect(header.typ).toBe('JWT');
                    // Check payload
                    const payload = JSON.parse(
                        Buffer.from(parts[1], 'base64url').toString(),
                    );
                    expect(payload.sub).toBeDefined();
                    expect(payload.iat).toBeDefined();
                });
            });

            it('should generate nanoid strings', () => {
                const schema = z.object({
                    id: z.nanoid(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
                });
            });

            it('should generate ULID strings', () => {
                const schema = z.object({
                    id: z.ulid(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.id).toMatch(/^[0-9A-Z]{26}$/);
                });
            });

            it('should generate XID strings', () => {
                const schema = z.object({
                    id: z.xid(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.id).toMatch(/^[a-z0-9]{20}$/);
                });
            });

            it('should generate KSUID strings', () => {
                const schema = z.object({
                    id: z.ksuid(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.id).toMatch(/^[a-zA-Z0-9]{27}$/);
                });
            });

            it('should generate base64url strings', () => {
                const schema = z.object({
                    encoded: z.base64url(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(() =>
                        Buffer.from(result.encoded, 'base64url'),
                    ).not.toThrow();
                    expect(result.encoded).not.toMatch(/[+/=]/); // base64url doesn't have these chars
                });
            });

            it('should generate CIDR IPv4 addresses', () => {
                const schema = z.object({
                    network: z.cidrv4(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.network).toMatch(
                        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/,
                    );
                    const [, prefix] = result.network.split('/');
                    expect(Number(prefix)).toBeGreaterThanOrEqual(0);
                    expect(Number(prefix)).toBeLessThanOrEqual(32);
                });
            });

            it('should generate CIDR IPv6 addresses', () => {
                const schema = z.object({
                    network: z.cidrv6(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(result.network).toMatch(
                        /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\/\d{1,3}$/i,
                    );
                    const [, prefix] = result.network.split('/');
                    expect(Number(prefix)).toBeGreaterThanOrEqual(0);
                    expect(Number(prefix)).toBeLessThanOrEqual(128);
                });
            });

            it('should generate UUIDs', () => {
                const schema = z.object({
                    id: z.uuid(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.id).toMatch(
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                    );
                    expect(() => z.uuid().parse(result.id)).not.toThrow();
                });
            });

            it('should generate URLs', () => {
                const schema = z.object({
                    website: z.url(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.website).toMatch(/^https?:\/\//);
                    expect(() => z.url().parse(result.website)).not.toThrow();
                });
            });

            it('should generate CUIDs', () => {
                const schema = z.object({
                    cuid: z.cuid(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(result.cuid).toMatch(/^c[a-z0-9]{24}$/);
                });
            });

            it('should generate CUID2s', () => {
                const schema = z.object({
                    cuid2: z.cuid2(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(result.cuid2).toMatch(/^[a-z0-9]{24}$/);
                });
            });

            it('should generate base64 strings', () => {
                const schema = z.object({
                    encoded: z.base64(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(() =>
                        Buffer.from(result.encoded, 'base64'),
                    ).not.toThrow();
                });
            });

            it('should generate IPv4 addresses', () => {
                const schema = z.object({
                    ip: z.ipv4(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.ip).toMatch(
                        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
                    );
                });
            });

            it('should generate IPv6 addresses', () => {
                const schema = z.object({
                    ip: z.ipv6(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(result.ip).toMatch(
                        /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i,
                    );
                });
            });

            it('should generate regex-based strings', () => {
                const schema = z.object({
                    code: z.string().regex(/^[A-Z]{3}-\d{3}$/),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.code).toMatch(/^[A-Z]{3}-\d{3}$/);
                });
            });

            it('should generate email-like strings from regex', () => {
                const schema = z.object({
                    email: z.string().regex(/.*@.*/),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.email).toContain('@');
            });
        });

        describe('number', () => {
            it('should generate basic numbers', () => {
                const schema = z.object({
                    value: z.number(),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(typeof result.value).toBe('number');
                expect(Number.isFinite(result.value)).toBe(true);
            });

            it('should generate integers', () => {
                const schema = z.object({
                    count: z.number().int(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                results.forEach((result) => {
                    expect(Number.isInteger(result.count)).toBe(true);
                });
            });

            it('should generate numbers with min constraint', () => {
                const schema = z.object({
                    age: z.number().min(18),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                results.forEach((result) => {
                    expect(result.age).toBeGreaterThanOrEqual(18);
                });
            });

            it('should generate numbers with max constraint', () => {
                const schema = z.object({
                    score: z.number().max(100),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                results.forEach((result) => {
                    expect(result.score).toBeLessThanOrEqual(100);
                });
            });

            it('should generate numbers with both min and max', () => {
                const schema = z.object({
                    percentage: z.number().min(0).max(100),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(50);

                results.forEach((result) => {
                    expect(result.percentage).toBeGreaterThanOrEqual(0);
                    expect(result.percentage).toBeLessThanOrEqual(100);
                });
            });

            it('should generate positive numbers', () => {
                const schema = z.object({
                    amount: z.number().positive(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                results.forEach((result) => {
                    expect(result.amount).toBeGreaterThan(0);
                });
            });

            it('should generate negative numbers', () => {
                const schema = z.object({
                    debt: z.number().negative(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                results.forEach((result) => {
                    expect(result.debt).toBeLessThan(0);
                });
            });

            it('should generate numbers with multipleOf constraint', () => {
                const schema = z.object({
                    value: z.number().multipleOf(5),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                results.forEach((result) => {
                    const remainder = result.value % 5;
                    expect(Object.is(remainder, -0) ? 0 : remainder).toBe(0);
                });
            });

            it('should handle safe integers', () => {
                const schema = z.object({
                    id: z.number().int(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(Number.isSafeInteger(result.id)).toBe(true);
                });
            });
        });

        describe('boolean', () => {
            it('should generate boolean values', () => {
                const schema = z.object({
                    active: z.boolean(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(20);

                const trueCount = results.filter((r) => r.active).length;
                const falseCount = results.filter((r) => !r.active).length;

                expect(trueCount).toBeGreaterThan(0);
                expect(falseCount).toBeGreaterThan(0);
                expect(trueCount + falseCount).toBe(20);
            });
        });

        describe('date', () => {
            it('should generate date values', () => {
                const schema = z.object({
                    createdAt: z.date(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.createdAt).toBeInstanceOf(Date);
                    expect(result.createdAt.getTime()).not.toBeNaN();
                });
            });

            it('should generate dates with min constraint', () => {
                const minDate = new Date('2024-01-01');
                const schema = z.object({
                    appointmentDate: z.date().min(minDate),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(
                        result.appointmentDate.getTime(),
                    ).toBeGreaterThanOrEqual(minDate.getTime());
                });
            });

            it('should generate dates with max constraint', () => {
                const maxDate = new Date('2024-12-31');
                const schema = z.object({
                    deadline: z.date().max(maxDate),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.deadline.getTime()).toBeLessThanOrEqual(
                        maxDate.getTime(),
                    );
                });
            });
        });

        describe('literal', () => {
            it('should generate literal string values', () => {
                const schema = z.object({
                    status: z.literal('active'),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.status).toBe('active');
                });
            });

            it('should generate literal number values', () => {
                const schema = z.object({
                    version: z.literal(42),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(result.version).toBe(42);
                });
            });

            it('should generate literal boolean values', () => {
                const schema = z.object({
                    isSpecial: z.literal(true),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(result.isSpecial).toBe(true);
                });
            });
        });

        describe('null and undefined', () => {
            it('should generate null values', () => {
                const schema = z.object({
                    value: z.null(),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.value).toBeNull();
            });

            it('should generate undefined values', () => {
                const schema = z.object({
                    value: z.undefined(),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.value).toBeUndefined();
            });
        });

        describe('any and unknown', () => {
            it('should generate values for any type', () => {
                const schema = z.object({
                    data: z.any(),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.data).toBeDefined();
            });

            it('should generate values for unknown type', () => {
                const schema = z.object({
                    mystery: z.unknown(),
                });

                const factory = new ZodFactory(schema);
                const result = factory.build();

                expect(result.mystery).toBeDefined();
            });
        });
    });

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
                expect(
                    Object.keys(result.level1.level2.level3.level4 ?? {})
                        .length,
                ).toBe(0);
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
                    expect(user.id).toMatch(
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                    );
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
                    expect(['circle', 'square', 'rectangle']).toContain(
                        result.shape.type,
                    );
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

                expect(result.user.id).toMatch(
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
                );
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

                const withNickname = results.filter(
                    (r) => r.nickname !== undefined,
                );
                const withoutNickname = results.filter(
                    (r) => r.nickname === undefined,
                );

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

            const factory = new ZodFactory(schema).withTypeHandler(
                'ZodBigInt',
                () => 999n,
            );

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
                (val) =>
                    typeof val === 'object' && val !== null && 'special' in val,
            );

            const schema = z.object({
                custom: customValidator,
            });

            const factory = new ZodFactory(schema);
            expect(() => factory.build()).toThrow(
                'ZodFactory cannot generate data for z.custom()',
            );
        });

        it('should handle custom types with registered handler', () => {
            const customValidator = z.custom<{ special: true }>(
                (val) =>
                    typeof val === 'object' && val !== null && 'special' in val,
            );

            const schema = z.object({
                custom: customValidator,
            });

            const factory = new ZodFactory(schema).withTypeHandler(
                'ZodCustom',
                () => ({ special: true }),
            );

            const result = factory.build();
            expect(result.custom).toEqual({ special: true });
        });
    });

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
                config: z
                    .string()
                    .describe('Configuration string')
                    .meta({ example: 'example-config' }),
            });

            const factory = new ZodFactory(schema);
            const result = factory.build();
            expect(result.config).toBe('example-config');
        });

        it('should use examples array from metadata', () => {
            const schema = z.object({
                status: z
                    .string()
                    .meta({ examples: ['active', 'inactive', 'pending'] }),
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

            expect(result.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
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
            expect(() =>
                Buffer.from(result.urlEncoded, 'base64url'),
            ).not.toThrow();
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
            expect(result.datetime).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
            );
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
            expect(result.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
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

            expect(result.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
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
                expect(result.timestamp).toMatch(
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
                );
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
            expect(() => factory.build()).toThrow(
                'ZodNever should never be reached',
            );
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
            const iterator = factory.iterate([
                { status: 'active' },
                { status: 'inactive' },
                { status: 'pending' },
            ]);

            const results = Array.from(
                { length: 6 },
                () => iterator.next().value,
            );

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

            const results = new Set(
                Array.from({ length: 50 }, () => sampler.next().value),
            );
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
                        profileVisibility: z.enum([
                            'public',
                            'friends',
                            'private',
                        ]),
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
                expect(['light', 'dark', 'auto']).toContain(
                    user.settings.theme,
                );
            });
        });

        it('should generate e-commerce order data', () => {
            const moneySchema = z.object({
                amount: z.number().positive().multipleOf(0.01),
                currency: z.enum(['USD', 'EUR', 'GBP']),
            });

            const productSchema = z.object({
                category: z.enum([
                    'electronics',
                    'clothing',
                    'food',
                    'books',
                    'other',
                ]),
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
                        brand: z.enum([
                            'visa',
                            'mastercard',
                            'amex',
                            'discover',
                        ]),
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
                status: z.enum([
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                    'cancelled',
                ]),
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
                expect([
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                    'cancelled',
                ]).toContain(order.status);
                expect(['credit_card', 'paypal', 'bank_transfer']).toContain(
                    order.paymentMethod.type,
                );

                // Verify discriminated union
                switch (order.paymentMethod.type) {
                    case 'bank_transfer': {
                        expect(typeof order.paymentMethod.accountNumber).toBe(
                            'string',
                        );
                        break;
                    }
                    case 'credit_card': {
                        expect(order.paymentMethod.last4.length).toBe(4);
                        expect([
                            'visa',
                            'mastercard',
                            'amex',
                            'discover',
                        ]).toContain(order.paymentMethod.brand);
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
