import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['dist/**', 'node_modules/**']
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            // Extension scripts are loaded as classic scripts, not ES modules.
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.webextensions
            }
        },
        rules: {
            // The codebase still has some intentionally unused params/catch bindings;
            // surface them as warnings rather than failing the lint.
            'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
            'no-empty': ['warn', { allowEmptyCatch: true }]
        }
    }
];
