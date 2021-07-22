import { ComplexObject, Options } from './test-types';
import { ERROR_MESSAGES, TypeFactory } from '../src';
import { annoyinglyComplexObject, defaults } from './utils';
import {
    haveSameKeyPaths,
    mapKeyPaths,
    readFileIfExists,
    validateAndNormalizeFilename,
} from '../src/utils/file';
import { isPromise, isRecord } from '../src/utils/guards';
import {
    parseFactorySchemaAsync,
    parseFactorySchemaSync,
    validateFactorySchema,
} from '../src/utils/schema';
import { parseOptions } from '../src/utils/options';
import { throwIfPromise } from '../src/utils/general';
import fs from 'fs';

describe('isRecord', () => {
    it('returns true for records and false for non-records', () => {
        expect(isRecord({})).toBeTruthy();
        expect(isRecord(new Map())).toBeTruthy();
        expect(isRecord(new WeakMap())).toBeTruthy();
        expect(isRecord(new Map())).toBeTruthy();
        expect(isRecord([])).toBeFalsy();
        expect(isRecord(new Set())).toBeFalsy();
        expect(isRecord(() => null)).toBeFalsy();
        expect(isRecord('')).toBeFalsy();
        expect(isRecord(1)).toBeFalsy();
    });
});

describe('isPromise', () => {
    it('returns true for promises and false for non promises', () => {
        expect(isPromise(new Promise((resolve) => resolve(null)))).toBeTruthy();
        expect(isPromise({})).toBeFalsy();
        expect(isPromise(null)).toBeFalsy();
        expect(isPromise(1)).toBeFalsy();
    });
});

describe('throwIfPromise', () => {
    it('throws when promise and passes value otherwise', () => {
        expect(() =>
            throwIfPromise(new Promise((resolve) => resolve(null)), 'test'),
        ).toThrow(ERROR_MESSAGES.PROMISE_VALUE.replace(':key', 'test'));
        expect(throwIfPromise({}, 'test')).toEqual({});
    });
});

