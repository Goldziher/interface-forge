import {
    ZodAny,
    type ZodArray,
    ZodArray as ZodArrayClass,
    ZodBase64,
    ZodBase64URL,
    ZodBoolean,
    ZodCatch,
    ZodCIDRv4,
    ZodCIDRv6,
    ZodCUID,
    ZodCUID2,
    ZodDate as ZodDateClass,
    ZodDefault,
    ZodDiscriminatedUnion,
    ZodE164,
    ZodEmail,
    ZodEmoji,
    type ZodEnum,
    ZodEnum as ZodEnumClass,
    ZodIntersection,
    ZodIPv4,
    ZodIPv6,
    ZodISODate,
    ZodISODateTime,
    ZodISODuration,
    ZodISOTime,
    ZodJWT,
    ZodKSUID,
    type ZodLiteral,
    ZodLiteral as ZodLiteralClass,
    ZodMap as ZodMapClass,
    ZodNanoID,
    ZodNull,
    ZodNullable,
    ZodNumber as ZodNumberClass,
    type ZodObject,
    ZodObject as ZodObjectClass,
    ZodOptional,
    ZodPipe,
    ZodPromise,
    type ZodRecord,
    ZodRecord as ZodRecordClass,
    ZodSet as ZodSetClass,
    ZodString as ZodStringClass,
    ZodTransform,
    ZodTuple as ZodTupleClass,
    type ZodType,
    ZodULID,
    ZodUndefined,
    ZodUnion,
    ZodUnknown,
    ZodURL,
    ZodUUID,
    ZodVoid,
    ZodXID,
} from 'zod/v4';
import type { ZodType as ZodV3Type } from 'zod';
import type {
    $ZodCheckGreaterThan,
    $ZodCheckLengthEquals,
    $ZodCheckLessThan,
    $ZodCheckMaxLength,
    $ZodCheckMinLength,
    $ZodCheckMultipleOf,
    $ZodCheckNumberFormat,
    $ZodCheckRegex,
    $ZodChecks,
    $ZodCheckStringFormat,
    $ZodType,
} from 'zod/v4/core';
import { createTypeGuard, isObject, type TypeGuard } from '@tool-belt/type-predicates';
import { getProperty, hasMethod, hasProperty } from './utils';
import type { ZodSchemaGenerator } from './zod-generator';

/**
 * Helper functions to handle both Zod v3 and v4 schema structures
 */
