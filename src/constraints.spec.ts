import { describe, expect, it } from 'vitest';

import { ConstraintError, Factory } from './index.js';

describe('Constraint helpers', () => {
    it('clamps generated numbers with min()', () => {
        const factory = new Factory<{ age: number }>((factory) => ({
            age: factory.constraints.min(18, () => 3),
        }));

        expect(factory.build().age).toBe(18);
    });

    it('clamps generated numbers with max()', () => {
        const factory = new Factory<{ age: number }>((factory) => ({
            age: factory.constraints.max(80, () => 100),
        }));

        expect(factory.build().age).toBe(80);
    });

    it('clamps generated numbers into range with between()', () => {
        const factory = new Factory<{ high: number; inRange: number; low: number }>((factory) => ({
            high: factory.constraints.between(10, 20, () => 90),
            inRange: factory.constraints.between(10, 20, () => 15),
            low: factory.constraints.between(10, 20, () => 1),
        }));

        const result = factory.build();
        expect(result.low).toBe(10);
        expect(result.inRange).toBe(15);
        expect(result.high).toBe(20);
    });

    it('regenerates with pattern() until the regex matches', () => {
        let call = 0;
        const factory = new Factory<{ code: string }>((factory) => ({
            code: factory.constraints.pattern(/^[A-Z]{3}$/, () => {
                call += 1;
                return call === 1 ? 'abc' : 'ABC';
            }),
        }));

        expect(factory.build().code).toBe('ABC');
        expect(call).toBe(2);
    });

    it('throws ConstraintError when pattern() never matches', () => {
        const factory = new Factory<{ code: string }>((factory) => ({
            code: factory.constraints.pattern(/^[A-Z]{3}$/, () => 'never-matches'),
        }));

        expect(() => factory.build()).toThrow(ConstraintError);
        try {
            factory.build();
        } catch (error) {
            expect(error).toBeInstanceOf(ConstraintError);
            expect((error as ConstraintError).constraint).toBe('pattern');
            expect((error as ConstraintError).attempts).toBe(5);
        }
    });

    it('regenerates with custom() until the predicate accepts', () => {
        let call = 0;
        const factory = new Factory<{ score: number }>((factory) => ({
            score: factory.constraints.custom(
                'score',
                (value: number) => value >= 0,
                () => {
                    call += 1;
                    return call === 1 ? -1 : 1;
                },
            ),
        }));

        expect(factory.build().score).toBe(1);
        expect(call).toBe(2);
    });

    it('reports field, constraint and attempts from custom() failures', () => {
        const factory = new Factory<{ score: number }>((factory) => ({
            score: factory.constraints.custom(
                'score',
                () => false,
                () => 1,
                { attempts: 2 },
            ),
        }));

        expect(() => factory.build()).toThrow('Constraint "custom" violated for field "score" after 2 attempt(s).');
        try {
            factory.build();
        } catch (error) {
            expect((error as ConstraintError).field).toBe('score');
            expect((error as ConstraintError).constraint).toBe('custom');
            expect((error as ConstraintError).attempts).toBe(2);
        }
    });

    it('produces unique values across builds and batch items per field', () => {
        let counter = 0;
        const values = ['a', 'a', 'a', 'b', 'c'];
        const factory = new Factory<{ code: string }>((factory) => ({
            code: factory.constraints.unique('code', () => values[Math.min(counter++, values.length - 1)]),
        }));

        const first = factory.build();
        const batch = factory.batch(2);

        expect(first.code).toBe('a');
        expect(batch.map((item) => item.code)).toEqual(['b', 'c']);
        expect(() => factory.build()).toThrow(ConstraintError);
    });

    it('tracks uniqueness per field, not globally', () => {
        const factory = new Factory<{ code: number; id: number }>((factory) => ({
            code: factory.constraints.unique('code', () => 7),
            id: factory.constraints.unique('id', () => 7),
        }));

        expect(factory.build()).toEqual({ code: 7, id: 7 });
    });

    it('keeps uniqueness factory-local', () => {
        const left = new Factory<{ v: string }>((left) => ({
            v: left.constraints.unique('v', () => 'shared'),
        }));
        const right = new Factory<{ v: string }>((right) => ({
            v: right.constraints.unique('v', () => 'shared'),
        }));

        expect(left.build().v).toBe('shared');
        expect(right.build().v).toBe('shared');
    });

    it('honors a custom attempt limit', () => {
        const factory = new Factory<{ code: string }>((factory) => ({
            code: factory.constraints.unique('code', () => 'same', { attempts: 2 }),
        }));

        expect(factory.build().code).toBe('same');
        expect(() => factory.build()).toThrow('Constraint "unique" violated for field "code" after 2 attempt(s).');
    });
});
