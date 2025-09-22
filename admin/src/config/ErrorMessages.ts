/**
 * プロジェクト全体のエラーメッセージ定義
 * 一貫性のあるユーザー体験を提供するための標準化されたメッセージ
 */

export const ERROR_MESSAGES = {
  /**
   * 認証・認可関連
   */
  auth: {
    unauthorized: '認証が必要です',
    forbidden: 'このリソースへのアクセス権限がありません',
    invalidCredentials: '認証情報が無効です',
    tokenExpired: '認証トークンの有効期限が切れています',
    invalidToken: '無効な認証トークンです',
    missingToken: '認証トークンが見つかりません',
    insufficientPermissions: '操作を実行する権限が不足しています',
  },

  /**
   * バリデーション関連
   */
  validation: {
    required: (field: string) => `${field}は必須項目です`,
    minLength: (field: string, min: number) => `${field}は${min}文字以上で入力してください`,
    maxLength: (field: string, max: number) => `${field}は${max}文字以下で入力してください`,
    pattern: (field: string) => `${field}の形式が正しくありません`,
    email: 'メールアドレスの形式が正しくありません',
    url: 'URLの形式が正しくありません',
    number: '数値を入力してください',
    integer: '整数を入力してください',
    positive: '正の数を入力してください',
    range: (min: number, max: number) => `${min}から${max}の範囲で入力してください`,
    unique: (field: string) => `この${field}は既に使用されています`,
    invalid: (field: string) => `${field}が無効です`,
  },

  /**
   * データベース関連
   */
  database: {
    connectionFailed: 'データベースへの接続に失敗しました',
    queryFailed: 'クエリの実行に失敗しました',
    transactionFailed: 'トランザクションの処理に失敗しました',
    recordNotFound: 'レコードが見つかりません',
    duplicateKey: '重複するキーが存在します',
    constraintViolation: 'データ制約違反が発生しました',
    timeout: 'データベース処理がタイムアウトしました',
  },

  /**
   * API関連
   */
  api: {
    networkError: 'ネットワークエラーが発生しました',
    serverError: 'サーバーエラーが発生しました',
    clientError: 'リクエストにエラーがあります',
    timeout: 'リクエストがタイムアウトしました',
    rateLimited: 'リクエスト数の制限に達しました',
    methodNotAllowed: 'このメソッドは許可されていません',
    endpointNotFound: 'エンドポイントが見つかりません',
    badRequest: '不正なリクエストです',
    serviceUnavailable: 'サービスが一時的に利用できません',
  },

  /**
   * ファイル関連
   */
  file: {
    notFound: 'ファイルが見つかりません',
    readFailed: 'ファイルの読み込みに失敗しました',
    writeFailed: 'ファイルの書き込みに失敗しました',
    deleteFailed: 'ファイルの削除に失敗しました',
    invalidFormat: 'ファイル形式が正しくありません',
    sizeTooLarge: (maxSize: string) => `ファイルサイズは${maxSize}以下にしてください`,
    uploadFailed: 'ファイルのアップロードに失敗しました',
    downloadFailed: 'ファイルのダウンロードに失敗しました',
  },

  /**
   * ビジネスロジック関連
   */
  business: {
    operationFailed: '操作に失敗しました',
    invalidOperation: '無効な操作です',
    resourceNotFound: 'リソースが見つかりません',
    resourceAlreadyExists: 'リソースは既に存在します',
    dependencyExists: '依存関係が存在するため削除できません',
    quotaExceeded: '利用制限を超えています',
    maintenanceMode: 'メンテナンス中です',
  },

  /**
   * 汎用メッセージ
   */
  generic: {
    unknownError: '予期しないエラーが発生しました',
    tryAgainLater: '後でもう一度お試しください',
    contactSupport: 'サポートにお問い合わせください',
    loading: '読み込み中...',
    saving: '保存中...',
    deleting: '削除中...',
    processing: '処理中...',
  },
} as const

/**
 * 成功メッセージ定義
 */
export const SUCCESS_MESSAGES = {
  /**
   * CRUD操作
   */
  crud: {
    created: 'データを作成しました',
    updated: 'データを更新しました',
    deleted: 'データを削除しました',
    saved: 'データを保存しました',
    loaded: 'データを読み込みました',
  },

  /**
   * 認証関連
   */
  auth: {
    loggedIn: 'ログインしました',
    loggedOut: 'ログアウトしました',
    passwordChanged: 'パスワードを変更しました',
    emailVerified: 'メールアドレスを確認しました',
  },

  /**
   * ファイル関連
   */
  file: {
    uploaded: 'ファイルをアップロードしました',
    downloaded: 'ファイルをダウンロードしました',
    deleted: 'ファイルを削除しました',
  },

  /**
   * 汎用
   */
  generic: {
    operationCompleted: '操作が完了しました',
    settingsSaved: '設定を保存しました',
    dataSynced: 'データを同期しました',
  },
} as const

/**
 * エラーコード定義
 */
export enum ErrorCode {
  // 認証・認可
  UNAUTHORIZED = 'AUTH_001',
  FORBIDDEN = 'AUTH_002',
  TOKEN_EXPIRED = 'AUTH_003',
  INVALID_TOKEN = 'AUTH_004',

  // バリデーション
  VALIDATION_ERROR = 'VAL_001',
  REQUIRED_FIELD = 'VAL_002',
  INVALID_FORMAT = 'VAL_003',

  // データベース
  DB_CONNECTION_ERROR = 'DB_001',
  DB_QUERY_ERROR = 'DB_002',
  RECORD_NOT_FOUND = 'DB_003',
  DUPLICATE_KEY = 'DB_004',

  // API
  NETWORK_ERROR = 'API_001',
  SERVER_ERROR = 'API_002',
  RATE_LIMITED = 'API_003',
  TIMEOUT = 'API_004',

  // ビジネスロジック
  OPERATION_FAILED = 'BIZ_001',
  RESOURCE_NOT_FOUND = 'BIZ_002',
  QUOTA_EXCEEDED = 'BIZ_003',

  // 汎用
  UNKNOWN_ERROR = 'GEN_001',
}

/**
 * エラーレスポンスのフォーマッター
 */
export class ErrorFormatter {
  /**
   * 標準エラーレスポンスを生成
   */
  static format(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    details?: any
  ): {
    error: {
      message: string
      code: string
      timestamp: string
      details?: any
    }
  } {
    return {
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
        ...(details && { details }),
      },
    }
  }

  /**
   * バリデーションエラーレスポンスを生成
   */
  static formatValidation(
    errors: Record<string, string[]>
  ): {
    error: {
      message: string
      code: string
      timestamp: string
      fields: Record<string, string[]>
    }
  } {
    return {
      error: {
        message: 'バリデーションエラーが発生しました',
        code: ErrorCode.VALIDATION_ERROR,
        timestamp: new Date().toISOString(),
        fields: errors,
      },
    }
  }

  /**
   * HTTPステータスコードからメッセージを取得
   */
  static fromHttpStatus(status: number): string {
    switch (status) {
      case 400:
        return ERROR_MESSAGES.api.badRequest
      case 401:
        return ERROR_MESSAGES.auth.unauthorized
      case 403:
        return ERROR_MESSAGES.auth.forbidden
      case 404:
        return ERROR_MESSAGES.business.resourceNotFound
      case 429:
        return ERROR_MESSAGES.api.rateLimited
      case 500:
        return ERROR_MESSAGES.api.serverError
      case 503:
        return ERROR_MESSAGES.api.serviceUnavailable
      default:
        return ERROR_MESSAGES.generic.unknownError
    }
  }
}