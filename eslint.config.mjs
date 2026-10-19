import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const FIREBASE_CLIENT = {
  group: [
    'firebase',
    'firebase/*',
    'firebase-admin',
    'firebase-admin/*',
    'firebase-functions',
    'firebase-functions/*',
  ],
};
const REACT = { group: ['react', 'react-dom', 'react-native', 'react-native/*', 'expo', 'expo-*'] };

/** Layering rules from docs/architecture.md section 1.1. */
const layer = (patterns) => ({ rules: { 'no-restricted-imports': ['error', { patterns }] } });

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'functions/lib/**',
      '**/.expo/**',
      'coverage/**',
      'docs/**',
      'apps/mobile/assets/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  { files: ['**/*.mjs'], languageOptions: { sourceType: 'module' } },
  {
    files: ['**/*.{test,spec}.ts', '**/*.{test,spec}.tsx'],
    languageOptions: { globals: globals.jest },
  },
  // ui: no firebase, no repo
  {
    files: ['apps/*/src/features/*/ui/**/*.{ts,tsx}'],
    ...layer([
      FIREBASE_CLIENT,
      {
        group: ['**/repo', '**/repo/*'],
        message: 'ui must not import repo; go through controller.',
      },
    ]),
  },
  // controller: no firebase, no react-native / react UI libs (hooks may use react)
  {
    files: ['apps/*/src/features/*/controller/**/*.{ts,tsx}', 'functions/src/*/controller/**/*.ts'],
    ...layer([FIREBASE_CLIENT, { group: ['react-native', 'react-native/*', 'expo', 'expo-*'] }]),
  },
  // repo: no React
  {
    files: ['apps/*/src/features/*/repo/**/*.{ts,tsx}', 'functions/src/*/repo/**/*.ts'],
    ...layer([REACT]),
  },
  prettier,
);
