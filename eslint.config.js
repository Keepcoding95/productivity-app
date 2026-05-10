import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        ignores: ['**/node_modules/**', '**/vendor/**', '**/public/build/**'],
    },
    {
        files: ['resources/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                localStorage: 'readonly',
                CustomEvent: 'readonly',
                AbortController: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                history: 'readonly',
                FormData: 'readonly',
                Blob: 'readonly',
                FileReader: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                console: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
];
