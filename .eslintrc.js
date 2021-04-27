module.exports = {
  env: {
    es6: true,
    node: true,
    jest: true,
    browser: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  extends: ['plugin:react/recommended', 'plugin:@typescript-eslint/eslint-recommended', 'prettier'],
  ignorePatterns: ['**/node_modules/**', '**/dist/**'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-unreachable': 'off',
    'no-console': ['warn'],
  },
};
