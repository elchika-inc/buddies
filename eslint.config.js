import js from '@eslint/js'
import typescript from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

/**
 * Buddies プロジェクト統一ESLint設定
 * 全ワークスペースで共有するベース設定
 */
export default [
  js.configs.recommended,
  ...typescript.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: typescript.parser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // TypeScript ルール
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error', // any型を完全禁止
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // 一般的なルール
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    // 各ワークスペースの設定で上書き可能な除外パターン
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.wrangler/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
    ],
  },
]