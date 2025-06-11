import { describe, expect, it } from 'vitest';
import { iterableToArray, merge, Ref } from './utils';

describe('Utils', () => {
    describe('iterableToArray', () => {
        it('converts array to array', () => {
            const arr = [1, 2, 3];
            expect(iterableToArray(arr)).toEqual([1, 2, 3]);
        });

        it('converts Set to array', () => {
            const set = new Set([1, 2, 3]);
            expect(iterableToArray(set)).toEqual([1, 2, 3]);
        });

        it('converts string to array of characters', () => {
            const str = 'abc';
            expect(iterableToArray(str)).toEqual(['a', 'b', 'c']);
        });

        it('handles empty iterable', () => {
            expect(iterableToArray([])).toEqual([]);
            expect(iterableToArray(new Set())).toEqual([]);
            expect(iterableToArray('')).toEqual([]);
        });
    });

    describe('merge', () => {
        it('merges simple objects', () => {
            const target = { a: 1, b: 2 };
            const source = { b: 3, c: 4 };
            expect(merge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
        });

        it('deep merges nested objects', () => {
            const target = { a: { b: 1, c: 2 }, d: 3 };
            const source = { a: { b: 4, e: 5 }, f: 6 };
            expect(merge(target, source)).toEqual({
                a: { b: 4, c: 2, e: 5 },
                d: 3,
                f: 6,
            });
        });

        it('handles null and undefined sources', () => {
            const target = { a: 1 };
            expect(merge(target, null, undefined)).toEqual({ a: 1 });
        });

        it('handles multiple sources', () => {
            const target = { a: 1 };
            const source1 = { b: 2 };
            const source2 = { c: 3 };
            const source3 = { a: 4, d: 5 };
            expect(merge(target, source1, source2, source3)).toEqual({
                a: 4,
                b: 2,
                c: 3,
                d: 5,
            });
        });

        it('does not mutate original objects', () => {
            const target = { a: 1 };
            const source = { b: 2 };
            const result = merge(target, source);
            expect(target).toEqual({ a: 1 });
            expect(source).toEqual({ b: 2 });
            expect(result).toEqual({ a: 1, b: 2 });
        });

        it('overwrites arrays instead of merging them', () => {
            const target = { arr: [1, 2, 3] };
            const source = { arr: [4, 5] };
            expect(merge(target, source)).toEqual({ arr: [4, 5] });
        });

        it('throws error when trying to merge objects into non-object target', () => {
            expect(() => merge('string', { prop: 'value' })).toThrow(
                'Cannot merge objects into a non-object target',
            );
            expect(() => merge(42, { prop: 'value' })).toThrow(
                'Cannot merge objects into a non-object target',
            );
            expect(() => merge(null, { prop: 'value' })).toThrow(
                'Cannot merge objects into a non-object target',
            );
        });

        it('returns non-object target when no meaningful sources to merge', () => {
            expect(merge('string')).toBe('string');
            expect(merge(42, null, undefined)).toBe(42);
            expect(merge([1, 2, 3], {})).toEqual([1, 2, 3]);
        });
    });

    describe('Ref', () => {
        it('stores and calls handler with arguments', () => {
            const handler = (a: number, b: number) => a + b;
            const ref = new Ref({ args: [2, 3], handler });
            expect(ref.callHandler()).toBe(5);
        });

        it('handles handlers with no arguments', () => {
            const handler = () => 'hello';
            const ref = new Ref({ args: [], handler });
            expect(ref.callHandler()).toBe('hello');
        });

        it('handles complex return types', () => {
            const handler = (n: number) => ({ doubled: n * 2, value: n });
            const ref = new Ref({ args: [5], handler });
            expect(ref.callHandler()).toEqual({ doubled: 10, value: 5 });
        });
    });
});
