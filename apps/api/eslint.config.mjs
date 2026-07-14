import rootConfig from '../../eslint.config.js';

export default [
  ...rootConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },
];
