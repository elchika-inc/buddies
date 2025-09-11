/**
 * ペットデータビルダー
 * 複雑なペットオブジェクトの構築を段階的かつ読みやすく行う
 */

import type { Pet } from '../../../shared/types/index'

// DB レコード型（統一型定義に準拠）
interface DBPetRecord {
  id: string
  type: 'dog' | 'cat'
  name: string
  breed?: string | null
  age?: string | null
  gender?: string | null
  size?: string | null
  weight?: number | null
  color?: string | null
  description?: string | null
  location?: string | null
  prefecture?: string | null
  city?: string | null
  medicalInfo?: string | null
  vaccinationStatus?: string | null
  isNeutered?: number | null
  personality?: string | null
  goodWithKids?: number | null
  goodWithDogs?: number | null
  goodWithCats?: number | null
  shelterName?: string | null
  shelterContact?: string | null
  sourceUrl?: string | null
  sourceId?: string | null
  careRequirements?: string | null
  hasJpeg?: number | null
  hasWebp?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  imageUrl?: string | null
  isVaccinated?: number | null
  isFivFelvTested?: number | null
  exerciseLevel?: string | null
  trainingLevel?: string | null
  socialLevel?: string | null
  indoorOutdoor?: string | null
  groomingRequirements?: string | null
  apartmentFriendly?: number | null
  needsYard?: number | null
  goodWith?: string | null
  healthNotes?: string | null
  coatLength?: string | null
  imageCheckedAt?: string | null
  screenshotRequestedAt?: string | null
  screenshotCompletedAt?: string | null
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
      gender: (record.gender as Pet['gender']) ?? undefined,
      size: (record.size as Pet['size']) ?? undefined,
      weight: record.weight ?? undefined,
      color: record.color ?? undefined,
      description: record.description ?? undefined,
      location: record.location ?? undefined,
      prefecture: record.prefecture ?? undefined,
      city: record.city ?? undefined,
      medicalInfo: record.medicalInfo ?? undefined,
      vaccinationStatus: record.vaccinationStatus ?? undefined,
      isNeutered: record.isNeutered ?? 0,
      isVaccinated: record.isVaccinated ?? 0,
      isFivFelvTested: record.isFivFelvTested ?? 0,
      personality: record.personality ?? undefined,
      goodWithKids: record.goodWithKids ?? 0,
      goodWithDogs: record.goodWithDogs ?? 0,
      goodWithCats: record.goodWithCats ?? 0,
      apartmentFriendly: record.apartmentFriendly ?? 0,
      needsYard: record.needsYard ?? 0,
      shelterName: record.shelterName ?? undefined,
      shelterContact: record.shelterContact ?? undefined,
      sourceUrl: record.sourceUrl ?? undefined,
      sourceId: record.sourceId ?? 'pet-home',
      careRequirements: record.careRequirements ?? undefined,
      imageUrl: record.imageUrl ?? undefined,
      hasJpeg: record.hasJpeg ?? 0,
      hasWebp: record.hasWebp ?? 0,
      exerciseLevel: record.exerciseLevel ?? undefined,
      trainingLevel: record.trainingLevel ?? undefined,
      socialLevel: record.socialLevel ?? undefined,
      indoorOutdoor: record.indoorOutdoor ?? undefined,
      groomingRequirements: record.groomingRequirements ?? undefined,
      goodWith: record.goodWith ?? undefined,
      healthNotes: record.healthNotes ?? undefined,
      coatLength: record.coatLength ?? undefined,
      imageCheckedAt: record.imageCheckedAt ?? undefined,
      screenshotRequestedAt: record.screenshotRequestedAt ?? undefined,
      screenshotCompletedAt: record.screenshotCompletedAt ?? undefined,
      createdAt: record.createdAt ?? new Date().toISOString(),
      updatedAt: record.updatedAt ?? new Date().toISOString(),
    }

    return pet as Pet
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
      isNeutered: 0,
      isVaccinated: 0,
      isFivFelvTested: 0,
      goodWithKids: 0,
      goodWithDogs: 0,
      goodWithCats: 0,
      apartmentFriendly: 0,
      needsYard: 0,
      hasJpeg: 0,
      hasWebp: 0,
      sourceId: 'pet-home',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

  setAge(age: string | null): PetBuilder {
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
  setImageUrl(imageUrl: string | null): PetBuilder {
    this.pet.imageUrl = imageUrl ?? undefined
    return this
  }

  setHasJpeg(hasJpeg: boolean): PetBuilder {
    this.pet.hasJpeg = hasJpeg ? 1 : 0
    return this
  }

  setHasWebp(hasWebp: boolean): PetBuilder {
    this.pet.hasWebp = hasWebp ? 1 : 0
    return this
  }

  // 健康情報のセッター
  setVaccinationStatus(status: string | null): PetBuilder {
    this.pet.vaccinationStatus = status ?? undefined
    return this
  }

  setIsNeutered(isNeutered: boolean): PetBuilder {
    this.pet.isNeutered = isNeutered ? 1 : 0
    return this
  }

  setIsVaccinated(isVaccinated: boolean): PetBuilder {
    this.pet.isVaccinated = isVaccinated ? 1 : 0
    return this
  }

  // 互換性フラグのセッター
  setGoodWithKids(goodWithKids: boolean): PetBuilder {
    this.pet.goodWithKids = goodWithKids ? 1 : 0
    return this
  }

  setGoodWithDogs(goodWithDogs: boolean): PetBuilder {
    this.pet.goodWithDogs = goodWithDogs ? 1 : 0
    return this
  }

  setGoodWithCats(goodWithCats: boolean): PetBuilder {
    this.pet.goodWithCats = goodWithCats ? 1 : 0
    return this
  }

  // シェルター情報のセッター
  setShelterName(name: string | null): PetBuilder {
    this.pet.shelterName = name ?? undefined
    return this
  }

  setShelterContact(contact: string | null): PetBuilder {
    this.pet.shelterContact = contact ?? undefined
    return this
  }

  // タイムスタンプのセッター
  setCreatedAt(date: string): PetBuilder {
    this.pet.createdAt = date
    return this
  }

  setUpdatedAt(date: string): PetBuilder {
    this.pet.updatedAt = date
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
    if (this.pet.isNeutered === undefined) {
      this.pet.isNeutered = 0
    }
    if (this.pet.isVaccinated === undefined) {
      this.pet.isVaccinated = 0
    }
    if (this.pet.isFivFelvTested === undefined) {
      this.pet.isFivFelvTested = 0
    }
    if (this.pet.goodWithKids === undefined) {
      this.pet.goodWithKids = 0
    }
    if (this.pet.goodWithDogs === undefined) {
      this.pet.goodWithDogs = 0
    }
    if (this.pet.goodWithCats === undefined) {
      this.pet.goodWithCats = 0
    }
    if (this.pet.apartmentFriendly === undefined) {
      this.pet.apartmentFriendly = 0
    }
    if (this.pet.needsYard === undefined) {
      this.pet.needsYard = 0
    }
    if (this.pet.hasJpeg === undefined) {
      this.pet.hasJpeg = 0
    }
    if (this.pet.hasWebp === undefined) {
      this.pet.hasWebp = 0
    }
    if (!this.pet.sourceId) {
      this.pet.sourceId = 'pet-home'
    }
    if (!this.pet.createdAt) {
      this.pet.createdAt = new Date().toISOString()
    }
    if (!this.pet.updatedAt) {
      this.pet.updatedAt = new Date().toISOString()
    }

    return this.pet as Pet
  }

  /**
   * リセットメソッド - ビルダーを初期状態に戻す
   */
  reset(): PetBuilder {
    this.pet = {
      isNeutered: 0,
      isVaccinated: 0,
      isFivFelvTested: 0,
      goodWithKids: 0,
      goodWithDogs: 0,
      goodWithCats: 0,
      apartmentFriendly: 0,
      needsYard: 0,
      hasJpeg: 0,
      hasWebp: 0,
      sourceId: 'pet-home',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return this
  }
}

export default PetBuilder