describe('parse schema', () => {
    describe('parseFactorySchemaAsync', () => {
        it('parses schema correctly for embedded instance', async () => {
            expect(
                await parseFactorySchemaAsync<ComplexObject>(
                    {
                        ...defaults,
                        options: new TypeFactory<any>({
                            type: 'none',
                        }),
                    },
                    0,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                options: {
                    type: 'none',
                },
            });
        });
        it('parses schema correctly using .use with function', async () => {
            expect(
                await parseFactorySchemaAsync<ComplexObject>(
                    {
                        ...defaults,
                        value: TypeFactory.use(async () => Promise.resolve(99)),
                    },
                    0,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 99,
            });
        });
        it('parses schema correctly using .use with TypeFactory + options', async () => {
            expect(
                await parseFactorySchemaAsync<ComplexObject>(
                    {
                        ...defaults,
                        options: TypeFactory.use<Options>(
                            new TypeFactory<Options>({
                                type: 'none',
                            }),
                            { overrides: { type: 'all' } },
                        ),
                    },
                    0,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                options: {
                    type: 'all',
                },
            });
        });
        it('parses schema correctly using .use with batch=5', async () => {
            const result = await parseFactorySchemaAsync<ComplexObject>(
                {
                    ...defaults,
                    options: TypeFactory.use<Options>(
                        new TypeFactory<Options>({
                            type: 'none',
                            children: TypeFactory.use(
                                new TypeFactory<ComplexObject>(defaults),

                                {
                                    batch: 5,
                                    factory: (values, iteration) => ({
                                        ...values,
                                        value: iteration,
                                    }),
                                },
                            ),
                        }),
                    ),
                },
                0,
            );
            expect(result).toStrictEqual<ComplexObject>({
                ...defaults,
                options: {
                    type: 'none',
                    children: expect.arrayContaining([
                        {
                            ...defaults,
                            value: expect.any(Number),
                        },
                    ]),
                },
            });
            expect(result.options?.children?.length).toEqual(5);
        });
        it('parses schema correctly using generator fn', async () => {
            const generator = TypeFactory.iterate([
                new Promise((resolve) => resolve(1)),
                2,
                3,
            ]);
            expect(
                await parseFactorySchemaAsync<ComplexObject>(
                    {
                        ...defaults,
                        value: generator,
                    },
                    0,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 1,
            });
            expect(
                await parseFactorySchemaAsync<ComplexObject>(
                    {
                        ...defaults,
                        value: generator,
                    },
                    1,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 2,
            });
            expect(
                await parseFactorySchemaAsync<ComplexObject>(
                    {
                        ...defaults,
                        value: generator,
                    },
                    2,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 3,
            });
            expect(
                await parseFactorySchemaAsync<ComplexObject>(
                    {
                        ...defaults,
                        value: generator,
                    },
                    4,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 1,
            });
        });
    });
    describe('parseFactorySchemaSync', () => {
        it('parses schema correctly for embedded instance', () => {
            expect(
                parseFactorySchemaSync<ComplexObject>(
                    {
                        ...defaults,
                        options: new TypeFactory<any>({
                            type: 'none',
                        }),
                    },
                    0,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                options: {
                    type: 'none',
                },
            });
        });
        it('parses schema correctly using .use with function', () => {
            expect(
                parseFactorySchemaSync<ComplexObject>(
                    {
                        ...defaults,
                        value: TypeFactory.use(() => 99),
                    },
                    0,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 99,
            });
        });
        it('parses schema correctly using .use with factory', () => {
            expect(
                parseFactorySchemaSync<ComplexObject>(
                    {
                        ...defaults,
                        options: TypeFactory.use<Options>(
                            new TypeFactory<Options>({
                                type: 'none',
                            }),
                            { overrides: { type: 'all' } },
                        ),
                    },
                    0,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                options: {
                    type: 'all',
                },
            });
        });
        it('parses schema correctly using .use with batch=5', () => {
            const result = parseFactorySchemaSync<ComplexObject>(
                {
                    ...defaults,
                    options: TypeFactory.use<Options>(
                        new TypeFactory<Options>({
                            type: 'none',
                            children: TypeFactory.use(
                                new TypeFactory<ComplexObject>(defaults),

                                {
                                    batch: 5,
                                    factory: (values, iteration) => ({
                                        ...values,
                                        value: iteration,
                                    }),
                                },
                            ),
                        }),
                    ),
                },
                0,
            );
            expect(result).toStrictEqual<ComplexObject>({
                ...defaults,
                options: {
                    type: 'none',
                    children: expect.arrayContaining([
                        {
                            ...defaults,
                            value: expect.any(Number),
                        },
                    ]),
                },
            });
            expect(result.options?.children?.length).toEqual(5);
        });
        it('parses schema correctly using generator fn', () => {
            const generator = TypeFactory.iterate([1, 2, 3]);
            expect(
                parseFactorySchemaSync<ComplexObject>(
                    {
                        ...defaults,
                        value: generator,
                    },
                    0,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 1,
            });
            expect(
                parseFactorySchemaSync<ComplexObject>(
                    {
                        ...defaults,
                        value: generator,
                    },
                    1,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 2,
            });
            expect(
                parseFactorySchemaSync<ComplexObject>(
                    {
                        ...defaults,
                        value: generator,
                    },
                    2,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 3,
            });
            expect(
                parseFactorySchemaSync<ComplexObject>(
                    {
                        ...defaults,
                        value: generator,
                    },
                    4,
                ),
            ).toStrictEqual<ComplexObject>({
                ...defaults,
                value: 1,
            });
        });
    });
});

describe('validateFactorySchema', () => {
    it('throws when encountering a build proxy instance', () => {
        expect(() =>
            validateFactorySchema<ComplexObject>({
                ...defaults,
                options: TypeFactory.required() as any,
            }),
        ).toThrow(
            ERROR_MESSAGES.MISSING_BUILD_ARGS.replace(
                ':missingArgs',
                'options',
            ),
        );
    });
    it('doesnt throw for normal values', () => {
        expect(validateFactorySchema<ComplexObject>(defaults)).toEqual(
            defaults,
        );
    });
});

