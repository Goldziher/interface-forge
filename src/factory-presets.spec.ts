import { describe, expect, it } from 'vitest';

import { ConfigurationError } from './errors.js';
import { Factory } from './index.js';

interface User {
    email: string;
    isActive: boolean;
    name: string;
    role: 'admin' | 'guest' | 'user';
}

const CreateUserFactory = (): Factory<User> => {
    let counter = 0;
    return new Factory<User>((factory) => ({
        email: `${factory.person.firstName()}${++counter}@example.com`,
        isActive: true,
        name: factory.person.fullName(),
        role: 'user',
    }));
};

describe('Factory presets', () => {
    it('applies a registered preset during build()', () => {
        const factory = CreateUserFactory().preset('admin', { role: 'admin' });

        const user = factory.build(undefined, { presets: ['admin'] });
        expect(user.role).toBe('admin');
    });

    it('lets later presets override earlier presets in order', () => {
        const factory = CreateUserFactory()
            .preset('admin', { role: 'admin', email: 'admin@example.com' })
            .preset('guest', { role: 'guest', isActive: false });

        const user = factory.build(undefined, { presets: ['admin', 'guest'] });
        expect(user.role).toBe('guest');
        expect(user.isActive).toBe(false);
    });

    it('keeps unconflicting fields from multiple presets merged', () => {
        const factory = CreateUserFactory()
            .preset('admin', { role: 'admin', email: 'admin@example.com' })
            .preset('guest', { role: 'guest', isActive: false });

        const user = factory.build(undefined, { presets: ['admin', 'guest'] });
        expect(user.email).toBe('admin@example.com');
        expect(user.role).toBe('guest');
    });

    it('lets explicit build kwargs override preset values', () => {
        const factory = CreateUserFactory().preset('admin', { role: 'admin', name: 'Preset Name' });

        const user = factory.build({ role: 'guest', name: 'Override Name' }, { presets: ['admin'] });
        expect(user.role).toBe('guest');
        expect(user.name).toBe('Override Name');
    });

    it('applies presets during batch() for single and array kwargs', () => {
        const factory = CreateUserFactory().preset('admin', { role: 'admin' });

        const single = factory.batch(2, { isActive: false }, { presets: ['admin'] });
        for (const user of single) {
            expect(user.role).toBe('admin');
            expect(user.isActive).toBe(false);
        }

        const perItem = factory.batch(2, [{ email: 'a@example.com' }, { email: 'b@example.com' }], {
            presets: ['admin'],
        });
        expect(perItem[0]?.email).toBe('a@example.com');
        expect(perItem[1]?.email).toBe('b@example.com');
        expect(perItem.every((user) => user.role === 'admin')).toBe(true);
    });

    it('applies presets through buildAsync() and batchAsync()', async () => {
        const factory = CreateUserFactory().preset('admin', { role: 'admin' });

        const user = await factory.buildAsync(undefined, { presets: ['admin'] });
        expect(user.role).toBe('admin');

        const users = await factory.batchAsync(2, undefined, { presets: ['admin'] });
        expect(users.every((item) => item.role === 'admin')).toBe(true);
    });

    it('throws a clear error for unknown preset names', () => {
        const factory = CreateUserFactory();

        expect(() => factory.build(undefined, { presets: ['missing'] })).toThrow(ConfigurationError);
        expect(() => factory.build(undefined, { presets: ['missing'] })).toThrow(
            'Unknown preset "missing". Registered presets: none.',
        );
        expect(() => factory.batch(1, undefined, { presets: ['missing'] })).toThrow(
            'Unknown preset "missing". Registered presets: none.',
        );
    });

    it('lists registered preset names in the unknown-preset error', () => {
        const factory = CreateUserFactory().preset('admin', { role: 'admin' });

        expect(() => factory.build(undefined, { presets: ['missing'] })).toThrow('Registered presets: admin.');
    });

    it('rejects empty preset names at registration', () => {
        const factory = CreateUserFactory();
        expect(() => factory.preset('   ', { role: 'admin' })).toThrow('Preset name cannot be empty');
    });

    it('applies presets in createMany() persistence', async () => {
        const adapter = { create: async (item: User) => item, createMany: async (items: User[]) => items };
        const factory = CreateUserFactory().preset('admin', { role: 'admin' });

        const users = await factory.createMany(2, undefined, { adapter, presets: ['admin'] });
        expect(users).toHaveLength(2);
        users.forEach((user) => {
            expect(user.role).toBe('admin');
        });
    });
});
