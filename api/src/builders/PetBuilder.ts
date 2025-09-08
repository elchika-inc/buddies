/**
 * ペットデータビルダー
 * 複雑なペットオブジェクトの構築を段階的かつ読みやすく行う
 */

import type { Pet, PetRecord } from '../../../shared/types/index'

// TypeConvertersはローカルに実装
const TypeConverters = {
  recordToPet(record: PetRecord): Pet {
    const pet = {
      id: record.id,
      type: record.type,
      name: record.name,
      breed: record.breed,
      age: record.age,
      gender: record.gender,
      location: record.location,
      description: record.description,
      imageUrl: record.image_url,
      personality: this.parseJsonField(record.personality),
      careRequirements: this.parseJsonField(record.care_requirements),
      adoptionFee: record.adoption_fee,
      isNeutered: record.is_neutered === 1,
      isVaccinated: record.is_vaccinated === 1,
      size: record.size,
      weight: record.weight,
      color: record.color,
      hasJpeg: record.has_jpeg === 1,
      hasWebp: record.has_webp === 1,
      screenshotCompletedAt: record.screenshot_completed_at,
      imageCheckedAt: record.image_checked_at,
      sourceId: record.source_id,
      sourceUrl: record.source_url,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }

    // null値を除去
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(pet)) {
      if (value != null) {
        result[key] = value
      }
    }
    return result as unknown as Pet
  },

  parseJsonField(value: string | null | undefined): string[] | string | null {
    if (!value) return null

    try {
      if (value.startsWith('[')) {
        return JSON.parse(value)
      }
      return value
    } catch {
      return value
    }
  },
}

// Pet型から読み取り専用を除いた型（ビルダー用）
type MutablePet = {
  -readonly [K in keyof Pet]: Pet[K]
}

/**
 * ペットビルダークラス
 * 流暢なインターフェースで段階的にペットデータを構築
 */
export class PetBuilder {
  // ビルダー用の可変ペットデータ
  private pet: Partial<MutablePet> = {}

  /**
   * 静的ファクトリメソッド
   */
  static create(id: string, type: 'dog' | 'cat', name: string): PetBuilder {
    return new PetBuilder().setBasicInfo(id, type, name)
  }

  /**
   * データベースレコードからビルダーを作成
   */
  static fromRecord(record: PetRecord): PetBuilder {
    const builder = new PetBuilder()
    const pet = TypeConverters.recordToPet(record)
    builder.pet = { ...pet }
    return builder
  }