describe('parseOptions', () => {
    it('returns [undefined, undefined] when passed undefined', () => {
        expect(parseOptions(undefined, 1)).toEqual([undefined, undefined]);
    });
    it('returns [options, undefined] when passed options object', () => {
        const options = { key: 'value' };
        expect(parseOptions(options, 1)).toEqual([options, undefined]);
    });
    it('calls options function with iteration', () => {
        const options = jest.fn((iteration: number) => ({ key: iteration }));
        const result = parseOptions(options, 1);
        expect(options).toHaveBeenCalledWith(1);
        expect(result).toEqual([{ key: 1 }, undefined]);
    });
    describe('handles OverridesAndFactory object correctly', () => {
        it('returns both overrides and factory when passed both', () => {
            const overrides = { key: 'value' };
            const factory = jest.fn();
            expect(parseOptions({ overrides, factory }, 1)).toEqual([
                overrides,
                factory,
            ]);
        });
        it('returns [undefined, factory] when only factory is passed', () => {
            const factory = jest.fn();
            expect(parseOptions({ factory }, 1)).toEqual([undefined, factory]);
        });
        it('returns [overrides, undefined] when only overrides are passed', () => {
            const overrides = { key: 'value' };
            expect(parseOptions({ overrides }, 1)).toEqual([
                overrides,
                undefined,
            ]);
        });
        it('calls function overrides with iteration', () => {
            const overrides = jest.fn((iteration: number) => ({
                key: iteration,
            }));
            const factory = jest.fn();
            const result = parseOptions({ overrides, factory }, 1);
            expect(overrides).toHaveBeenCalledWith(1);
            expect(result).toEqual([{ key: 1 }, factory]);
        });
    });
});