export const schemaHelpers = {
    /**
     * Get items schema for array types
     *
     * @param schema
     * @returns The array element type or undefined
     */
    getArrayElement(schema: ZodArray): undefined | ZodType {
        const def = schemaHelpers.getDef(schema);
        return (getProperty(def, ['element']) ?? getProperty(def, ['type'])) as undefined | ZodType;
    },

    /**
     * Get format from a string check, handling both v3 and v4
     *
     * @param check
     * @returns The check format or undefined
     */
    getCheckFormat(check: $ZodChecks): string | undefined {
        const v4Format = getProperty(check, ['_zod', 'def', 'format']) as string | undefined;
        if (v4Format) {
            return v4Format;
        }

        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        if (v3Kind && ['cuid', 'cuid2', 'email', 'regex', 'ulid', 'url', 'uuid'].includes(v3Kind)) {
            return v3Kind;
        }
        return getProperty(check, ['format']) as string | undefined;
    },

    /**
     * Get inclusive flag from a check, handling both v3 and v4
     *
     * @param check
     * @returns The inclusive flag or false as default
     */
    getCheckInclusive(check: unknown): boolean {
        const v4Inclusive = getProperty(check, ['_zod', 'def', 'inclusive']) as boolean | undefined;
        const v3Inclusive = getProperty(check, ['inclusive']) as boolean | undefined;
        return v4Inclusive ?? v3Inclusive ?? false;
    },

    /**
     * Get checks array from a schema definition
     *
     * @param schema
     * @returns Array of checks
     */
    getChecks(schema: ZodType): $ZodChecks[] {
        const def = schemaHelpers.getDef(schema);
        return (getProperty(def, ['checks']) as $ZodChecks[] | undefined) ?? [];
    },

    /**
     * Get check type/kind
     *
     * @param check
     * @returns The check type or undefined
     */
    getCheckType(check: $ZodChecks): string | undefined {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
        if (v4CheckType) {
            return v4CheckType;
        }

        return getProperty(check, ['kind']) as string | undefined;
    },

    /**
     * Get the value from a check (for min/max/length checks)
     *
     * @param check
     * @returns The check value
     */
    getCheckValue(check: $ZodChecks): unknown {
        const v4Value = getProperty(check, ['_zod', 'def', 'value']);
        if (v4Value !== undefined) {
            return v4Value;
        }

        const v4Minimum = getProperty(check, ['_zod', 'def', 'minimum']);
        if (v4Minimum !== undefined) {
            return v4Minimum;
        }

        const v4Maximum = getProperty(check, ['_zod', 'def', 'maximum']);
        if (v4Maximum !== undefined) {
            return v4Maximum;
        }

        const v4Length = getProperty(check, ['_zod', 'def', 'length']);
        if (v4Length !== undefined) {
            return v4Length;
        }

        const v3Value = getProperty(check, ['value']);
        if (v3Value !== undefined) {
            return v3Value;
        }

        const v3Minimum = getProperty(check, ['minimum']);
        if (v3Minimum !== undefined) {
            return v3Minimum;
        }

        const v3Maximum = getProperty(check, ['maximum']);
        if (v3Maximum !== undefined) {
            return v3Maximum;
        }

        return getProperty(check, ['length']);
    },

    /**
     * Get the definition object from a schema, handling both v3 and v4
     *
     * @param schema
     * @returns The schema definition
     */
    getDef(schema: ZodType): unknown {
        const v4Def = getProperty(schema, ['_zod', 'def']);
        if (v4Def !== undefined) {
            return v4Def;
        }

        return getProperty(schema, ['_def']);
    },

    /**
     * Get enum values
     *
     * @param schema
     * @returns Array of enum values
     */
    getEnumValues(schema: ZodEnum): unknown[] {
        const def = schemaHelpers.getDef(schema);
        const v4Entries = getProperty(def, ['entries']) as Record<string, unknown> | undefined;
        if (v4Entries) {
            const values = Object.entries(v4Entries)
                .filter(([key]) => Number.isNaN(Number(key)))
                .map(([, value]) => value);
            return values.length > 0 ? values : Object.values(v4Entries);
        }
        return (getProperty(def, ['values']) as undefined | unknown[]) ?? [];
    },

    /**
     * Get inner type for optional/nullable schemas
     *
     * @param schema
     * @returns The inner type or undefined
     */
    getInnerType(schema: ZodType): undefined | ZodType {
        const def = schemaHelpers.getDef(schema);
        return getProperty(def, ['innerType']) as undefined | ZodType;
    },

    /**
     * Get literal value
     *
     * @param schema
     * @returns The literal value
     */
    getLiteralValue(schema: ZodLiteral): unknown {
        const def = schemaHelpers.getDef(schema);
        const v4Values = getProperty(def, ['values']) as undefined | unknown[];
        if (v4Values && Array.isArray(v4Values) && v4Values.length > 0) {
            return v4Values[0];
        }
        return getProperty(def, ['value']);
    },

    /**
     * Get the shape of an object schema
     *
     * @param schema
     * @returns The object shape or undefined
     */
    getObjectShape(schema: ZodObject): Record<string, ZodType> | undefined {
        const def = schemaHelpers.getDef(schema);

        if (hasMethod(def, 'shape')) {
            return def.shape() as Record<string, ZodType>;
        }

        const shape = getProperty(def, ['shape']);
        if (shape) {
            return shape as Record<string, ZodType>;
        }

        if (hasProperty(schema, 'shape') && isObject(schema.shape)) {
            return schema.shape as Record<string, ZodType>;
        }

        return undefined;
    },

    /**
     * Get value type for record schemas
     *
     * @param schema
     * @returns The record value type or undefined
     */
    getRecordValueType(schema: ZodRecord): undefined | ZodType {
        const def = schemaHelpers.getDef(schema);
        return getProperty(def, ['valueType']) as undefined | ZodType;
    },

    /**
     * Get the type name from a schema definition
     *
     * @param schema
     * @returns The type name or undefined
     */
    getTypeName(schema: ZodType): string | undefined {
        const def = schemaHelpers.getDef(schema);
        const type = getProperty(def, ['type']) as string | undefined;
        if (type) {
            return type;
        }

        return getProperty(def, ['typeName']) as string | undefined;
    },

    /**
     * Get options for union types
     *
     * @param schema
     * @returns Array of union options
     */
    getUnionOptions(schema: ZodUnion): ZodType[] {
        const def = schemaHelpers.getDef(schema);
        return (getProperty(def, ['options']) as undefined | ZodType[]) ?? [];
    },

    /**
     * Check if a check is a string format check
     *
     * @param check
     * @returns True if the check is a string format check
     */
    isStringFormatCheck(check: $ZodChecks): boolean {
        const format = schemaHelpers.getCheckFormat(check);
        return format !== undefined;
    },
};

