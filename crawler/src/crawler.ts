/**
 * シンプル化されたペットホームクローラー
 * 単一サイト対応のため、不要な抽象化を除去
 */
import { Env } from './types'
import type { Pet, CrawlResult } from '../../types'
import * as cheerio from 'cheerio'

export class PetHomeCrawler {
  private static readonly BASE_URL = 'https://www.pet-home.jp'
  private static readonly PETS_PER_PAGE = 20
  private static readonly MAX_PAGES = 10
  private static readonly USER_AGENT = 'Mozilla/5.0 (compatible; PawMatch-Bot/1.0)'

  constructor(private env: Env) {}

  /**
   * メインクロール処理
   */
  async crawl(petType: 'dog' | 'cat', limit: number = 10): Promise<CrawlResult> {
    const result: CrawlResult = {
      success: false,
      totalPets: 0,
      newPets: 0,
      updatedPets: 0,
      errors: [],
    }

    try {
      const pets = await this.fetchPets(petType, limit)
      result.totalPets = pets.length

      for (const pet of pets) {
        try {
          const existingPet = await this.checkExistingPet(pet.id)

          if (existingPet) {
            await this.updatePet(pet)
            result.updatedPets++
          } else {
            await this.createPet(pet)
            result.newPets++
          }

          await this.saveImageToR2(pet)
        } catch (error) {
          result.errors.push(`Failed to process pet ${pet.id}: ${error}`)
        }
      }

      result.success = result.errors.length === 0
      return result
    } catch (error) {
      result.errors.push(`Crawling failed: ${error}`)
      return result
    }
  }

  /**
   * ペット情報を取得
   */
  private async fetchPets(petType: 'dog' | 'cat', limit: number): Promise<Pet[]> {
    const pets: Pet[] = []
    const baseUrl = `${PetHomeCrawler.BASE_URL}/${petType}s/status_2/`
    const maxPages = Math.min(
      Math.ceil(limit / PetHomeCrawler.PETS_PER_PAGE),
      PetHomeCrawler.MAX_PAGES
    )

    for (let page = 1; page <= maxPages && pets.length < limit; page++) {
      const html = await this.fetchPage(`${baseUrl}?page=${page}`)
      const pagePets = this.parsePetList(html, petType)

      for (const petInfo of pagePets) {
        if (pets.length >= limit) break

        const detailHtml = await this.fetchPage(petInfo.detailUrl)
        const pet = this.parsePetDetail(detailHtml, petInfo, petType)
        pets.push(pet)
      }
    }

    return pets
  }