describe('readFileIfExists', () => {
    let existsSyncSpy: jest.SpyInstance;
    let readFileSyncSpy: jest.SpyInstance;

    beforeEach(() => {
        existsSyncSpy = jest.spyOn(fs, 'existsSync');
        readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('returns parsed file contents if file exists', () => {
        const testData = {
            'id': 0,
            'value': 'test',
            'is-JSON': true,
        };
        existsSyncSpy.mockReturnValueOnce(true);
        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(testData));
        expect(readFileIfExists('filename')).toEqual(testData);
    });
    it('returns null if file does not exist', () => {
        existsSyncSpy.mockReturnValueOnce(false);
        expect(readFileIfExists('filename')).toBeNull();
    });
    it('throws custom error if file content cannot be parsed', () => {
        existsSyncSpy.mockReturnValueOnce(true);
        readFileSyncSpy.mockReturnValueOnce(undefined);
        expect(() => readFileIfExists('filename')).toThrow(
            ERROR_MESSAGES.FILE_READ.replace(':filePath', 'filename'),
        );
    });
});

describe('mapKeyPaths', () => {
    it('builds meaningful string[] for deep-key comparison', () => {
        const list = mapKeyPaths(annoyinglyComplexObject);
        expect(list).toEqual([
            'name',
            'value',
            'options',
            'type',
            'options.type',
            'children',
            'options.children[0].name',
            'options.children[0].value',
            'options.children[0].options.type',
            'options.children[0].options.children[0].name',
            'options.children[0].options.children[0].value',
            'arrayOfArray',
            'options.arrayOfArray[0][0][0].name',
            'options.arrayOfArray[0][0][0].value',
            'options.arrayOfArray[0][0][0].options.type',
            'options.arrayOfArray[0][0][0].options.children[0].name',
            'options.arrayOfArray[0][0][0].options.children[0].value',
        ]);
    });
});

describe('deepCompareKeys', () => {
    it('returns true if structure matches', () => {
        expect(haveSameKeyPaths(defaults, defaults)).toEqual(true);
    });
    it('returns false if structure does not match', () => {
        expect(
            haveSameKeyPaths(defaults, {
                ...defaults,
                children: undefined,
            }),
        ).toEqual(false);
    });
});

describe('validateAndNormalizeFilename', () => {
    let existsSyncSpy: jest.SpyInstance;
    let accessSyncSpy: jest.SpyInstance;
    let mkdirSyncSpy: jest.SpyInstance;

    beforeEach(() => {
        existsSyncSpy = jest.spyOn(fs, 'existsSync');
        accessSyncSpy = jest.spyOn(fs, 'accessSync');
        mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync');

        existsSyncSpy.mockImplementation(() => true);
        accessSyncSpy.mockImplementation(() => undefined);
        mkdirSyncSpy.mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('throws', () => {
        it('an error if file path is not absolute', () => {
            expect(() => validateAndNormalizeFilename('relative/path')).toThrow(
                ERROR_MESSAGES.PATH_IS_NOT_ABSOLUTE,
            );
        });
        it('throws an error if an extension other than the allowed is provided', () => {
            expect(() => validateAndNormalizeFilename('/testfile.txt')).toThrow(
                ERROR_MESSAGES.INVALID_EXTENSION.replace(
                    ':fileExtension',
                    '.txt',
                ),
            );
        });
        it('an error if empty filename is provided', () => {
            expect(() => validateAndNormalizeFilename('')).toThrow(
                ERROR_MESSAGES.MISSING_FILENAME,
            );
        });
        it('an error fixture dir cannot be created', () => {
            existsSyncSpy.mockImplementationOnce(() => false);
            mkdirSyncSpy.mockImplementationOnce(() => {
                throw new Error('');
            });
            expect(() =>
                validateAndNormalizeFilename('/imaginary/path/name'),
            ).toThrow(
                ERROR_MESSAGES.DIR_WRITE.replace(
                    ':filePath',
                    '/imaginary/path/__fixtures__/',
                ).replace(':fileError', ': {}'),
            );
        });
    });

    describe('correctly', () => {
        it('creates __fixtures__ dir if it does not exist', () => {
            existsSyncSpy.mockReturnValueOnce(false);
            validateAndNormalizeFilename('/imaginary/path/name');
            expect(mkdirSyncSpy).toHaveBeenCalled();
            existsSyncSpy.mockReset();
        });
        it('does not throw if __fixtures__ dir already exists', () => {
            expect(() =>
                validateAndNormalizeFilename('/imaginary/path/name'),
            ).not.toThrow();
            expect(mkdirSyncSpy).not.toHaveBeenCalled();
        });
        it('detects a file name at the end of the file path', () => {
            existsSyncSpy.mockReturnValueOnce(true);
            expect(
                validateAndNormalizeFilename('/imaginary/path/name.json'),
            ).toEqual('/imaginary/path/__fixtures__/name.json');
        });
        it('detects a file path without a file name', () => {
            existsSyncSpy.mockReturnValueOnce(true);
            expect(
                validateAndNormalizeFilename('/imaginary/path/name'),
            ).toEqual('/imaginary/path/__fixtures__/name.json');
        });
        it('does not append .json extension, if provided', () => {
            expect(validateAndNormalizeFilename('/dev/filename.JSON')).toEqual(
                '/dev/__fixtures__/filename.json',
            );
        });
        it('appends .json extension if not provided', () => {
            expect(validateAndNormalizeFilename('/dev/filename')).toEqual(
                '/dev/__fixtures__/filename.json',
            );
        });
        it('appends .json extension if .spec provided', () => {
            expect(validateAndNormalizeFilename('/dev/filename.spec')).toEqual(
                '/dev/__fixtures__/filename.spec.json',
            );
        });
        it('appends .json extension if .test provided', () => {
            expect(validateAndNormalizeFilename('/dev/filename.test')).toEqual(
                '/dev/__fixtures__/filename.test.json',
            );
        });
        it('supports .json extension with sub-dot-notation', () => {
            expect(
                validateAndNormalizeFilename(
                    '/dev/filename.some.other.info.json',
                ),
            ).toEqual('/dev/__fixtures__/filename.some.other.info.json');
        });
    });
});
