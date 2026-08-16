import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import jestPlugin from 'eslint-plugin-jest';
import globals from 'globals';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default defineConfig([
    {
        ignores: ['coverage/**', 'node_modules/**'],
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
            },
        },
    },
    ...compat.extends('airbnb-base').map((config) => ({
        ...config,
        files: ['src/**/*.js', '__tests__/**/*.js'],
    })),
    {
        files: ['src/**/*.js', '__tests__/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            indent: ['error', 4],
            'import/extensions': ['error', 'ignorePackages', { js: 'always' }],
            'max-len': ['error', 120],
            'no-console': 'off',
            'no-script-url': 'off',
        },
    },
    {
        files: ['__tests__/**/*.test.js'],
        plugins: { jest: jestPlugin },
        extends: ['jest/flat/recommended'],
        settings: {
            jest: {
                version: 30,
            },
        },
    },
]);
