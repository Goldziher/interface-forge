import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import { ValidationError } from './errors';
import { JsonSchemaFactory, type JsonSchema } from './json-schema';

describe('JsonSchemaFactory', () => {
    it('generates objects with required and optional properties', () => {
        interface User {
            age: number;
            email: string;
            id: string;
            name: string;
            role: 'admin' | 'user';
        }

        const schema = {
            properties: {
                age: { maximum: 65, minimum: 18, type: 'integer' },
                email: { format: 'email', type: 'string' },
                id: { format: 'uuid', type: 'string' },
                name: { maxLength: 12, minLength: 4, type: 'string' },
                role: { enum: ['admin', 'user'] },
            },
            required: ['id', 'email', 'name', 'age'],
            type: 'object',
        } satisfies JsonSchema;

        const factory = new JsonSchemaFactory<User>(schema);
        const user = factory.build();

        expect(user.id).toMatch(/^[\da-f-]{36}$/);
        expect(user.email).toContain('@');
        expect(user.name.length).toBeGreaterThanOrEqual(4);
        expect(user.name.length).toBeLessThanOrEqual(12);
        expect(user.age).toBeGreaterThanOrEqual(18);
        expect(user.age).toBeLessThanOrEqual(65);
        expect(['admin', 'user']).toContain(user.role);
    });

    it('supports arrays, nested objects, const values, and numeric multiples', () => {
        const schema = {
            properties: {
                flags: {
                    items: { type: 'boolean' },
                    maxItems: 3,
                    minItems: 2,
                    type: 'array',
                },
                nested: {
                    properties: {
                        count: { maximum: 20, minimum: 10, multipleOf: 5, type: 'integer' },
                    },
                    required: ['count'],
                    type: 'object',
                },
                status: { const: 'active' },
            },
            required: ['flags', 'nested', 'status'],
            type: 'object',
        } satisfies JsonSchema;

        const value = new JsonSchemaFactory<{
            flags: boolean[];
            nested: { count: number };
            status: 'active';
        }>(schema).build();

        expect(value.status).toBe('active');
        expect(value.flags.length).toBeGreaterThanOrEqual(2);
        expect(value.flags.length).toBeLessThanOrEqual(3);
        expect(value.flags.every((flag) => typeof flag === 'boolean')).toBe(true);
        expect(value.nested.count % 5).toBe(0);
    });

    it('supports string patterns and formats', () => {
        const schema = {
            properties: {
                date: { format: 'date', type: 'string' },
                dateTime: { format: 'date-time', type: 'string' },
                sku: { pattern: '^sku-[0-9]{4}$', type: 'string' },
                time: { format: 'time', type: 'string' },
                uri: { format: 'uri', type: 'string' },
            },
            required: ['date', 'dateTime', 'sku', 'time', 'uri'],
            type: 'object',
        } satisfies JsonSchema;

        const value = new JsonSchemaFactory<{
            date: string;
            dateTime: string;
            sku: string;
            time: string;
            uri: string;
        }>(schema).build();

        expect(value.sku).toMatch(/^sku-[0-9]{4}$/);
        expect(value.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(value.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(value.time).toMatch(/^\d{2}:\d{2}:\d{2}Z$/);
        expect(value.uri).toMatch(/^https?:\/\//);
    });

    it('validates generated values with Ajv', () => {
        const schema = {
            properties: {
                code: { pattern: '^[A-Z]{3}$', type: 'string' },
                url: { format: 'uri', type: 'string' },
            },
            required: ['code', 'url'],
            type: 'object',
        } satisfies JsonSchema;

        const ajv = new Ajv({ strict: false });
        addFormats(ajv);
        const validate = ajv.compile(schema);
        const value = new JsonSchemaFactory(schema).build();

        expect(validate(value)).toBe(true);
    });

    it('applies factory values and overrides before validation', () => {
        const schema = {
            properties: {
                name: { minLength: 2, type: 'string' },
                slug: { pattern: '^user-[0-9]{2}$', type: 'string' },
            },
            required: ['name', 'slug'],
            type: 'object',
        } satisfies JsonSchema;

        const factory = new JsonSchemaFactory<{ name: string; slug: string }>(schema, () => ({
            slug: 'user-42',
        }));

        expect(factory.build({ name: 'Ada' })).toEqual({ name: 'Ada', slug: 'user-42' });
    });

    it('throws ValidationError when custom data violates the schema', () => {
        const schema = {
            properties: {
                name: { minLength: 3, type: 'string' },
            },
            required: ['name'],
            type: 'object',
        } satisfies JsonSchema;

        const factory = new JsonSchemaFactory<{ name: string }>(schema);

        expect(() => factory.build({ name: 'x' })).toThrow(ValidationError);
    });

    it('supports shallow local $defs references', () => {
        const schema = {
            $defs: {
                identifier: { pattern: '^id-[0-9]{3}$', type: 'string' },
            },
            properties: {
                id: { $ref: '#/$defs/identifier' },
            },
            required: ['id'],
            type: 'object',
        } satisfies JsonSchema;

        expect(new JsonSchemaFactory<{ id: string }>(schema).build().id).toMatch(/^id-[0-9]{3}$/);
    });
});

it('generates literal prefixes with length constraints and grouped alternatives', () => {
    const schema = {
        properties: {
            code: { pattern: '^(RED|BLUE)-[0-9]{4}$', type: 'string' },
            prefix: { minLength: 5, pattern: '^abc', type: 'string' },
        },
        required: ['code', 'prefix'],
        type: 'object',
    } as const;
    const factory = new JsonSchemaFactory<{ code: string; prefix: string }>({
        ...schema,
        required: [...schema.required],
    });
    const value = factory.build();

    expect(value.code).toMatch(/^(RED|BLUE)-[0-9]{4}$/);
    expect(value.prefix).toMatch(/^abc/);
    expect(value.prefix.length).toBeGreaterThanOrEqual(5);
});
