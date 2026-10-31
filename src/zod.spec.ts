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

                const validEmojis = ['😀', '😎', '🚀', '🌟', '❤️', '🔥', '✨', '🎉'];
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
                    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
                    expect(header.alg).toBe('HS256');
                    expect(header.typ).toBe('JWT');
                    // Check payload
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
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
                    expect(result.id).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
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
                    expect(() => Buffer.from(result.encoded, 'base64url')).not.toThrow();
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
                    expect(result.network).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/);
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
                    expect(result.network).toMatch(/^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\/\d{1,3}$/i);
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
                    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
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
                    expect(() => Buffer.from(result.encoded, 'base64')).not.toThrow();
                });
            });

            it('should generate IPv4 addresses', () => {
                const schema = z.object({
                    ip: z.ipv4(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(10);

                results.forEach((result) => {
                    expect(result.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
                });
            });

            it('should generate IPv6 addresses', () => {
                const schema = z.object({
                    ip: z.ipv6(),
                });

                const factory = new ZodFactory(schema);
                const results = factory.batch(5);

                results.forEach((result) => {
                    expect(result.ip).toMatch(/^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i);
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
                    expect(result.appointmentDate.getTime()).toBeGreaterThanOrEqual(minDate.getTime());
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
                    expect(result.deadline.getTime()).toBeLessThanOrEqual(maxDate.getTime());
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
});
