import { describe, expect, it } from 'vitest';
import { CycleGenerator, SampleGenerator } from './generators';

describe('Generators', () => {
    describe('CycleGenerator', () => {
        it('cycles through values in order', () => {
            const generator = new CycleGenerator([1, 2, 3]);
            const gen = generator.generate();

            expect(gen.next().value).toBe(1);
            expect(gen.next().value).toBe(2);
            expect(gen.next().value).toBe(3);
            expect(gen.next().value).toBe(1);
            expect(gen.next().value).toBe(2);
            expect(gen.next().value).toBe(3);
        });

        it('handles single value', () => {
            const generator = new CycleGenerator(['single']);
            const gen = generator.generate();

            expect(gen.next().value).toBe('single');
            expect(gen.next().value).toBe('single');
            expect(gen.next().value).toBe('single');
        });

        it('throws error for empty iterable', () => {
            expect(() => new CycleGenerator([])).toThrow(
                'Cannot create generator from empty iterable',
            );
        });
    });

    describe('SampleGenerator', () => {
        it('samples values without immediate repetition', () => {
            const generator = new SampleGenerator([1, 2, 3, 4, 5]);
            const gen = generator.generate();

            let lastValue = gen.next().value;
            for (let i = 0; i < 50; i++) {
                const { value } = gen.next();
                expect(value).not.toBe(lastValue);
                expect([1, 2, 3, 4, 5]).toContain(value);
                lastValue = value;
            }
        });

        it('handles single value by always returning it', () => {
            const generator = new SampleGenerator(['only']);
            const gen = generator.generate();

            expect(gen.next().value).toBe('only');
            expect(gen.next().value).toBe('only');
            expect(gen.next().value).toBe('only');
        });

        it('eventually samples all values', () => {
            const values = ['a', 'b', 'c'];
            const generator = new SampleGenerator(values);
            const gen = generator.generate();

            const sampled = new Set<string>();
            for (let i = 0; i < 100; i++) {
                sampled.add(gen.next().value);
            }

            expect([...sampled].toSorted()).toEqual(['a', 'b', 'c']);
        });

        it('throws error for empty iterable', () => {
            expect(() => new SampleGenerator([])).toThrow(
                'Cannot create generator from empty iterable',
            );
        });
    });
});
