// API Keys モジュール設定定数
export const API_CONFIG = {
  CACHE: {
    TTL_SECONDS: 3600, // 1時間
    RATE_LIMIT_TTL_SECONDS: 60, // 1分
  },
  RATE_LIMIT: {
    WINDOW_SECONDS: 60, // 1分
    DEFAULT_LIMIT: 100,
  },
  ERRORS: {
    INVALID_KEY: 'APIキーが無効です。正しいキーを確認してください。',
    EXPIRED_KEY: 'APIキーの有効期限が切れています。新しいキーを取得してください。',
    RATE_LIMIT_EXCEEDED: 'レート制限に達しました。しばらく待ってから再試行してください。',
    INSUFFICIENT_PERMISSIONS: '権限が不足しています。必要な権限を確認してください。',
    UNAUTHORIZED: '認証に失敗しました。マスターシークレットを確認してください。',
    KEY_NOT_FOUND: 'APIキーが見つかりません。',
    VALIDATION_FAILED: '検証に失敗しました。リクエストの形式を確認してください。',
    CREATION_FAILED: 'APIキーの作成に失敗しました。',
    DELETION_FAILED: 'APIキーの削除に失敗しました。',
    ROTATION_FAILED: 'APIキーのローテーションに失敗しました。',
    HEALTH_CHECK_FAILED: 'ヘルスチェックに失敗しました。システム状態を確認してください。',
    LIST_FAILED: 'APIキーの一覧取得に失敗しました。',
  },
  DOCUMENTATION_URL: 'https://docs.pawmatch.com/api-keys',
} as const;

// レート制限ウィンドウの計算
export const getRateLimitWindow = (timestamp: number = Date.now()): string => {
  return Math.floor(timestamp / (API_CONFIG.RATE_LIMIT.WINDOW_SECONDS * 1000)).toString();
};

// APIキー生成
export const generateApiKey = (): string => {
  const uuid1 = crypto.randomUUID().replace(/-/g, '');
  const uuid2 = crypto.randomUUID().replace(/-/g, '');
  return uuid1 + uuid2;
};

// 有効期限の計算
export const calculateExpiryDate = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

// 有効期限チェック
export const isExpired = (expiresAt?: string | null): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};