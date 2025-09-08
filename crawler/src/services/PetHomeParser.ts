/**
 * PetHomeサイトのHTML解析専門クラス
 */

import * as cheerio from 'cheerio'

export interface PetBasicInfo {
  id: string
  type: 'dog' | 'cat'
  name: string
  detailUrl: string
}

export interface PetDetailInfo extends PetBasicInfo {
  breed?: string
  age?: string
  gender?: 'male' | 'female' | 'unknown'
  location?: string
  prefecture?: string
  city?: string
  description?: string
  personality?: string[]
  imageUrl?: string
  images?: string[]
  isVaccinated?: boolean
  isCastrated?: boolean
  medicalHistory?: string
  healthNotes?: string
}

export class PetHomeParser {
  /**
   * ペット一覧ページのHTML解析
   */
  parsePetList(html: string): PetBasicInfo[] {
    const $ = cheerio.load(html)
    const pets: PetBasicInfo[] = []

    $('.pet-item').each((_, element) => {
      const $item = $(element)
      const id = $item.attr('data-pet-id')
      const detailUrl = $item.find('a.pet-link').attr('href')
      const name = $item.find('.pet-name').text().trim()
      const type = $item.hasClass('dog-item') ? 'dog' : 'cat'

      if (id && detailUrl && name) {
        pets.push({
          id,
          type,
          name,
          detailUrl,
        })
      }
    })

    return pets
  }

  /**
   * ペット詳細ページのHTML解析
   */
  parsePetDetail(html: string, basicInfo: PetBasicInfo): PetDetailInfo {
    const $ = cheerio.load(html)

    const detail: PetDetailInfo = {
      ...basicInfo,
      breed: this.extractText($, '.breed-info'),
      age: this.extractText($, '.age-info'),
      gender: this.extractGender($, '.gender-info'),
      location: this.extractText($, '.location-full'),
      prefecture: this.extractText($, '.prefecture'),
      city: this.extractText($, '.city'),
      description: this.extractText($, '.pet-description'),
      personality: this.extractPersonality($, '.personality-tags'),
      imageUrl: this.extractImageUrl($, '.main-image img'),
      images: this.extractImages($, '.gallery-images img'),
      isVaccinated: this.extractBoolean($, '.vaccination-status'),
      isCastrated: this.extractBoolean($, '.castration-status'),
      medicalHistory: this.extractText($, '.medical-history'),
      healthNotes: this.extractText($, '.health-notes'),
    }

    return detail
  }

  /**
   * 次のページのURLを取得
   */
  getNextPageUrl(html: string): string | null {
    const $ = cheerio.load(html)
    const nextPageLink = $('.pagination .next-page').attr('href')
    return nextPageLink || null
  }

  /**
   * ペット総数を取得
   */
  getTotalCount(html: string): number {
    const $ = cheerio.load(html)
    const countText = $('.total-count').text()
    const match = countText.match(/\d+/)
    return match ? parseInt(match[0], 10) : 0
  }

  // ヘルパーメソッド
  private extractText($: cheerio.CheerioAPI, selector: string): string | undefined {
    const text = $(selector).text().trim()
    return text || undefined
  }

  private extractGender($: cheerio.CheerioAPI, selector: string): 'male' | 'female' | 'unknown' {
    const text = $(selector).text().trim().toLowerCase()
    if (text.includes('オス') || text.includes('male')) return 'male'
    if (text.includes('メス') || text.includes('female')) return 'female'
    return 'unknown'
  }

  private extractPersonality($: cheerio.CheerioAPI, selector: string): string[] {
    const tags: string[] = []
    $(selector)
      .find('.tag')
      .each((_, el) => {
        const tag = $(el).text().trim()
        if (tag) tags.push(tag)
      })
    return tags
  }

  private extractImageUrl($: cheerio.CheerioAPI, selector: string): string | undefined {
    const url = $(selector).attr('src') || $(selector).attr('data-src')
    return url || undefined
  }

  private extractImages($: cheerio.CheerioAPI, selector: string): string[] {
    const images: string[] = []
    $(selector).each((_, el) => {
      const url = $(el).attr('src') || $(el).attr('data-src')
      if (url) images.push(url)
    })
    return images
  }

  private extractBoolean($: cheerio.CheerioAPI, selector: string): boolean {
    const text = $(selector).text().trim().toLowerCase()
    return text.includes('済') || text.includes('yes') || text.includes('完了')
  }
}
