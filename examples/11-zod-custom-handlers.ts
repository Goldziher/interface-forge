/* eslint-disable unicorn/consistent-function-scoping */
/**
 * ZodFactory Custom Type Handlers
 *
 * This example demonstrates how to use custom type handlers with ZodFactory
 * for functions, promises, and other types that require special handling.
 */

import { z } from 'zod/v4';
import { ZodFactory } from 'interface-forge/zod';

console.log('=== ZodFactory Custom Type Handlers ===\n');

// 1. Function Schema (requires custom handler)
const CallbackSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    onError: z.function(),
    onSuccess: z.function(),
});

console.log('1. Function Handlers\n');

const callbackFactory = new ZodFactory(CallbackSchema).withTypeHandler(
    'ZodFunction',
    () => () => 'mock function result',
);

const callback = callbackFactory.build();
console.log('Callback object created with functions:', {
    id: callback.id,
    name: callback.name,
    onError: typeof callback.onError,
    onSuccess: typeof callback.onSuccess,
});

// Test the functions
console.log('onSuccess result:', (callback.onSuccess as () => string)());
console.log('onError result:', (callback.onError as () => string)());

// 2. Promise Schema (requires custom handler)
console.log('\n2. Promise Handlers\n');

const AsyncSchema = z.object({
    fetchData: z.promise(z.string()),
    id: z.string(),
    loadUser: z.promise(
        z.object({
            id: z.string(),
            name: z.string(),
        }),
    ),
});

const asyncFactory = new ZodFactory(AsyncSchema).withTypeHandler(
    'ZodPromise',
    () => Promise.resolve('mock promise result'),
);

const asyncObj = asyncFactory.build();
console.log('Async object created:', {
    fetchData: typeof asyncObj.fetchData,
    id: asyncObj.id,
    loadUser: typeof asyncObj.loadUser,
});

// Test the promises
(asyncObj.fetchData as unknown as Promise<string>)
    .then((data: string) => {
        console.log('fetchData resolved:', data);
        return data;
    })
    .catch((err: unknown) => {
        console.error('fetchData rejected:', err);
    });

// 3. Multiple Type Handlers
console.log('\n3. Multiple Type Handlers\n');

const BigIntSchema = z.object({
    callback: z.function(),
    id: z.string(),
    largeNumber: z.bigint(),
});

const multiFactory = new ZodFactory(BigIntSchema).withTypeHandlers({
    ZodBigInt: () => 42n,
    ZodFunction: () => (x: any) => `processed: ${x}`,
});

const multiObj = multiFactory.build();
console.log('Multi-type object:', {
    callback: (multiObj.callback as (value: string) => string)('test'),
    id: multiObj.id,
    largeNumber: multiObj.largeNumber.toString(),
});

// 4. Conditional Type Handlers
console.log('\n4. Error Handling\n');

const RiskySchema = z.object({
    id: z.string(),
    safeFunction: z.function(),
});

const errorHandlingFactory = new ZodFactory(RiskySchema).withTypeHandler(
    'ZodFunction',
    () => {
        return () => {
            try {
                if (Math.random() < 0.5) {
                    return 'Success!';
                }
                throw new Error('Random error');
            } catch {
                return 'Fallback result';
            }
        };
    },
);

const riskyObj = errorHandlingFactory.build();
console.log('Testing safe function:');
for (let i = 0; i < 3; i++) {
    const result = (riskyObj.safeFunction as () => string)();
    console.log(`Attempt ${i + 1}:`, result);
}

console.log('\n=== Custom Type Handlers Complete ===');

export { asyncFactory, callbackFactory, errorHandlingFactory, multiFactory };
