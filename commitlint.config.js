// feat      new feature
// fix       bug fix
// refactor  code change without behavior change
// test      tests
// docs      documentation
// chore     maintenance/config
// ci        CI/CD changes
// perf      performance improvement
// style     formatting only
// revert    revert previous change

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'scope-parentheses-not-empty': ({ header }) => [
          !/^[^:]+\(\):/.test(header),
          'scope parentheses must not be empty',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'ci', 'perf', 'style', 'revert'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'users',
        'roles',
        'customers',
        'vendors',
        'products',
        'skus',
        'inventory',
        'lots',
        'boxes',
        'orders',
        'allocations',
        'shipments',
        'logistics',
        'bol',
        'packing-slips',
        'invoices',
        'credits',
        'reconciliation',
        'commissions',
        'margins',
        'quickbooks',
        'hubspot',
        'fresho',
        'sheets',
        'email-parser',
        'notifications',
        'dashboards',
        'reports',
        'forecasting',
        'migration',
        'mana-transition',
        'audit',
        'api',
        'web',
        'workers',
        'infra',
        'docs',
        'shared',
        'root',
      ],
    ],
    'type-case': [2, 'always', 'lowercase'],
    'scope-case': [2, 'always', 'lowercase'],
    'scope-parentheses-not-empty': [2, 'always'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
  },
};
