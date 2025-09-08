/**
 * ペットデータ変換専門クラス
 */

import { Pet, PetRecord, toPetRecord } from '../../../shared/types/pet'
import { PetDetailInfo } from './PetHomeParser'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export class PetDataTransformer {
  /**
   * PetDetailInfoからPetへの変換
   */
  transformToPet(petDetail: PetDetailInfo): Pet {
    const pet: Pet = {
      id: petDetail.id,
      type: petDetail.type,
      name: petDetail.name,
      breed: petDetail.breed,
      age: petDetail.age,
      gender: petDetail.gender,
      location: petDetail.location,
      prefecture: petDetail.prefecture,
      city: petDetail.city,
      description: petDetail.description,
      personality: petDetail.personality,
      imageUrl: petDetail.imageUrl,
      images: petDetail.images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 空の配列や未定義の値をクリーンアップ
    Object.keys(pet).forEach((key) => {
      const value = pet[key as keyof Pet]
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        delete pet[key as keyof Pet]
      }
    })

    return pet
  }

  /**
   * PetからPetRecordへの変換
   */
  transformToPetRecord(pet: Pet): PetRecord {
    const record = toPetRecord(pet)

    // 追加のフラグ設定
    record.is_available = 1
    record.has_jpeg = pet.imageUrl ? 1 : 0
    record.has_webp = 0 // 初期値

    return record
  }

  /**
   * ペットデータのバリデーション
   */
  validatePetData(pet: Pet): ValidationResult {
    const errors: string[] = []

    // 必須フィールドのチェック
    if (!pet.id) errors.push('IDが必要です')
    if (!pet.type) errors.push('タイプ（犬/猫）が必要です')
    if (!pet.name) errors.push('名前が必要です')

    // タイプの妥当性チェック
    if (pet.type && pet.type !== 'dog' && pet.type !== 'cat') {
      errors.push('タイプは "dog" または "cat" である必要があります')
    }

    // 性別の妥当性チェック
    if (pet.gender && !['male', 'female', 'unknown'].includes(pet.gender)) {
      errors.push('性別は "male", "female", "unknown" のいずれかである必要があります')
    }

    // 画像URLの形式チェック
    if (pet.imageUrl && !this.isValidUrl(pet.imageUrl)) {
      errors.push('画像URLの形式が不正です')
    }

    // 配列フィールドの型チェック
    if (pet.personality && !Array.isArray(pet.personality)) {
      errors.push('性格は配列である必要があります')
    }

    if (pet.images && !Array.isArray(pet.images)) {
      errors.push('画像リストは配列である必要があります')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * データの正規化
   */
  normalizePetData(pet: Pet): Pet {
    const normalized = { ...pet }

    // 名前の正規化（前後の空白削除）
    if (normalized.name) {
      normalized.name = normalized.name.trim()
    }

    // 年齢の正規化
    if (normalized.age) {
      normalized.age = this.normalizeAge(normalized.age)
    }

    // 場所の正規化
    if (normalized.location) {
      normalized.location = normalized.location.trim()
    }

    // 説明文の正規化（改行や余分な空白の削除）
    if (normalized.description) {
      normalized.description = normalized.description.replace(/\s+/g, ' ').trim()
    }

    return normalized
  }

  /**
   * バッチ変換
   */
  transformBatch(petDetails: PetDetailInfo[]): Pet[] {
    return petDetails.map((detail) => this.transformToPet(detail))
  }

  // ヘルパーメソッド
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private normalizeAge(age: string): string {
    // "2歳3ヶ月" → "2年3ヶ月"、"3 months" → "3ヶ月" などの正規化
    const normalized = age
      .replace(/歳/g, '年')
      .replace(/months?/gi, 'ヶ月')
      .replace(/years?/gi, '年')
      .trim()

    return normalized
  }
}
