import globals from 'globals';
import react from 'eslint-plugin-react';

// Focus this gate on missing bindings: Vite can build successfully even when a
// component or hook is undefined and will crash as soon as that UI is opened.
export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: { react },
    rules: {
      'no-undef': ['error', { typeof: true }],
      'react/jsx-no-undef': 'error',
    },
  },
  {
    files: ['src/**/*.test.{js,jsx}'],
    languageOptions: { globals: globals.node },
  },
];