  /**
   * ページを取得
   */
  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: { 'User-Agent': PetHomeCrawler.USER_AGENT },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.text()
  }

  /**
   * ペットリストをパース
   */
  private parsePetList(
    html: string,
    _petType: 'dog' | 'cat'
  ): Array<{ id: string; detailUrl: string }> {
    const $ = cheerio.load(html)
    const pets: Array<{ id: string; detailUrl: string }> = []

    $('.contribute_result').each((_, element) => {
      const $link = $(element).find('h3.title a')
      const href = $link.attr('href')

      if (href) {
        const idMatch = href.match(/pn(\d+)/)
        if (idMatch) {
          pets.push({
            id: `pn${idMatch[1]}`,
            detailUrl: href.startsWith('http') ? href : `${PetHomeCrawler.BASE_URL}${href}`,
          })
        }
      }
    })

    return pets
  }

  /**
   * ペット詳細をパース
   */
  private parsePetDetail(
    html: string,
    petInfo: { id: string; detailUrl: string },
    petType: 'dog' | 'cat'
  ): Pet {
    const $ = cheerio.load(html)

    // 名前
    const name = $('h3.main_title').text().trim() || `${petType} ${petInfo.id}`

    // 品種
    const breedLink =
      petType === 'dog' ? $('a[href*="/dogs/cg_"]').first() : $('a[href*="/cats/cg_"]').first()
    const breed = breedLink.text().trim() || '不明'

    // 年齢
    let age = '不明'
    $('dt:contains("年齢")')
      .next('dd')
      .each((_, el) => {
        const text = $(el).text().trim()
        if (text) {
          age = text.replace(/[（）]/g, (match) => (match === '（' ? '(' : ')'))
        }
      })

    // 性別
    let gender: 'male' | 'female' | 'unknown' = 'unknown'
    const genderText = $('dt:contains("雄雌"), dt:contains("性別")').next('dd').text()
    if (genderText.includes('オス') || genderText.includes('♂')) {
      gender = 'male'
    } else if (genderText.includes('メス') || genderText.includes('♀')) {
      gender = 'female'
    }

    // 所在地
    const locationText = $('dt:contains("現在所在地")').next('dd').text().trim()
    const [prefecture, city] = this.parseLocation(locationText)

    // 説明
    const description = $('.list_title:contains("性格・特徴")').next('p.info').text().trim() || ''

    // 画像
    const imageUrl =
      $('.main_photo img, .photo_main img').attr('src') ||
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'

    return {
      id: petInfo.id,
      type: petType,
      name,
      breed,
      age,
      gender,
      prefecture,
      city,
      location: city ? `${prefecture} ${city}` : prefecture,
      description,
      personality: [],
      medicalInfo: '',
      careRequirements: [],
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `${PetHomeCrawler.BASE_URL}${imageUrl}`,
      shelterName: '',
      shelterContact: '',
      sourceUrl: petInfo.detailUrl,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * 所在地をパース
   */
  private parseLocation(locationText: string): [string, string] {
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
   * 既存ペットをチェック
   */
  private async checkExistingPet(id: string): Promise<boolean> {
    const stmt = this.env['DB'].prepare('SELECT id FROM pets WHERE id = ?')
    const result = await stmt.bind(id).first()
    return !!result
  }

  /**
   * ペットを作成
   */
  private async createPet(pet: Pet): Promise<void> {
    const stmt = this.env['DB'].prepare(`
      INSERT INTO pets (
        id, type, name, breed, age, gender, prefecture, city, location,
        description, personality, medical_info, care_requirements,
        image_url, shelter_name, shelter_contact, source_url, 
        adoption_fee, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    await stmt
      .bind(
        pet.id,
        pet.type,
        pet.name,
        pet.breed,
        pet.age,
        pet.gender,
        pet.prefecture,
        pet.city,
        pet.location,
        pet.description,
        JSON.stringify(pet.personality),
        pet.medicalInfo,
        JSON.stringify(pet.careRequirements),
        pet.imageUrl,
        pet.shelterName,
        pet.shelterContact,
        pet.sourceUrl,
        0,
        pet.createdAt
      )
      .run()
  }

  /**
   * ペットを更新
   */
  private async updatePet(pet: Pet): Promise<void> {
    const stmt = this.env['DB'].prepare(`
      UPDATE pets SET
        name = ?, breed = ?, age = ?, gender = ?, prefecture = ?, city = ?,
        location = ?, description = ?, personality = ?, medical_info = ?,
        care_requirements = ?, image_url = ?, shelter_name = ?, shelter_contact = ?,
        source_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    await stmt
      .bind(
        pet.name,
        pet.breed,
        pet.age,
        pet.gender,
        pet.prefecture,
        pet.city,
        pet.location,
        pet.description,
        JSON.stringify(pet.personality),
        pet.medicalInfo,
        JSON.stringify(pet.careRequirements),
        pet.imageUrl,
        pet.shelterName,
        pet.shelterContact,
        pet.sourceUrl,
        pet.id
      )
      .run()
  }

  /**
   * 画像をR2に保存
   */
  private async saveImageToR2(pet: Pet): Promise<void> {
    if (!pet.imageUrl || !pet.imageUrl.startsWith('http')) {
      return
    }

    try {
      const response = await fetch(pet.imageUrl, {
        headers: { 'User-Agent': PetHomeCrawler.USER_AGENT },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) return

      const imageBuffer = await response.arrayBuffer()
      const key = `pets/${pet.type}s/${pet.id}/original.jpg`

      await this.env.IMAGES_BUCKET.put(key, imageBuffer, {
        httpMetadata: {
          contentType: 'image/jpeg',
        },
        customMetadata: {
          petId: pet.id,
          petType: pet.type,
          uploadedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error(`Failed to save image for pet ${pet.id}:`, error)
    }
  }
}