export type ZodTypeHandler = (schema: ZodType, generator: ZodSchemaGenerator, currentDepth: number) => unknown;

export const hasZodV4Structure = (schema: unknown): schema is $ZodType => {
    return isObject(schema) && '_zod' in schema && isObject(schema._zod);
};

export const hasZodV3Structure = (schema: unknown): schema is ZodV3Type => {
    return isObject(schema) && '_def' in schema;
};

export const getSchemaTypeName = (schema: ZodType): string | undefined => {
    if (hasZodV4Structure(schema)) {
        return (
            (schema._zod.def as { type?: string } | undefined)?.type ??
            (schema._zod.def as { typeName?: string } | undefined)?.typeName
        );
    }
    if (hasZodV3Structure(schema)) {
        return (
            // @ts-expect-error, v3 type compatibility
            (schema._def as { type?: string } | undefined)?.type ??
            // @ts-expect-error, v3 type compatibility
            (schema._def as { typeName?: string } | undefined)?.typeName
        );
    }
    return undefined;
};

export const createZodTypeGuard = <T extends ZodType>(constructor: new (...args: never[]) => T, typeName?: string) => {
    return createTypeGuard<T>((value: unknown): value is T => {
        try {
            if (value instanceof constructor) {
                return true;
            }

            if (typeName) {
                if (hasZodV3Structure(value)) {
                    const v3TypeName = Reflect.get(value._def, 'typeName') as string | undefined;
                    if (v3TypeName === typeName) {
                        return true;
                    }
                }

                if (hasZodV4Structure(value)) {
                    const schemaTypeName = getSchemaTypeName(value as ZodType);
                    if (schemaTypeName === typeName) {
                        return true;
                    }
                }
            }

            return false;
        } catch {
            return false;
        }
    });
};

// An explicit type: the inferred one names zod-internal types that declarations cannot reference. ~keep
export type ZodTypeGuards = {
    readonly any: TypeGuard<ZodAny>;
    readonly array: TypeGuard<ZodArrayClass>;
    readonly boolean: TypeGuard<ZodBoolean>;
    readonly catch: TypeGuard<ZodCatch>;
    readonly date: TypeGuard<ZodDateClass>;
    readonly default: TypeGuard<ZodDefault>;
    readonly discriminatedUnion: TypeGuard<ZodDiscriminatedUnion>;
    readonly enum: TypeGuard<ZodEnumClass>;
    readonly intersection: TypeGuard<ZodIntersection>;
    readonly literal: TypeGuard<ZodLiteralClass>;
    readonly map: TypeGuard<ZodMapClass>;
    readonly null: TypeGuard<ZodNull>;
    readonly nullable: TypeGuard<ZodNullable>;
    readonly number: TypeGuard<ZodNumberClass>;
    readonly object: TypeGuard<ZodObjectClass>;
    readonly optional: TypeGuard<ZodOptional>;
    readonly pipe: TypeGuard<ZodPipe>;
    readonly promise: TypeGuard<ZodPromise>;
    readonly record: TypeGuard<ZodRecordClass>;
    readonly set: TypeGuard<ZodSetClass>;
    readonly string: TypeGuard<ZodStringClass>;
    readonly transform: TypeGuard<ZodTransform>;
    readonly tuple: TypeGuard<ZodTupleClass>;
    readonly undefined: TypeGuard<ZodUndefined>;
    readonly union: TypeGuard<ZodUnion>;
    readonly unknown: TypeGuard<ZodUnknown>;
    readonly void: TypeGuard<ZodVoid>;
};

