/**
 * Default maximum depth for recursive data generation.
 * When currentDepth >= DEFAULT_MAX_DEPTH, generation stops.
 * This means with DEFAULT_MAX_DEPTH = 5, we generate levels 0, 1, 2, 3, 4.
 */
export const DEFAULT_MAX_DEPTH = 5;

/**
 * Default constraints for numeric generation
 */
export const NUMBER_CONSTRAINTS = {
    DEFAULT_INT_MAX: 1000,
    DEFAULT_INT_MIN: -1000,
    DEFAULT_MAX: 1000,
    DEFAULT_MIN: -1000,
    PRECISION_OFFSET: 0.000_001,
} as const;

/**
 * Default sizes for collection generation
 */
export const COLLECTION_SIZES = {
    DEFAULT_ARRAY_MAX: 5,
    DEFAULT_ARRAY_MIN: 1,
    DEFAULT_MAP_MAX: 5,
    DEFAULT_MAP_MIN: 1,
    DEFAULT_RECORD_MAX: 3,
    DEFAULT_RECORD_MIN: 1,
    DEFAULT_SET_MAX: 5,
    DEFAULT_SET_MIN: 1,
} as const;

/**
 * Default string lengths for various formats
 */
export const STRING_LENGTHS = {
    ALPHA_BASE64: 16,
    CUID_SUFFIX: 24,
    DEFAULT: 10,
    NANOID: 21,
    UUID_SEGMENTS: [8, 4, 4, 4, 12],
    XID: 20,
} as const;

/** Bounds of the seeded timestamp a generated ULID carries. */
export const ULID_EPOCH_FROM = '2000-01-01T00:00:00.000Z';
export const ULID_EPOCH_TO = '2030-01-01T00:00:00.000Z';
