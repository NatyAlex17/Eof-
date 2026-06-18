import baseConfig from './base.js';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
      '@typescript-eslint/explicit-function-return-types': 'warn',
    },
  },
];
