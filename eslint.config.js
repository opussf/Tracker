const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
      }
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      'semi': ['warn', 'always'],
      "eqeqeq": ["error", "always", { "null": "ignore" }],
    }
  }
];
