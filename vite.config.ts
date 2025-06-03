import path from 'node:path';

import { PackageJson } from 'type-fest';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import manifest from './package.json';

const { name } = manifest as PackageJson;
export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
            formats: ['es', 'cjs'],
            name,
        },
        minify: true,
        rollupOptions: {
            output: {
                preserveModules: false,
            },
        },
        sourcemap: true,
        target: 'es2020',
    },
    plugins: [dts({ rollupTypes: true })],
    test: {
        coverage: {
            exclude: ['node_modules/**', 'dist/**'],
            reporter: ['text', 'lcov'],
        },
        globals: true,
        include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts'],
    },
});
