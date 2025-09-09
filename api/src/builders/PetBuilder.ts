/**
 * ペットデータビルダー
 * 複雑なペットオブジェクトの構築を段階的かつ読みやすく行う
 */

import type { Pet } from '../../../shared/types/index'

// DB レコード型（snake_case）
interface DBPetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string | null
  age?: number | null
  age_group?: string | null
  gender?: string | null
  size?: string | null
  weight?: number | null
  color?: string | null
  description?: string | null
  location?: string | null
  prefecture?: string | null
  city?: string | null
  status?: string | null
  medical_info?: string | null
  vaccination_status?: string | null
  spayed_neutered?: number | null
  special_needs?: string | null
  personality_traits?: string | null
  good_with_kids?: number | null
  good_with_pets?: number | null
  adoption_fee?: number | null
  organization_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  source_url?: string | null
  external_id?: string | null
  care_requirements?: string | null
  has_jpeg?: number | null
  has_webp?: number | null
  created_at?: string | null
  updated_at?: string | null
}

// TypeConvertersはローカルに実装
const TypeConverters = {
  recordToPet(record: DBPetRecord): Pet {
    const pet: Partial<Pet> = {
      id: record.id,
      type: record.type,
      name: record.name,
      breed: record.breed ?? undefined,
      age: record.age ?? undefined,
      age_group: record.age_group as Pet['age_group'],
      gender: (record.gender as Pet['gender']) ?? 'unknown',
      size: record.size as Pet['size'],
      weight: record.weight ?? undefined,
      color: record.color ?? undefined,
      description: record.description ?? undefined,
      location: record.location ?? undefined,
      prefecture: record.prefecture ?? undefined,
      city: record.city ?? undefined,
      status: (record.status as Pet['status']) ?? 'available',
      medical_info: record.medical_info ?? undefined,
      vaccination_status: record.vaccination_status ?? undefined,
      spayed_neutered: record.spayed_neutered === 1 ? true : false,
      special_needs: record.special_needs ?? undefined,
      personality_traits: this.parseJsonArray(record.personality_traits),
      good_with_kids: record.good_with_kids === 1 ? true : false,
      good_with_pets: record.good_with_pets === 1 ? true : false,
      adoption_fee: record.adoption_fee ?? undefined,
      organization_name: record.organization_name ?? undefined,
      contact_email: record.contact_email ?? undefined,
      contact_phone: record.contact_phone ?? undefined,
      source_url: record.source_url ?? undefined,
      external_id: record.external_id ?? undefined,
      care_requirements: record.care_requirements ?? undefined,
      images: [],
      tags: [],
      featured: false,
      views: 0,
      likes: 0,
      created_at: record.created_at ?? new Date().toISOString(),
      updated_at: record.updated_at ?? new Date().toISOString(),
    }

    return pet as Pet
  },

  parseJsonArray(value: string | null | undefined): string[] | undefined {
    if (!value) return undefined

    try {
      if (value.startsWith('[')) {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : undefined
      }
      return undefined
    } catch {
      return undefined
    }
  },
}

// Pet型から読み取り専用を除いた型（ビルダー用）
type MutablePet = {
  -readonly [K in keyof Pet]: Pet[K]
}

/**
 * ペットビルダークラス
 *
 * @class PetBuilder
 * @description ビルダーパターンでペットオブジェクトを構築
 */
export class PetBuilder {
  private pet: Partial<MutablePet>

