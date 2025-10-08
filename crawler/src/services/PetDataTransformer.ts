/**
 * ペットデータ変換専門クラス
 */

import type { Pet } from '../../../shared/types/pet'
import { createPet } from '../../../shared/types/pet'
import type { ParsedPetInfo } from './PetHomeParser'

// PetDetailInfoのエイリアスを作成（後方互換性のため）
export type PetDetailInfo = ParsedPetInfo

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export class PetDataTransformer {
  /**
   * PetDetailInfoからPetへの変換
   */
  transformToPet(petDetail: PetDetailInfo): Pet {
    // ペットオブジェクトを作成
    const pet = createPet({
      id: petDetail.id,
      type: petDetail.type,
      name: petDetail.name,
      breed: petDetail.breed || undefined,
      age: petDetail.age || undefined,
      gender: (petDetail.gender as 'male' | 'female' | 'unknown') || undefined,
      location: petDetail.location || undefined,
      prefecture: petDetail.prefecture || undefined,
      city: petDetail.city || undefined,
      description: petDetail.description || undefined,
      personality: petDetail.personality || undefined,
      imageUrl: petDetail.imageUrl || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return pet
  }

  /**
   * PetからPetへの変換（統一型定義使用により変換不要）
   */
  transformToPetRecord(pet: Pet): Pet {
    // 統一型定義では変換不要
    return pet
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

    // 統一型定義では配列フィールドは文字列として保存

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

    // nullをundefinedに変換（統一型定義に準拠）
    if (normalized.breed === null) {
      normalized.breed = undefined
    }

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