export const zodTypeGuards: ZodTypeGuards = {
    any: createZodTypeGuard(ZodAny, 'ZodAny'),
    array: createZodTypeGuard(ZodArrayClass, 'ZodArray'),
    boolean: createZodTypeGuard(ZodBoolean, 'ZodBoolean'),
    catch: createZodTypeGuard(ZodCatch, 'ZodCatch'),
    date: createZodTypeGuard(ZodDateClass, 'ZodDate'),
    default: createZodTypeGuard(ZodDefault, 'ZodDefault'),
    discriminatedUnion: createZodTypeGuard(ZodDiscriminatedUnion, 'ZodDiscriminatedUnion'),
    enum: createZodTypeGuard(ZodEnumClass, 'ZodEnum'),
    intersection: createZodTypeGuard(ZodIntersection, 'ZodIntersection'),
    literal: createZodTypeGuard(ZodLiteralClass, 'ZodLiteral'),
    map: createZodTypeGuard(ZodMapClass, 'ZodMap'),
    null: createZodTypeGuard(ZodNull, 'ZodNull'),
    nullable: createZodTypeGuard(ZodNullable, 'ZodNullable'),
    number: createZodTypeGuard(ZodNumberClass, 'ZodNumber'),
    object: createZodTypeGuard(ZodObjectClass, 'ZodObject'),
    optional: createZodTypeGuard(ZodOptional, 'ZodOptional'),
    pipe: createZodTypeGuard(ZodPipe, 'ZodPipeline'),
    promise: createZodTypeGuard(ZodPromise, 'ZodPromise'),
    record: createZodTypeGuard(ZodRecordClass, 'ZodRecord'),
    set: createZodTypeGuard(ZodSetClass, 'ZodSet'),
    string: createZodTypeGuard(ZodStringClass, 'ZodString'),
    transform: createZodTypeGuard(ZodTransform, 'ZodTransform'),
    tuple: createZodTypeGuard(ZodTupleClass, 'ZodTuple'),
    undefined: createZodTypeGuard(ZodUndefined, 'ZodUndefined'),
    union: createZodTypeGuard(ZodUnion, 'ZodUnion'),
    unknown: createZodTypeGuard(ZodUnknown, 'ZodUnknown'),
    void: createZodTypeGuard(ZodVoid, 'ZodVoid'),
} as const;

export const zodStringFormats = {
    base64: createZodTypeGuard(ZodBase64, 'ZodString'),
    base64url: createZodTypeGuard(ZodBase64URL, 'ZodString'),
    cidrv4: createZodTypeGuard(ZodCIDRv4, 'ZodString'),
    cidrv6: createZodTypeGuard(ZodCIDRv6, 'ZodString'),
    cuid: createZodTypeGuard(ZodCUID, 'ZodString'),
    cuid2: createZodTypeGuard(ZodCUID2, 'ZodString'),
    e164: createZodTypeGuard(ZodE164, 'ZodString'),
    email: createZodTypeGuard(ZodEmail, 'ZodString'),
    emoji: createZodTypeGuard(ZodEmoji, 'ZodString'),
    ipv4: createZodTypeGuard(ZodIPv4, 'ZodString'),
    ipv6: createZodTypeGuard(ZodIPv6, 'ZodString'),
    jwt: createZodTypeGuard(ZodJWT, 'ZodString'),
    ksuid: createZodTypeGuard(ZodKSUID, 'ZodString'),
    nanoid: createZodTypeGuard(ZodNanoID, 'ZodString'),
    ulid: createZodTypeGuard(ZodULID, 'ZodString'),
    url: createZodTypeGuard(ZodURL, 'ZodString'),
    uuid: createZodTypeGuard(ZodUUID, 'ZodString'),
    xid: createZodTypeGuard(ZodXID, 'ZodString'),
} as const;

export const zodDateFormats = {
    date: createZodTypeGuard(ZodISODate, 'ZodString'),
    datetime: createZodTypeGuard(ZodISODateTime, 'ZodString'),
    duration: createZodTypeGuard(ZodISODuration, 'ZodString'),
    time: createZodTypeGuard(ZodISOTime, 'ZodString'),
} as const;

