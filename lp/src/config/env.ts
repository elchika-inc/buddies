/**
 * 環境変数の一元管理
 *
 * すべての環境変数はこのファイルで定義し、デフォルト値を管理します。
 * これにより、環境変数の変更時の影響範囲を1箇所に限定できます。
 */

const getEnvVar = (key: string, fallback: string): string => {
  return process.env[key] || fallback
}

export const env = {
  /** サイトURL（ランディングページ） */
  SITE_URL: getEnvVar('NEXT_PUBLIC_SITE_URL', 'https://buddies.elchika.app'),

  /** アプリケーションURL */
  APP: {
    /** 保護犬アプリURL */
    DOG: getEnvVar('NEXT_PUBLIC_APP_URL_DOG', 'https://buddies-dogs.elchika.app'),

    /** 保護猫アプリURL */
    CAT: getEnvVar('NEXT_PUBLIC_APP_URL_CAT', 'https://buddies-cats.elchika.app'),
  },

  /** Google Site Verification（オプショナル） */
  GOOGLE_SITE_VERIFICATION: process.env['NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION'],
} as const

export type Env = typeof env
