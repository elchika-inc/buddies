/**
 * ペットデータのDB操作専用クラス
 * データの永続化のみに責任を持つ
 */

import { Result } from '@pawmatch/shared/types/result'
import type { Pet } from '@pawmatch/shared/types'

export interface SavePetOptions {
  upsert?: boolean
  skipDuplicates?: boolean
}

export interface SaveResult {
  saved: number
  skipped: number
  failed: number
  errors: Array<{ pet: Pet; error: string }>
}

export class PetRepository {
  constructor(private db: D1Database) {}

  /**
   * ペットを保存
   */
  async savePet(pet: Pet, options?: SavePetOptions): Promise<Result<Pet>> {
    try {
      if (options?.upsert) {
        return this.upsertPet(pet)
      }

      const existingPet = await this.findById(pet.id)
      if (existingPet.success) {
        if (options?.skipDuplicates) {
          return Result.ok(existingPet.data)
        }
        return Result.err(new Error('ペットは既に存在します'))
      }

      return this.insertPet(pet)
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('保存エラー'))
    }
  }

  /**
   * 複数のペットを保存
   */
  async savePets(pets: Pet[], options?: SavePetOptions): Promise<Result<SaveResult>> {
    const result: SaveResult = {
      saved: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    }

    for (const pet of pets) {
      const saveResult = await this.savePet(pet, options)

      if (saveResult.success) {
        result.saved++
      } else {
        result.failed++
        result.errors.push({
          pet,
          error: saveResult.error.message,
        })
      }
    }

    return Result.ok(result)
  }

  /**
   * IDでペットを検索
   */
  async findById(id: string): Promise<Result<Pet>> {
    try {
      const pet = await this.db.prepare('SELECT * FROM pets WHERE id = ?').bind(id).first()

      if (!pet) {
        return Result.err(new Error('ペットが見つかりません'))
      }

      return Result.ok(this.dbRecordToPet(pet as Record<string, unknown>))
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('検索エラー'))
    }
  }

  /**
   * ペットを挿入
   */
  private async insertPet(pet: Pet): Promise<Result<Pet>> {
    try {
      await this.db
        .prepare(
          `INSERT INTO pets (
            id, type, name, breed, age, gender, size, weight,
            color, description, location, prefecture, city,
            medicalInfo, vaccinationStatus, isNeutered, isVaccinated,
            personality, goodWithKids, goodWithDogs, goodWithCats,
            shelterName, shelterContact, sourceUrl, sourceId,
            careRequirements, imageUrl, hasJpeg, hasWebp,
            createdAt, updatedAt
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?
          )`
        )
        .bind(
          pet.id,
          pet.type,
          pet.name,
          pet.breed || null,
          pet.age || null,
          pet.gender || null,
          pet.size || null,
          pet.weight || null,
          pet.color || null,
          pet.description || null,
          pet.location || null,
          pet.prefecture || null,
          pet.city || null,
          pet.medicalInfo || null,
          pet.vaccinationStatus || null,
          pet.isNeutered || 0,
          pet.isVaccinated || 0,
          pet.personality || null,
          pet.goodWithKids || 0,
          pet.goodWithDogs || 0,
          pet.goodWithCats || 0,
          pet.shelterName || null,
          pet.shelterContact || null,
          pet.sourceUrl || null,
          pet.sourceId || 'pet-home',
          pet.careRequirements || null,
          pet.imageUrl || null,
          pet.hasJpeg || 0,
          pet.hasWebp || 0,
          pet.createdAt || new Date().toISOString(),
          pet.updatedAt || new Date().toISOString()
        )
        .run()

      return Result.ok(pet)
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('挿入エラー'))
    }
  }

  /**
   * ペットを更新または挿入
   */
  private async upsertPet(pet: Pet): Promise<Result<Pet>> {
    try {
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO pets (
            id, type, name, breed, age, gender, size, weight,
            color, description, location, prefecture, city,
            medicalInfo, vaccinationStatus, isNeutered, isVaccinated,
            personality, goodWithKids, goodWithDogs, goodWithCats,
            shelterName, shelterContact, sourceUrl, sourceId,
            careRequirements, imageUrl, hasJpeg, hasWebp,
            createdAt, updatedAt
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            COALESCE((SELECT createdAt FROM pets WHERE id = ?), ?),
            ?
          )`
        )
        .bind(
          pet.id,
          pet.type,
          pet.name,
          pet.breed || null,
          pet.age || null,
          pet.gender || null,
          pet.size || null,
          pet.weight || null,
          pet.color || null,
          pet.description || null,
          pet.location || null,
          pet.prefecture || null,
          pet.city || null,
          pet.medicalInfo || null,
          pet.vaccinationStatus || null,
          pet.isNeutered || 0,
          pet.isVaccinated || 0,
          pet.personality || null,
          pet.goodWithKids || 0,
          pet.goodWithDogs || 0,
          pet.goodWithCats || 0,
          pet.shelterName || null,
          pet.shelterContact || null,
          pet.sourceUrl || null,
          pet.sourceId || 'pet-home',
          pet.careRequirements || null,
          pet.imageUrl || null,
          pet.hasJpeg || 0,
          pet.hasWebp || 0,
          pet.id,
          new Date().toISOString(),
          new Date().toISOString()
        )
        .run()

      return Result.ok(pet)
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('更新エラー'))
    }
  }

  /**
   * DBレコードをPetオブジェクトに変換
   */
  private dbRecordToPet(record: Record<string, unknown>): Pet {
    return {
      id: record['id'] as string,
      type: record['type'] as 'dog' | 'cat',
      name: record['name'] as string,
      breed: record['breed'] as string | undefined,
      age: record['age'] as string | undefined,
      gender: record['gender'] as Pet['gender'] | undefined,
      size: record['size'] as Pet['size'] | undefined,
      weight: record['weight'] as number | undefined,
      color: record['color'] as string | undefined,
      description: record['description'] as string | undefined,
      location: record['location'] as string | undefined,
      prefecture: record['prefecture'] as string | undefined,
      city: record['city'] as string | undefined,
      medicalInfo: record['medicalInfo'] as string | undefined,
      vaccinationStatus: record['vaccinationStatus'] as string | undefined,
      isNeutered: (record['isNeutered'] as number) || 0,
      isVaccinated: (record['isVaccinated'] as number) || 0,
      personality: record['personality'] as string | undefined,
      goodWithKids: (record['goodWithKids'] as number) || 0,
      goodWithDogs: (record['goodWithDogs'] as number) || 0,
      goodWithCats: (record['goodWithCats'] as number) || 0,
      shelterName: record['shelterName'] as string | undefined,
      shelterContact: record['shelterContact'] as string | undefined,
      sourceUrl: record['sourceUrl'] as string | undefined,
      sourceId: (record['sourceId'] as string) || 'pet-home',
      careRequirements: record['careRequirements'] as string | undefined,
      imageUrl: record['imageUrl'] as string | undefined,
      hasJpeg: (record['hasJpeg'] as number) || 0,
      hasWebp: (record['hasWebp'] as number) || 0,
      createdAt: record['createdAt'] as string,
      updatedAt: record['updatedAt'] as string,
    } as Pet
  }
}
