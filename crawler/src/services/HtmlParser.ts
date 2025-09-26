/**
 * HTMLパーサーサービス
 *
 * ペットホームのHTML解析に特化したパーサー
 * HTMLの構造解析とデータ抽出を担当
 */

import * as cheerio from 'cheerio'
import type { Pet } from '../../../shared/types'

/**
 * ペットリストアイテム
 */
export interface PetListItem {
  id: string
  detailUrl: string
}

/**
 * HTMLパーサークラス
 */
export class HtmlParser {
  private static readonly BASE_URL = 'https://www.pet-home.jp'

  /**
   * ペットリストをパース（堅牢な複数セレクター対応）
   */
  static parsePetList(html: string): PetListItem[] {
    const $ = cheerio.load(html)
    const pets: PetListItem[] = []

    // 複数のCSSセレクターパターンを試行
    const selectors = [
      // 元のセレクター
      { container: '.contribute_result', link: 'h3.title a' },
      // 新しいセレクター候補
      { container: '.pet-card', link: 'a' },
      { container: '.pet-item', link: 'a' },
      { container: '.animal-card', link: 'a' },
      { container: '.search-result-item', link: 'a' },
      // より一般的なセレクター
      { container: 'article', link: 'a[href*="pn"]' },
      { container: 'div[class*="result"]', link: 'a[href*="pn"]' },
      { container: 'div[class*="card"]', link: 'a[href*="pn"]' },
    ]

    for (const { container, link } of selectors) {
      console.log(`Trying selector: ${container} ${link}`)

      $(container).each((_, element) => {
        const $link = $(element).find(link)
        const href = $link.attr('href')

        if (href && href.includes('pn')) {
          const idMatch = href.match(/pn(\d+)/)
          if (idMatch) {
            const petId = `pn${idMatch[1]}`

            // 重複チェック
            if (!pets.some((p) => p.id === petId)) {
              pets.push({
                id: petId,
                detailUrl: href.startsWith('http') ? href : `${this.BASE_URL}${href}`,
              })
            }
          }
        }
      })

      // いずれかのセレクターで結果が得られたら終了
      if (pets.length > 0) {
        console.log(`Found ${pets.length} pets with selector: ${container} ${link}`)
        break
      }
    }

    // 最後の手段: ページ内のすべてのペットリンクを探索
    if (pets.length === 0) {
      console.log('Fallback: Searching all pet links')
      $('a[href*="pn"]').each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          const idMatch = href.match(/pn(\d+)/)
          if (idMatch) {
            const petId = `pn${idMatch[1]}`
            if (!pets.some((p) => p.id === petId)) {
              pets.push({
                id: petId,
                detailUrl: href.startsWith('http') ? href : `${this.BASE_URL}${href}`,
              })
            }
          }
        }
      })
      console.log(`Fallback found ${pets.length} pets`)
    }

    return pets
  }

  /**
   * ペット詳細をパース
   */
  static parsePetDetail(html: string, petInfo: PetListItem, petType: 'dog' | 'cat'): Pet {
    const $ = cheerio.load(html)
    const now = new Date().toISOString()

    // 基本情報の抽出
    const name = this.extractName($, petType, petInfo.id)
    const breed = this.extractBreed($, petType)
    const age = this.extractAge($)
    const gender = this.extractGender($)
    const location = this.extractLocation($)
    const description = this.extractDescription($)
    const imageUrl = this.extractImageUrl($)

    return {
      id: petInfo.id,
      type: petType,
      name,
      breed,
      age: age ? String(age) : null,
      gender,
      size: null,
      weight: null,
      color: null,
      description,
      personality: null,
      location: location.full,
      prefecture: location.prefecture,
      city: location.city,
      medicalInfo: null,
      careRequirements: null,
      vaccinationStatus: null,
      isNeutered: 0,
      isVaccinated: 0,
      isFivFelvTested: 0,
      goodWithKids: 0,
      goodWithDogs: 0,
      goodWithCats: 0,
      apartmentFriendly: 0,
      needsYard: 0,
      imageUrl,
      hasJpeg: imageUrl ? 1 : 0,
      hasWebp: 0,
      shelterName: null,
      shelterContact: null,
      sourceUrl: petInfo.detailUrl,
      sourceId: 'pet-home',
      adoptionFee: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * 名前を抽出
   */
  private static extractName($: cheerio.CheerioAPI, petType: 'dog' | 'cat', petId: string): string {
    return $('h3.main_title').text().trim() || `${petType} ${petId}`
  }

  /**
   * 品種を抽出
   */
  private static extractBreed($: cheerio.CheerioAPI, petType: 'dog' | 'cat'): string | null {
    const selector = petType === 'dog' ? 'a[href*="/dogs/cg_"]' : 'a[href*="/cats/cg_"]'

    const breedLink = $(selector).first()
    const breed = breedLink.text().trim()

    return breed || null
  }

  /**
   * 年齢を抽出
   */
  private static extractAge($: cheerio.CheerioAPI): number | null {
    let age: number | null = null

    $('dt:contains("年齢")')
      .next('dd')
      .each((_, el) => {
        const text = $(el).text().trim()
        if (text) {
          const ageMatch = text.match(/(\d+)/)
          if (ageMatch && ageMatch[1]) {
            age = parseInt(ageMatch[1])
          }
        }
      })

    return age
  }

  /**
   * 性別を抽出
   */
  private static extractGender($: cheerio.CheerioAPI): 'male' | 'female' | 'unknown' {
    const genderText = $('dt:contains("雄雌"), dt:contains("性別")').next('dd').text()

    if (genderText.includes('オス') || genderText.includes('♂')) {
      return 'male'
    } else if (genderText.includes('メス') || genderText.includes('♀')) {
      return 'female'
    }

    return 'unknown'
  }

  /**
   * 所在地を抽出
   */
  private static extractLocation($: cheerio.CheerioAPI): {
    prefecture: string
    city: string
    full: string
  } {
    const locationText = $('dt:contains("現在所在地")').next('dd').text().trim()

    const [prefecture, city] = this.parseLocationText(locationText)

    return {
      prefecture,
      city,
      full: city ? `${prefecture} ${city}` : prefecture,
    }
  }

  /**
   * 所在地テキストをパース
   */
  private static parseLocationText(locationText: string): [string, string] {
    const parts = locationText.split(/\s+/)
    let prefecture = '東京都'
    let city = ''

    for (const part of parts) {
      if (
        part.includes('都') ||
        part.includes('道') ||
        part.includes('府') ||
        part.includes('県')
      ) {
        prefecture = part
      } else if (
        part.includes('市') ||
        part.includes('区') ||
        part.includes('町') ||
        part.includes('村')
      ) {
        city = part
      }
    }

    return [prefecture, city]
  }

  /**
   * 説明を抽出
   */
  private static extractDescription($: cheerio.CheerioAPI): string | null {
    const description = $('.list_title:contains("性格・特徴")').next('p.info').text().trim()

    return description || null
  }

  /**
   * 画像URLを抽出
   */
  private static extractImageUrl($: cheerio.CheerioAPI): string | null {
    const imageUrl = $('.main_photo img, .photo_main img').attr('src')

    if (!imageUrl) {
      return null
    }

    return imageUrl.startsWith('http') ? imageUrl : `${this.BASE_URL}${imageUrl}`
  }
}
