import RandExp from 'randexp';

const MAX_ATTEMPTS = 20;

export function generateRegex(
    pattern: RegExp,
    randomInt: (min: number, max: number) => number,
    minLength = 0,
    maxLength = Infinity,
): string | undefined {
    const regex = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
    const generator = new RandExp(regex);
    generator.randInt = randomInt;
    generator.max = Math.max(generator.max, Math.min(minLength, 1000));

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const value = generator.gen();
        const length = [...value].length;
        if (length > maxLength) {
            continue;
        }

        const padding = 'a'.repeat(Math.max(0, minLength - length));
        for (const candidate of [value + padding, padding + value]) {
            if (regex.test(candidate)) {
                return candidate;
            }
        }
    }

    return undefined;
}