  /**
   * APIリクエストからビルダーを作成
   */
  static fromApiRequest(data: Record<string, unknown>): PetBuilder {
    const builder = new PetBuilder()

    // 基本情報
    if (
      typeof data['id'] === 'string' &&
      (data['type'] === 'dog' || data['type'] === 'cat') &&
      typeof data['name'] === 'string'
    ) {
      builder.setBasicInfo(data['id'], data['type'], data['name'])
    }

    // その他のフィールドを追加
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'type' && key !== 'name' && value != null) {
        type PetKey = keyof typeof builder.pet
        if (key in builder.pet) {
          ;(builder.pet as Record<PetKey, unknown>)[key as PetKey] = value
        }
      }
    })

    return builder
  }

  /**
   * 基本情報設定
   */
  setBasicInfo(id: string, type: 'dog' | 'cat', name: string): this {
    this.pet.id = id
    this.pet.type = type
    this.pet.name = name
    return this
  }

  /**
   * プロフィール情報設定
   */
  setProfile(profile: {
    breed?: string | null
    age?: string | null
    gender?: 'male' | 'female' | 'unknown' | null
    size?: string | null
    weight?: number | null
    color?: string | null
  }): this {
    Object.assign(this.pet, profile)
    return this
  }

  /**
   * 位置情報設定
   */
  setLocation(location: string | null): this {
    this.pet.location = location
    return this
  }

  /**
   * 説明文設定
   */
  setDescription(description: string | null): this {
    this.pet.description = description
    return this
  }

  /**
   * 性格・ケア要件設定
   */
  setCharacteristics(characteristics: {
    personality?: string[] | string | null
    careRequirements?: string[] | string | null
  }): this {
    if (characteristics.personality) {
      this.pet.personality = TypeConverters.parseJsonField(
        typeof characteristics.personality === 'string'
          ? characteristics.personality
          : JSON.stringify(characteristics.personality)
      )
    }
    if (characteristics.careRequirements) {
      this.pet.careRequirements = TypeConverters.parseJsonField(
        typeof characteristics.careRequirements === 'string'
          ? characteristics.careRequirements
          : JSON.stringify(characteristics.careRequirements)
      )
    }
    return this
  }

  /**
   * 健康情報設定
   */
  setHealthInfo(health: {
    isNeutered?: boolean | null
    isVaccinated?: boolean | null
    healthStatus?: string | null
  }): this {
    Object.assign(this.pet, health)
    return this
  }

  /**
   * 費用情報設定
   */
  setAdoptionFee(fee: number | null): this {
    this.pet.adoptionFee = fee
    return this
  }

  /**
   * 画像情報設定
   */
  setImageInfo(imageInfo: {
    imageUrl?: string | null
    hasJpeg?: boolean
    hasWebp?: boolean
    screenshotCompletedAt?: string | null
    imageCheckedAt?: string | null
  }): this {
    Object.assign(this.pet, imageInfo)
    return this
  }

  /**
   * メタデータ設定
   */
  setMetadata(metadata: {
    sourceId?: string | null
    sourceUrl?: string | null
    crawledAt?: string | null
  }): this {
    Object.assign(this.pet, metadata)
    return this
  }

  /**
   * タイムスタンプ設定
   */
  setTimestamps(timestamps?: { createdAt?: string | null; updatedAt?: string | null }): this {
    const now = new Date().toISOString()
    this.pet.createdAt = timestamps?.createdAt || now
    this.pet.updatedAt = timestamps?.updatedAt || now
    return this
  }

  /**
   * デフォルト値設定
   */
  withDefaults(): this {
    // 性別のデフォルト
    if (!this.pet.gender) {
      this.pet.gender = 'unknown'
    }

    // 画像フラグのデフォルト
    if (this.pet.hasJpeg === undefined) {
      this.pet.hasJpeg = false
    }
    if (this.pet.hasWebp === undefined) {
      this.pet.hasWebp = false
    }

    // 健康情報のデフォルト
    if (this.pet.isNeutered === undefined) {
      this.pet.isNeutered = false
    }
    if (this.pet.isVaccinated === undefined) {
      this.pet.isVaccinated = false
    }

    // タイムスタンプのデフォルト
    const now = new Date().toISOString()
    if (!this.pet.createdAt) {
      this.pet.createdAt = now
    }
    if (!this.pet.updatedAt) {
      this.pet.updatedAt = now
    }

    return this
  }

  /**
   * 検証
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 必須フィールドチェック
    if (!this.pet.id) errors.push('ID is required')
    if (!this.pet.type) errors.push('Type is required')
    if (!this.pet.name) errors.push('Name is required')

    // 型チェック
    if (this.pet.type && this.pet.type !== 'dog' && this.pet.type !== 'cat') {
      errors.push('Type must be "dog" or "cat"')
    }

    if (
      this.pet.gender &&
      this.pet.gender !== 'male' &&
      this.pet.gender !== 'female' &&
      this.pet.gender !== 'unknown'
    ) {
      errors.push('Gender must be "male", "female", or "unknown"')
    }

    // 数値範囲チェック
    if (this.pet.weight !== null && this.pet.weight !== undefined) {
      if (this.pet.weight < 0 || this.pet.weight > 200) {
        errors.push('Weight must be between 0 and 200')
      }
    }

    if (this.pet.adoptionFee !== null && this.pet.adoptionFee !== undefined) {
      if (this.pet.adoptionFee < 0) {
        errors.push('Adoption fee cannot be negative')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * ビルド（最終的なPetオブジェクトを生成）
   */
  build(): Pet {
    const validation = this.validate()
    if (!validation.isValid) {
      throw new Error(`Pet validation failed: ${validation.errors.join(', ')}`)
    }

    // 必須フィールドの確認
    if (!this.pet.id || !this.pet.type || !this.pet.name) {
      throw new Error('Required fields are missing')
    }

    // null値を除去してPetオブジェクトを構築
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(this.pet)) {
      if (value != null) {
        result[key] = value
      }
    }

    return result as unknown as Pet
  }

  /**
   * 安全なビルド（検証エラーがあってもデフォルト値で補完）
   */
  buildSafe(): Pet {
    this.withDefaults()

    // 必須フィールドのみ確認
    if (!this.pet.id || !this.pet.type || !this.pet.name) {
      throw new Error('ID, type, and name are required')
    }

    // null値を除去してPetオブジェクトを構築
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(this.pet)) {
      if (value != null) {
        result[key] = value
      }
    }

    return result as unknown as Pet
  }

  /**
   * データベースレコードに変換
   */
  toRecord(): PetRecord {
    const pet = this.buildSafe()

    return {
      id: pet.id,
      type: pet.type,
      name: pet.name,
      breed: pet.breed || null,
      age: pet.age || null,
      gender: pet.gender || null,
      location: pet.location || null,
      description: pet.description || null,
      image_url: pet.imageUrl || null,
      personality:
        typeof pet.personality === 'string'
          ? pet.personality
          : JSON.stringify(pet.personality) || null,
      care_requirements:
        typeof pet.careRequirements === 'string'
          ? pet.careRequirements
          : JSON.stringify(pet.careRequirements) || null,
      adoption_fee: pet.adoptionFee || null,
      is_neutered: pet.isNeutered ? 1 : 0,
      is_vaccinated: pet.isVaccinated ? 1 : 0,
      size: pet.size || null,
      weight: pet.weight || null,
      color: pet.color || null,
      has_jpeg: pet.hasJpeg ? 1 : 0,
      has_webp: pet.hasWebp ? 1 : 0,
      screenshot_completed_at: pet.screenshotCompletedAt || null,
      image_checked_at: pet.imageCheckedAt || null,
      source_id: pet.sourceId || null,
      source_url: pet.sourceUrl || null,
      created_at: pet.createdAt || null,
      updated_at: pet.updatedAt || null,
    }
  }

  /**
   * クローン作成
   */
  clone(): PetBuilder {
    const newBuilder = new PetBuilder()
    newBuilder.pet = { ...this.pet }
    return newBuilder
  }
}
