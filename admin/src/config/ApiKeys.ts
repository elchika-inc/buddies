// API Keys モジュール設定定数
export const API_CONFIG = {
  CACHE: {
    TTL_SECONDS: 3600, // 1時間
  },
  ERRORS: {
    UNAUTHORIZED: '認証に失敗しました。マスターシークレットを確認してください。',
    KEY_NOT_FOUND: 'APIキーが見つかりません。',
    CREATION_FAILED: 'APIキーの作成に失敗しました。',
    DELETION_FAILED: 'APIキーの削除に失敗しました。',
    ROTATION_FAILED: 'APIキーのローテーションに失敗しました。',
    LIST_FAILED: 'APIキーの一覧取得に失敗しました。',
  },
  DOCUMENTATION_URL: 'https://docs.buddies.com/api-keys',
} as const

// APIキー生成
export const generateApiKey = (): string => {
  const uuid1 = crypto.randomUUID().replace(/-/g, '')
  const uuid2 = crypto.randomUUID().replace(/-/g, '')
  return uuid1 + uuid2
}

// 有効期限の計算
export const calculateExpiryDate = (daysFromNow: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString()
}

// 有効期限チェック
export const isExpired = (expiresAt?: string | null): boolean => {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}
