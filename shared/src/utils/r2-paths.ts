/**
 * R2ストレージのパス定義を一元管理
 * TypeScript/JavaScript両方から利用可能
 */

// ペットタイプの定義
export type PetType = 'dog' | 'cat'

// 画像フォーマットの定義
export type ImageFormat = 'screenshot' | 'original' | 'optimized'

/**
 * R2パス定義オブジェクト
 * JavaScript環境でも使用できるよう、関数型で定義
 */
export const R2_PATHS = {
  /**
   * ペット関連のパス
   */
  pets: {
    /**
     * スクリーンショット画像のパス
     * @example pets/dogs/12345/screenshot.png
     */
    screenshot: (type: PetType, id: string): string =>
      `pets/${type}s/${id}/screenshot.png`,

    /**
     * オリジナル画像（JPEG変換後）のパス
     * @example pets/cats/67890/original.jpg
     */
    original: (type: PetType, id: string): string =>
      `pets/${type}s/${id}/original.jpg`,

    /**
     * 最適化画像（WebP）のパス
     * @example pets/dogs/12345/optimized.webp
     */
    optimized: (type: PetType, id: string): string =>
      `pets/${type}s/${id}/optimized.webp`,

    /**
     * ペット画像の汎用パス生成
     */
    image: (type: PetType, id: string, format: ImageFormat): string => {
      const formatMap = {
        screenshot: 'screenshot.png',
        original: 'original.jpg',
        optimized: 'optimized.webp',
      }
      return `pets/${type}s/${id}/${formatMap[format]}`
    },

    /**
     * ペットディレクトリのプレフィックス
     * @example pets/dogs/12345/
     */
    directory: (type: PetType, id: string): string =>
      `pets/${type}s/${id}/`,

    /**
     * タイプ別のプレフィックス
     * @example pets/dogs/
     */
    typePrefix: (type: PetType): string =>
      `pets/${type}s/`,
  },

  /**
   * アップロード関連のパス（将来の拡張用）
   */
  uploads: {
    /**
     * 一時ファイルのパス
     */
    temp: (filename: string): string =>
      `uploads/temp/${filename}`,

    /**
     * 処理済みファイルのパス
     */
    processed: (filename: string): string =>
      `uploads/processed/${filename}`,
  },

  /**
   * 旧形式のパス（後方互換性のため残す）
   * @deprecated 新規コードでは使用しないこと
   */
  legacy: {
    /**
     * 旧形式のオリジナル画像パス
     * @example dogs/originals/12345.jpg
     */
    original: (type: PetType, id: string): string =>
      `${type}s/originals/${id}.jpg`,

    /**
     * 旧形式の最適化画像パス
     * @example cats/optimized/67890.webp
     */
    optimized: (type: PetType, id: string): string =>
      `${type}s/optimized/${id}.webp`,
  },
} as const

/**
 * R2パスビルダークラス
 * 既存のUrlBuilder.tsから移行
 */
export class R2PathBuilder {
  /**
   * ペット画像のパスを生成
   */
  static petImagePath(
    petType: PetType,
    petId: string,
    format: 'original' | 'optimized' | 'screenshot'
  ): string {
    return R2_PATHS.pets.image(petType, petId, format)
  }

  /**
   * ペット画像のフルURLを生成（CDN用）
   */
  static petImageUrl(
    bucketName: string,
    petType: PetType,
    petId: string,
    format: 'original' | 'optimized' | 'screenshot'
  ): string {
    const path = R2PathBuilder.petImagePath(petType, petId, format)
    return `https://${bucketName}.r2.dev/${path}`
  }

  /**
   * パスからペット情報を抽出
   * @example pets/dogs/12345/screenshot.png -> { type: 'dog', id: '12345', format: 'screenshot' }
   */
  static parsePetPath(path: string): { type: PetType, id: string, format?: string } | null {
    // pets/dogs/12345/screenshot.png
    const match = path.match(/pets\/(dogs|cats)\/([^\/]+)\/([^\/]+)/)
    if (!match || !match[1] || !match[2] || !match[3]) return null

    const type: PetType = match[1] === 'dogs' ? 'dog' : 'cat'
    const id: string = match[2]
    const filename: string = match[3]

    let format: string | undefined
    if (filename === 'screenshot.png') format = 'screenshot'
    else if (filename === 'original.jpg') format = 'original'
    else if (filename === 'optimized.webp') format = 'optimized'

    return { type, id, format }
  }

  /**
   * 旧形式のパスから新形式への変換
   * @deprecated マイグレーション用のユーティリティ
   */
  static migrateLegacyPath(legacyPath: string): string | null {
    // dogs/originals/12345.jpg -> pets/dogs/12345/original.jpg
    const originalMatch = legacyPath.match(/(dogs|cats)\/originals\/([^.]+)\.jpg/)
    if (originalMatch) {
      const type: PetType = originalMatch[1] === 'dogs' ? 'dog' : 'cat'
      const id = originalMatch[2]
      if (!id) return null
      return R2_PATHS.pets.original(type, id)
    }

    // cats/optimized/67890.webp -> pets/cats/67890/optimized.webp
    const optimizedMatch = legacyPath.match(/(dogs|cats)\/optimized\/([^.]+)\.webp/)
    if (optimizedMatch) {
      const type: PetType = optimizedMatch[1] === 'dogs' ? 'dog' : 'cat'
      const id = optimizedMatch[2]
      if (!id) return null
      return R2_PATHS.pets.optimized(type, id)
    }

    return null
  }
}

/**
 * R2パスのバリデーション
 */
export class R2PathValidator {
  /**
   * パスが有効なペット画像パスかチェック
   */
  static isValidPetImagePath(path: string): boolean {
    return /^pets\/(dogs|cats)\/[^\/]+\/(screenshot\.png|original\.jpg|optimized\.webp)$/.test(path)
  }

  /**
   * パスが有効なスクリーンショットパスかチェック
   */
  static isScreenshotPath(path: string): boolean {
    return path.endsWith('/screenshot.png')
  }

  /**
   * パスが有効な変換済み画像パスかチェック
   */
  static isConvertedImagePath(path: string): boolean {
    return path.endsWith('/original.jpg') || path.endsWith('/optimized.webp')
  }
}

// CommonJS互換性のためのデフォルトエクスポート
export default {
  R2_PATHS,
  R2PathBuilder,
  R2PathValidator,
}