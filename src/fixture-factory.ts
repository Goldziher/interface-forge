import { ERROR_MESSAGES } from './constants';
import { FactoryBuildOptions, FactoryFunction, FactoryOptions } from './types';
import { TypeFactory } from './type-factory';
import {
    haveSameKeyPaths,
    readFileIfExists,
    validateAndNormalizeFilename,
    validateFilePath,
} from './utils/file';
import fs from 'fs';
import path from 'path';

export class FixtureFactory<T> extends TypeFactory<T> {
    private readonly filePath: string;

    constructor(
        filePath: string,
        defaults: FactoryOptions<T>,
        factory?: FactoryFunction<T>,
    ) {
        super(defaults, factory);
        this.filePath = validateFilePath(filePath);
    }

    private getOrCreateFixture(fileName: string, build: T | T[]): T | T[] {
        const filePath = path.join(
            this.filePath,
            validateAndNormalizeFilename(fileName),
        );
        const data = readFileIfExists<T>(filePath);
        try {
            if (data && haveSameKeyPaths(build, data)) {
                return data;
            }
            fs.writeFileSync(filePath, JSON.stringify(build));
            return build;
        } catch {
            throw new Error(
                ERROR_MESSAGES.FILE_WRITE.replace(':filePath', filePath),
            );
        }
    }

    async fixture(
        fileName: string,
        options?: FactoryBuildOptions<T>,
    ): Promise<T> {
        const instance = await this.build(options);
        return this.getOrCreateFixture(fileName, instance) as T;
    }

    fixtureSync(fileName: string, options?: FactoryBuildOptions<T>): T {
        const instance = this.buildSync(options);
        return this.getOrCreateFixture(fileName, instance) as T;
    }

    async fixtureBatch(
        fileName: string,
        size: number,
        options?: FactoryBuildOptions<T>,
    ): Promise<T[]> {
        const batch = await this.batch(size, options);
        return this.getOrCreateFixture(fileName, batch) as T[];
    }

    fixtureBatchSync(
        fileName: string,
        size: number,
        options?: FactoryBuildOptions<T>,
    ): T[] {
        const batch = this.batchSync(size, options);
        return this.getOrCreateFixture(fileName, batch) as T[];
    }
}
