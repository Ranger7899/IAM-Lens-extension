import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '.output/**',
      '.output-*/**',
      'test-results*/**',
      '.wxt/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'data/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node, chrome: 'readonly' } } },
  prettier,
);
