import path from 'node:path';
import { fileURLToPath } from 'node:url';
import eslintJS from '@eslint/js';
import eslintPluginJsdoc from 'eslint-plugin-jsdoc';
import eslintPluginNode from 'eslint-plugin-n';
import eslintPluginPerfectionist from 'eslint-plugin-perfectionist';
import eslintPluginPromise from 'eslint-plugin-promise';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';
import eslintPluginVitest from 'eslint-plugin-vitest';
import globals from 'globals';
import eslintTS from 'typescript-eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default eslintTS.config(
    eslintJS.configs.recommended,
    ...eslintTS.configs.strictTypeChecked,
    ...eslintTS.configs.stylisticTypeChecked,
    eslintPluginNode.configs['flat/recommended-module'],
    eslintPluginPromise.configs['flat/recommended'],
    eslintPluginUnicorn.configs.recommended,
    eslintPluginPerfectionist.configs['recommended-alphabetical'],
    eslintPluginJsdoc.configs['flat/recommended-typescript'],
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            'unused-imports': eslintPluginUnusedImports,
        },
        rules: {
            '@typescript-eslint/array-type': ['error', { default: 'array' }],
            '@typescript-eslint/consistent-indexed-object-style': 'error',
            '@typescript-eslint/consistent-type-definitions': 'warn',
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    custom: {
                        match: false,
                        regex: '^[IT][A-Z]',
                    },
                    format: ['PascalCase'],
                    selector: 'interface',
                },
                {
                    custom: {
                        match: false,
                        regex: '^[IT][A-Z]',
                    },
                    format: ['PascalCase'],
                    selector: 'typeAlias',
                },
                {
                    format: ['PascalCase'],
                    selector: 'enumMember',
                },
                {
                    custom: {
                        match: true,
                        regex: '^[A-Z]$',
                    },
                    format: ['PascalCase'],
                    selector: 'typeParameter',
                },
            ],
            '@typescript-eslint/no-extra-non-null-assertion': 'error',
            '@typescript-eslint/no-floating-promises': [
                'error',
                { ignoreIIFE: true, ignoreVoid: true },
            ],
            '@typescript-eslint/no-for-in-array': 'error',
            '@typescript-eslint/no-inferrable-types': 'error',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-redundant-type-constituents': 'warn',
            '@typescript-eslint/no-require-imports': 'warn',
            '@typescript-eslint/no-this-alias': 'error',
            '@typescript-eslint/no-unnecessary-boolean-literal-compare':
                'error',
            '@typescript-eslint/no-unnecessary-condition': 'error',
            '@typescript-eslint/no-unnecessary-qualifier': 'warn',
            '@typescript-eslint/no-unnecessary-type-arguments': 'error',
            '@typescript-eslint/no-unused-expressions': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { args: 'all', argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-useless-constructor': 'warn',
            '@typescript-eslint/no-useless-empty-export': 'warn',
            '@typescript-eslint/prefer-as-const': 'warn',
            '@typescript-eslint/prefer-for-of': 'warn',
            '@typescript-eslint/prefer-includes': 'warn',
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/switch-exhaustiveness-check': 'warn',
            '@typescript-eslint/unified-signatures': 'off',
            'curly': 'error',
            'eqeqeq': 'error',
            // JSDoc rules
            'jsdoc/require-jsdoc': 'off', // We don't require JSDoc on everything
            'jsdoc/require-param-description': 'off', // Param names are often self-explanatory
            'jsdoc/require-returns-description': 'off', // Return descriptions can be redundant
            'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }], // Allow blank lines in JSDoc
            'n/no-extraneous-import': 'off',
            'n/no-missing-import': 'off',
            'n/no-process-exit': 'error',
            'n/no-unsupported-features/node-builtins': 'off',
            'no-console': 'warn',
            'no-unused-vars': 'off',
            'object-shorthand': 'error',
            'perfectionist/sort-exports': [
                'error',
                {
                    order: 'asc',
                    type: 'natural',
                },
            ],
            'perfectionist/sort-imports': 'off',
            'perfectionist/sort-named-imports': [
                'error',
                {
                    order: 'asc',
                    type: 'natural',
                },
            ],
            'prefer-const': ['error', { destructuring: 'all' }],
            'prefer-destructuring': 'error',
            'prefer-template': 'warn',
            'unicorn/catch-error-name': 'off',
            'unicorn/explicit-length-check': 'off',
            'unicorn/filename-case': 'off',
            'unicorn/new-for-builtins': 'off',
            'unicorn/no-array-callback-reference': 'off',
            'unicorn/no-array-for-each': 'off',
            'unicorn/no-array-reduce': 'off',
            'unicorn/no-nested-ternary': 'off',
            'unicorn/no-null': 'off',
            'unicorn/no-process-exit': 'off',
            'unicorn/no-useless-undefined': 'off',
            'unicorn/prefer-module': 'off',
            'unicorn/prefer-string-raw': 'off',
            'unicorn/prevent-abbreviations': 'off',
            'unused-imports/no-unused-imports': 'error',
        },
    },
    {
        extends: [eslintTS.configs.disableTypeChecked],
        files: ['**/*.js', '**/*.cjs', '**/*.mjs', 'eslint.config.mjs'],
    },
    {
        files: ['**/*.spec.{ts,tsx}'],
        plugins: {
            vitest: eslintPluginVitest,
        },
        rules: {
            ...eslintPluginVitest.configs.recommended.rules,
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-implied-eval': 'off',
            '@typescript-eslint/no-magic-numbers': 'off',
            '@typescript-eslint/no-misused-promises': [
                'error',
                {
                    checksVoidReturn: false,
                },
            ],
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/prefer-as-const': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/unbound-method': 'off',
            'import-x/no-named-as-default': 'off',
            'import-x/no-named-as-default-member': 'off',
            'prefer-rest-params': 'off',
            'react-perf/jsx-no-new-array-as-prop': 'off',
            'unicorn/consistent-function-scoping': 'off',
            'unicorn/error-message': 'off',
            'unicorn/no-await-expression-member': 'off',
        },
    },
    {
        files: ['examples/**/*.ts', 'examples/**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: './examples/tsconfig.json',
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'n/no-unpublished-import': 'off',
            'no-console': 'off',
            'unicorn/prefer-top-level-await': 'off',
        },
    },
    {
        ignores: ['out', 'dist', 'node_modules', 'target', 'coverage', 'docs'],
    },
);