  constructor() {
    this.pet = {
      gender: 'unknown',
      status: 'available',
      images: [],
      tags: [],
      featured: false,
      views: 0,
      likes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  /**
   * DBレコードからビルダーを初期化
   */
  static fromRecord(record: DBPetRecord): PetBuilder {
    const builder = new PetBuilder()
    const pet = TypeConverters.recordToPet(record)
    builder.pet = { ...pet }
    return builder
  }

  /**
   * 既存のPetオブジェクトからビルダーを初期化
   */
  static fromPet(pet: Pet): PetBuilder {
    const builder = new PetBuilder()
    builder.pet = { ...pet }
    return builder
  }

  // 基本情報のセッター
  setId(id: string): PetBuilder {
    this.pet.id = id
    return this
  }

  setType(type: 'dog' | 'cat'): PetBuilder {
    this.pet.type = type
    return this
  }

  setName(name: string): PetBuilder {
    this.pet.name = name
    return this
  }

  setBreed(breed: string | null): PetBuilder {
    this.pet.breed = breed ?? undefined
    return this
  }

  setAge(age: number | null): PetBuilder {
    this.pet.age = age ?? undefined
    return this
  }

  setGender(gender: Pet['gender']): PetBuilder {
    this.pet.gender = gender
    return this
  }

  setLocation(location: string | null): PetBuilder {
    this.pet.location = location ?? undefined
    return this
  }

  setDescription(description: string | null): PetBuilder {
    this.pet.description = description ?? undefined
    return this
  }

  // 画像関連のセッター
  setImages(images: string[]): PetBuilder {
    this.pet.images = images
    return this
  }

  addImage(imageUrl: string): PetBuilder {
    if (!this.pet.images) {
      this.pet.images = []
    }
    this.pet.images.push(imageUrl)
    return this
  }

  // 健康情報のセッター
  setVaccinationStatus(status: string | null): PetBuilder {
    this.pet.vaccination_status = status ?? undefined
    return this
  }

  setSpayedNeutered(isSpayedNeutered: boolean): PetBuilder {
    this.pet.spayed_neutered = isSpayedNeutered
    return this
  }

  // 料金のセッター
  setAdoptionFee(fee: number | null): PetBuilder {
    this.pet.adoption_fee = fee ?? undefined
    return this
  }

  // 組織情報のセッター
  setOrganizationName(name: string | null): PetBuilder {
    this.pet.organization_name = name ?? undefined
    return this
  }

  setContactEmail(email: string | null): PetBuilder {
    this.pet.contact_email = email ?? undefined
    return this
  }

  // タイムスタンプのセッター
  setCreatedAt(date: string): PetBuilder {
    this.pet.created_at = date
    return this
  }

  setUpdatedAt(date: string): PetBuilder {
    this.pet.updated_at = date
    return this
  }

  /**
   * ビルドメソッド - 完全なPetオブジェクトを生成
   *
   * @returns {Pet} 構築されたPetオブジェクト
   * @throws {Error} 必須フィールドが不足している場合
   */
  build(): Pet {
    // 必須フィールドの検証
    if (!this.pet.id) {
      throw new Error('Pet ID is required')
    }
    if (!this.pet.type) {
      throw new Error('Pet type is required')
    }
    if (!this.pet.name) {
      throw new Error('Pet name is required')
    }

    // デフォルト値の設定
    if (!this.pet.gender) {
      this.pet.gender = 'unknown'
    }
    if (!this.pet.status) {
      this.pet.status = 'available'
    }
    if (!this.pet.images) {
      this.pet.images = []
    }
    if (!this.pet.tags) {
      this.pet.tags = []
    }
    if (this.pet.featured === undefined) {
      this.pet.featured = false
    }
    if (this.pet.views === undefined) {
      this.pet.views = 0
    }
    if (this.pet.likes === undefined) {
      this.pet.likes = 0
    }
    if (!this.pet.created_at) {
      this.pet.created_at = new Date().toISOString()
    }
    if (!this.pet.updated_at) {
      this.pet.updated_at = new Date().toISOString()
    }

    return this.pet as Pet
  }

  /**
   * リセットメソッド - ビルダーを初期状態に戻す
   */
  reset(): PetBuilder {
    this.pet = {
      gender: 'unknown',
      status: 'available',
      images: [],
      tags: [],
      featured: false,
      views: 0,
      likes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return this
  }
}

export default PetBuilder