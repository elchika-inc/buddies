/**
 * HTMLパース専用クラス
 * ペットホームのHTML解析のみに責任を持つ
 */

import { Result } from '@buddies/shared/types/result'
import * as cheerio from 'cheerio'

export interface ParsedPetInfo {
  id: string
  name: string
  type: 'dog' | 'cat'
  breed?: string
  age?: string
  gender?: string
  location?: string
  prefecture?: string
  city?: string
  description?: string
  imageUrl?: string
  detailUrl?: string
  shelterName?: string
  personality?: string
  medicalInfo?: string
  vaccinationStatus?: string
  isNeutered?: number
}

export class PetHomeParser {
  /**
   * ペット一覧ページをパース
   */
  parsePetListPage(html: string): Result<ParsedPetInfo[]> {
    try {
      const $ = cheerio.load(html)
      const pets: ParsedPetInfo[] = []

      $('.pet-list-item').each((_, element) => {
        const petInfo = this.parsePetListItem($, element)
        if (petInfo) {
          pets.push(petInfo)
        }
      })

      return Result.ok(pets)
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('パースエラー'))
    }
  }

  /**
   * ペット詳細ページをパース
   */
  parsePetDetailPage(html: string): Result<ParsedPetInfo> {
    try {
      const $ = cheerio.load(html)

      const petInfo: ParsedPetInfo = {
        id: this.extractId($),
        name: this.extractName($),
        type: this.extractType($),
        breed: this.extractBreed($) || undefined,
        age: this.extractAge($) || undefined,
        gender: this.extractGender($) || undefined,
        location: this.extractLocation($) || undefined,
        prefecture: this.extractPrefecture($) || undefined,
        city: this.extractCity($) || undefined,
        description: this.extractDescription($) || undefined,
        imageUrl: this.extractImageUrl($) || undefined,
        shelterName: this.extractShelterName($) || undefined,
        personality: this.extractPersonality($) || undefined,
        medicalInfo: this.extractMedicalInfo($) || undefined,
        vaccinationStatus: this.extractVaccinationStatus($) || undefined,
        isNeutered: this.extractNeuteredStatus($),
      }

      return Result.ok(petInfo)
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('詳細ページパースエラー'))
    }
  }

  /**
   * ペットリストの個別アイテムをパース
   */
  private parsePetListItem($: cheerio.CheerioAPI, element: unknown): ParsedPetInfo | null {
    try {
      const $item = $(element as Parameters<typeof $>[0])

      return {
        id: ($item.data('pet-id') as string) || '',
        name: $item.find('.pet-name').text().trim(),
        type: $item.hasClass('dog') ? 'dog' : 'cat',
        breed: $item.find('.pet-breed').text().trim() || undefined,
        age: $item.find('.pet-age').text().trim() || undefined,
        location: $item.find('.pet-location').text().trim() || undefined,
        imageUrl: $item.find('.pet-image img').attr('src') || undefined,
        detailUrl: $item.find('.pet-link').attr('href') || undefined,
      }
    } catch {
      return null
    }
  }

  // 以下、個別の情報抽出メソッド
  private extractId($: cheerio.CheerioAPI): string {
    return ($('[data-pet-id]').data('pet-id') as string) || $('.pet-id').text().trim() || ''
  }

  private extractName($: cheerio.CheerioAPI): string {
    return $('.pet-name, h1.name').text().trim() || '名前未設定'
  }

  private extractType($: cheerio.CheerioAPI): 'dog' | 'cat' {
    const typeText = $('.pet-type').text().toLowerCase()
    return typeText.includes('犬') || typeText.includes('dog') ? 'dog' : 'cat'
  }

  private extractBreed($: cheerio.CheerioAPI): string | undefined {
    const breed = $('.pet-breed, .breed-info').text().trim()
    return breed || undefined
  }

  private extractAge($: cheerio.CheerioAPI): string | undefined {
    const age = $('.pet-age, .age-info').text().trim()
    return age || undefined
  }

  private extractGender($: cheerio.CheerioAPI): string | undefined {
    const gender = $('.pet-gender, .gender-info').text().trim()
    return gender || undefined
  }

  private extractLocation($: cheerio.CheerioAPI): string | undefined {
    const location = $('.pet-location, .location-info').text().trim()
    return location || undefined
  }

  private extractPrefecture($: cheerio.CheerioAPI): string | undefined {
    const prefecture = $('.prefecture').text().trim()
    return prefecture || undefined
  }

  private extractCity($: cheerio.CheerioAPI): string | undefined {
    const city = $('.city').text().trim()
    return city || undefined
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    const description = $('.pet-description, .description').text().trim()
    return description || undefined
  }

  private extractImageUrl($: cheerio.CheerioAPI): string | undefined {
    const imageUrl = $('.pet-main-image img, .main-image img').attr('src')
    return imageUrl || undefined
  }

  private extractShelterName($: cheerio.CheerioAPI): string | undefined {
    const shelter = $('.shelter-name, .organization').text().trim()
    return shelter || undefined
  }

  private extractPersonality($: cheerio.CheerioAPI): string | undefined {
    const personality = $('.personality, .character').text().trim()
    return personality || undefined
  }

  private extractMedicalInfo($: cheerio.CheerioAPI): string | undefined {
    const medical = $('.medical-info, .health-info').text().trim()
    return medical || undefined
  }

  private extractVaccinationStatus($: cheerio.CheerioAPI): string | undefined {
    const vaccination = $('.vaccination-status').text().trim()
    return vaccination || undefined
  }

  private extractNeuteredStatus($: cheerio.CheerioAPI): number {
    const neutered = $('.neutered-status').text().toLowerCase()
    return neutered.includes('済') || neutered.includes('yes') ? 1 : 0
  }
}
