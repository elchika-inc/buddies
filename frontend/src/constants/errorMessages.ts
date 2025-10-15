/**
 * エラーメッセージ定数
 * アプリケーション全体で使用するエラーメッセージを一元管理
 */

export const ERROR_MESSAGES = {
  // HTTP/ネットワークエラー
  HTTP_ERROR: (status: number) => `通信エラーが発生しました (ステータス: ${status})`,
  NETWORK_ERROR: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
  TIMEOUT_ERROR: 'リクエストがタイムアウトしました。時間をおいて再度お試しください',

  // APIエラー
  FETCH_PETS_FAILED: 'ペット情報の取得に失敗しました',
  FETCH_PET_DETAIL_FAILED: 'ペットの詳細情報の取得に失敗しました',
  INVALID_RESPONSE: 'サーバーから不正なレスポンスを受信しました',
  API_KEY_MISSING: 'API認証情報が設定されていません',

  // データエラー
  PARSE_ERROR: 'データの解析に失敗しました',
  VALIDATION_ERROR: 'データの検証に失敗しました',

  // お気に入り関連
  FAVORITES_LOAD_FAILED: 'お気に入りの読み込みに失敗しました',
  FAVORITES_SAVE_FAILED: 'お気に入りの保存に失敗しました',

  // LocalStorageエラー
  STORAGE_ERROR: 'データの保存に失敗しました',
  STORAGE_QUOTA_EXCEEDED: 'ストレージの容量が不足しています',
  STORAGE_NOT_AVAILABLE: 'ストレージが利用できません',

  // 位置情報エラー
  LOCATION_PARSE_ERROR: '住所の解析に失敗しました',
  INVALID_PREFECTURE: '都道府県が不正です',

  // 画像エラー
  IMAGE_LOAD_FAILED: '画像の読み込みに失敗しました',

  // 汎用エラー
  UNKNOWN_ERROR: '予期しないエラーが発生しました',
  FEATURE_NOT_AVAILABLE: 'この機能は現在利用できません',
} as const

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES
