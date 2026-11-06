import { describe, expect, it } from 'vitest';

import { ConfigurationError } from './errors.js';
import { Factory } from './index.js';

describe('Lazy evaluation with async values', () => {
    it('resolves sync value() refs through build()', () => {
        interface User {
            name: string;
            token: string;
        }

        const UserFactory = new Factory<User>((factory) => ({
            name: 'static',
            token: factory.use(() => 'generated-token'),
        }));

        const user = UserFactory.build();
        expect(user.token).toBe('generated-token');
    });

    it('resolves async use() values through buildAsync()', async () => {
        interface User {
            name: string;
            token: string;
        }

        const UserFactory = new Factory<User>((factory) => ({
            name: 'static',
            token: factory.use(async () => {
                await new Promise<void>((resolve) => setTimeout(resolve, 1));
                return 'async-token';
            }) as unknown as string,
        }));

        const user = await UserFactory.buildAsync();
        expect(user.token).toBe('async-token');
    });

    it('resolves async use() values through batchAsync()', async () => {
        interface User {
            name: string;
            token: string;
        }
        let counter = 0;

        const UserFactory = new Factory<User>((factory) => ({
            name: 'static',
            token: factory.use(async () => Promise.resolve(`token-${++counter}`)) as unknown as string,
        }));

        const users = await UserFactory.batchAsync(3);
        expect(users.map((user) => user.token)).toEqual(['token-1', 'token-2', 'token-3']);
    });

    it('fails clearly when sync build() encounters async lazy values', async () => {
        interface User {
            name: string;
            token: string;
        }

        const UserFactory = new Factory<User>((factory) => ({
            name: 'static',
            token: factory.use(async () => 'async-token') as unknown as string,
        }));

        expect(() => UserFactory.build()).toThrow(ConfigurationError);
        expect(() => UserFactory.build()).toThrow(
            'Async lazy value detected (use(async () => ...)). Use buildAsync() to build instances with async lazy values.',
        );
        expect(() => UserFactory.batch(2)).toThrow('Async lazy value detected');
    });

    it('resolves async use() values nested inside objects through buildAsync()', async () => {
        interface Organization {
            metadata: {
                createdVia: string;
                token: string;
            };
            name: string;
        }

        const OrgFactory = new Factory<Organization>((factory) => ({
            metadata: {
                createdVia: 'factory',
                token: factory.use(async () => 'nested-async-token') as unknown as string,
            },
            name: 'org',
        }));

        const org = await OrgFactory.buildAsync();
        expect(org.metadata.token).toBe('nested-async-token');
    });
});
