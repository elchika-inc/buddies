/**
 * データ永続化サービス
 *
 * データベース操作と画像ストレージの処理を担当
 * D1データベースとR2ストレージへのアクセスを抽象化
 */

import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { pets } from '../../../database/schema/schema'
import { Result, Ok, Err } from '../../../shared/types/result'
import type { Pet } from '../../../shared/types'
import type { Env } from '../types'

/**
 * 保存結果
 */
export interface SaveResult {
  success: boolean
  isNew: boolean
  error?: string
}

/**
 * データ永続化クラス
 */
export class DataPersistence {
  private db: ReturnType<typeof drizzle>

  constructor(private env: Env) {
    this.db = drizzle(this.env.DB)
  }

  /**
   * ペットが存在するかチェック
   */
  async petExists(petId: string): Promise<Result<boolean, Error>> {
    try {
      const result = await this.db
        .select({ id: pets.id })
        .from(pets)
        .where(eq(pets.id, petId))
        .limit(1)

      return Ok(result.length > 0)
    } catch (error) {
      return Err(
        new Error(
          `Failed to check pet existence: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      )
    }
  }

  /**
   * ペットを保存（作成または更新）
   */
  async savePet(pet: Pet): Promise<Result<SaveResult, Error>> {
    try {
      const existsResult = await this.petExists(pet.id)

      if (Result.isErr(existsResult)) {
        return Err(existsResult.error)
      }

      const exists = existsResult.data

      if (exists) {
        // 更新
        await this.updatePet(pet)
        return Ok({ success: true, isNew: false })
      } else {
        // 新規作成
        await this.createPet(pet)
        return Ok({ success: true, isNew: true })
      }
    } catch (error) {
      return Err(
        new Error(`Failed to save pet: ${error instanceof Error ? error.message : 'Unknown error'}`)
      )
    }
  }

  /**
   * 複数のペットを一括保存
   */
  async savePets(
    petList: Pet[]
  ): Promise<Result<{ newPets: number; updatedPets: number; errors: string[] }, Error>> {
    const results = {
      newPets: 0,
      updatedPets: 0,
      errors: [] as string[],
    }

    for (const pet of petList) {
      const result = await this.savePet(pet)

      if (Result.isOk(result)) {
        if (result.data.isNew) {
          results.newPets++
        } else {
          results.updatedPets++
        }
      } else {
        results.errors.push(`${pet.id}: ${result.error.message}`)
      }
    }

    if (results.errors.length === petList.length) {
      // 全て失敗
      return Err(new Error('All pets failed to save'))
    }

    return Ok(results)
  }

  /**
   * 画像をR2に保存
   */
  async saveImageToR2(pet: Pet, imageBuffer?: ArrayBuffer): Promise<Result<string, Error>> {
    if (!pet.imageUrl && !imageBuffer) {
      return Err(new Error('No image to save'))
    }

    try {
      let buffer = imageBuffer

      // バッファが提供されていない場合は画像を取得
      if (!buffer && pet.imageUrl) {
        const fetchResult = await this.fetchImageBuffer(pet.imageUrl)
        if (Result.isErr(fetchResult)) {
          return Err(fetchResult.error)
        }
        buffer = fetchResult.data
      }

      if (!buffer) {
        return Err(new Error('Failed to get image buffer'))
      }

      const key = this.generateImageKey(pet)

      await this.env.IMAGES_BUCKET.put(key, buffer, {
        httpMetadata: {
          contentType: 'image/jpeg',
        },
        customMetadata: {
          petId: pet.id,
          petType: pet.type,
          uploadedAt: new Date().toISOString(),
        },
      })

      return Ok(key)
    } catch (error) {
      return Err(
        new Error(
          `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  }

  /**
   * ペットを新規作成（内部メソッド）
   */
  private async createPet(pet: Pet): Promise<void> {
    await this.db.insert(pets).values({
      id: pet.id,
      type: pet.type,
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender,
      size: pet.size,
      weight: pet.weight,
      color: pet.color,
      prefecture: pet.prefecture,
      city: pet.city,
      location: pet.location,
      description: pet.description,
      personality: pet.personality,
      medicalInfo: pet.medicalInfo,
      careRequirements: pet.careRequirements,
      vaccinationStatus: pet.vaccinationStatus,
      isNeutered: pet.isNeutered,
      isVaccinated: pet.isVaccinated,
      goodWithKids: pet.goodWithKids,
      goodWithDogs: pet.goodWithDogs,
      goodWithCats: pet.goodWithCats,
      shelterName: pet.shelterName,
      shelterContact: pet.shelterContact,
      adoptionFee: pet.adoptionFee,
      imageUrl: pet.imageUrl,
      sourceUrl: pet.sourceUrl,
      sourceId: pet.sourceId,
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    })
  }

  /**
   * ペットを更新（内部メソッド）
   */
  private async updatePet(pet: Pet): Promise<void> {
    await this.db
      .update(pets)
      .set({
        name: pet.name,
        breed: pet.breed,
        age: pet.age,
        gender: pet.gender,
        size: pet.size,
        weight: pet.weight,
        color: pet.color,
        prefecture: pet.prefecture,
        city: pet.city,
        location: pet.location,
        description: pet.description,
        personality: pet.personality,
        medicalInfo: pet.medicalInfo,
        careRequirements: pet.careRequirements,
        vaccinationStatus: pet.vaccinationStatus,
        isNeutered: pet.isNeutered,
        isVaccinated: pet.isVaccinated,
        goodWithKids: pet.goodWithKids,
        goodWithDogs: pet.goodWithDogs,
        goodWithCats: pet.goodWithCats,
        shelterName: pet.shelterName,
        shelterContact: pet.shelterContact,
        adoptionFee: pet.adoptionFee,
        imageUrl: pet.imageUrl,
        sourceUrl: pet.sourceUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(pets.id, pet.id))
  }

  /**
   * 画像バッファを取得（内部メソッド）
   */
  private async fetchImageBuffer(imageUrl: string): Promise<Result<ArrayBuffer, Error>> {
    try {
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return Err(new Error(`Failed to fetch image: ${response.statusText}`))
      }

      const buffer = await response.arrayBuffer()
      return Ok(buffer)
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to fetch image'))
    }
  }

  /**
   * 画像キーを生成（内部メソッド）
   */
  private generateImageKey(pet: Pet): string {
    return `pets/${pet.type}s/${pet.id}/original.jpg`
  }
}
