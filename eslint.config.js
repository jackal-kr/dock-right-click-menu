// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import js from '@eslint/js';

// Globals that GNOME Shell / GJS provide to extensions.
const gjsGlobals = Object.fromEntries([
    'global', 'imports', 'log', 'logError', 'print', 'printerr', 'console',
    'TextDecoder', 'TextEncoder', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
].map(name => [name, 'readonly']));

export default [
    {ignores: ['node_modules/', 'dist/']},
    js.configs.recommended,
    {
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: gjsGlobals,
        },
        rules: {
            'indent': ['error', 4, {SwitchCase: 0}],
            'quotes': ['error', 'single', {avoidEscape: true}],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
            'eqeqeq': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-unused-vars': ['error', {argsIgnorePattern: '^_', caughtErrors: 'none'}],
        },
    },
    {
        // Node.js test files.
        files: ['tests/**/*.mjs'],
        languageOptions: {globals: {console: 'readonly'}},
    },
];
