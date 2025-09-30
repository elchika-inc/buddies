import baseConfig from '../eslint.config.js'

/**
 * Frontend ワークスペース固有のESLint設定
 * Next.js用の拡張設定
 */
export default [
  ...baseConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Next.js固有の設定
      'react/react-in-jsx-scope': 'off', // Next.jsでは不要
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // フロントエンドでは条件付きでconsole.logを許可
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
]