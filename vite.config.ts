import path from 'node:path';

import type { PackageJson } from 'type-fest';
import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';

import manifest from './package.json';

const { name } = manifest as PackageJson;
export default defineConfig({
    build: {
        lib: {
            entry: {
                index: path.resolve(__dirname, 'src/index.ts'),
                'json-schema': path.resolve(__dirname, 'src/json-schema.ts'),
                zod: path.resolve(__dirname, 'src/zod.ts'),
            },
            fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'js'}`,
            formats: ['es', 'cjs'],
            name,
        },
        minify: true,
        rollupOptions: {
            external: ['ajv', 'ajv-formats', 'zod', 'node:crypto', 'node:fs', 'node:path'],
            output: {
                preserveModules: false,
            },
        },
        sourcemap: true,
        target: 'es2020',
    },
    plugins: [
        dts({
            // unplugin-dts hands api-extractor the installed typescript package as its compiler folder, but
            // TypeScript 7 ships no lib .d.ts files, so globals such as Error stop resolving. Unset it so
            // api-extractor reads the lib files of the TypeScript it bundles. ~keep
            bundleTypes: { invokeOptions: { typescriptCompilerFolder: undefined } },
        }),
    ],
    test: {
        coverage: {
            exclude: ['node_modules/**', 'dist/**'],
            reporter: ['text', 'lcov'],
        },
        globals: true,
        include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts'],
    },
});
