export class CircularReferenceError extends Error {
    constructor(message = 'Circular reference detected in factory composition') {
        super(message);
        this.name = 'CircularReferenceError';
    }
}

/**
 * Error thrown when a constraint helper cannot produce a conforming value.
 *
 * @property field - The field the constraint applies to, when provided
 * @property constraint - The constraint name that was violated
 * @property attempts - How many generation attempts were made, when applicable
 */
export class ConstraintError extends Error {
    readonly attempts?: number;
    readonly constraint: string;
    readonly field?: string;

    constructor(options: { attempts?: number; constraint: string; field?: string }) {
        const location = options.field === undefined ? '' : ` for field "${options.field}"`;
        const attempts = options.attempts === undefined ? '' : ` after ${options.attempts} attempt(s)`;
        super(`Constraint "${options.constraint}" violated${location}${attempts}.`);
        this.name = 'ConstraintError';
        this.constraint = options.constraint;
        this.field = options.field;
        this.attempts = options.attempts;
    }
}

export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

export class FixtureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FixtureError';
    }
}

export class FixtureValidationError extends FixtureError {
    constructor(message: string) {
        super(message);
        this.name = 'FixtureValidationError';
    }
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}