export const primitiveTypeHandlers = {
    any: (generator: ZodSchemaGenerator) => generator.factory.lorem.word(),
    boolean: (generator: ZodSchemaGenerator) => generator.factory.datatype.boolean(),
    date: (generator: ZodSchemaGenerator) => generator.factory.date.recent(),
    null: () => null,
    undefined: () => undefined,
    void: () => undefined,
} as const;

export const builtinTypeMapping = {
    bigint: 'ZodBigInt',
    custom: 'ZodCustom',
    function: 'ZodFunction',
    lazy: 'ZodLazy',
    nan: 'ZodNaN',
    never: 'ZodNever',
    promise: 'ZodPromise',
    unknown: 'ZodUnknown',
    void: 'ZodVoid',
} as const;

export interface NumberConstraints {
    isInt: boolean;
    max?: number;
    min?: number;
    step?: number;
}

export interface SizeConstraints {
    exactLength?: number;
    maxLength?: number;
    minLength?: number;
}

export const isStringFormatCheck = createTypeGuard<$ZodCheckStringFormat>((check): check is $ZodCheckStringFormat => {
    const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
    const v3Kind = getProperty(check, ['kind']) as string | undefined;
    return (
        v4CheckType === 'string_format' ||
        ['cuid', 'cuid2', 'email', 'regex', 'ulid', 'url', 'uuid'].includes(v3Kind ?? '')
    );
});

export const isRegexCheck = createTypeGuard<$ZodCheckRegex>((check): check is $ZodCheckRegex => {
    const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
    const v4Format = getProperty(check, ['_zod', 'def', 'format']) as string | undefined;
    const v3Kind = getProperty(check, ['kind']) as string | undefined;
    const v3Regex = getProperty(check, ['regex']);
    return (v4CheckType === 'string_format' && v4Format === 'regex') || v3Kind === 'regex' || v3Regex instanceof RegExp;
});

export const isLessThanCheck: TypeGuard<$ZodCheckLessThan> = createTypeGuard<$ZodCheckLessThan>(
    (check): check is $ZodCheckLessThan => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'less_than' || v3Kind === 'max';
    },
);

export const isGreaterThanCheck: TypeGuard<$ZodCheckGreaterThan> = createTypeGuard<$ZodCheckGreaterThan>(
    (check): check is $ZodCheckGreaterThan => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'greater_than' || v3Kind === 'min';
    },
);

export const isMultipleOfCheck = createTypeGuard<$ZodCheckMultipleOf>((check): check is $ZodCheckMultipleOf => {
    const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
    const v3Kind = getProperty(check, ['kind']) as string | undefined;
    return v4CheckType === 'multiple_of' || v3Kind === 'multipleOf';
});

export const isNumberFormatCheck = createTypeGuard<$ZodCheckNumberFormat>((check): check is $ZodCheckNumberFormat => {
    const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
    return v4CheckType === 'number_format';
});

export const isMaxLengthCheck: TypeGuard<$ZodCheckMaxLength> = createTypeGuard<$ZodCheckMaxLength>(
    (check): check is $ZodCheckMaxLength => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'max_length' || v3Kind === 'maxLength' || v3Kind === 'max';
    },
);

export const isMinLengthCheck: TypeGuard<$ZodCheckMinLength> = createTypeGuard<$ZodCheckMinLength>(
    (check): check is $ZodCheckMinLength => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'min_length' || v3Kind === 'minLength' || v3Kind === 'min';
    },
);

export const isLengthEqualsCheck: TypeGuard<$ZodCheckLengthEquals> = createTypeGuard<$ZodCheckLengthEquals>(
    (check): check is $ZodCheckLengthEquals => {
        const v4CheckType = getProperty(check, ['_zod', 'def', 'check']) as string | undefined;
        const v3Kind = getProperty(check, ['kind']) as string | undefined;
        return v4CheckType === 'length_equals' || v3Kind === 'length';
    },
);

export type SchemaGeneratorFunction = (generator: ZodSchemaGenerator, schema: $ZodType) => unknown;
