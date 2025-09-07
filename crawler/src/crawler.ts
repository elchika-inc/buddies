/**
 * シンプル化されたペットホームクローラー
 * 
 * @description ペットホーム（pet-home.jp）から保護犬・保護猫の情報を取得するクローラー
 * 単一サイト対応のため、不要な抽象化を除去し、高速で信頼性の高い処理を実現
 * @site https://www.pet-home.jp
 */
import type { Pet, CrawlResult } from '../../shared/types/index'

/**
 * Cloudflare Workers環境変数の型定義
 * 
 * @interface Env
 * @description クローラーが使用するCloudflareリソースの型定義
 */
export interface Env {
  /** D1データベースインスタンス */
  DB: D1Database;
  /** R2ストレージバケット */
  R2_BUCKET: R2Bucket;
  /** APIディスパッチャーキュー */
  API_DISPATCHER_QUEUE: Queue;
  /** CORS許可オリジン */
  ALLOWED_ORIGIN?: string;
  /** ローカル画像使用フラグ */
  USE_LOCAL_IMAGES?: string;
}
import * as cheerio from 'cheerio'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { pets } from '../../database/schema/schema'
import { FETCH_CONFIG, HTTP_CONFIG } from './config/constants'

/**
 * ペットホームクローラークラス
 * 
 * @class PetHomeCrawler
 * @description ペットホームサイトから保護動物情報を取得し、D1データベースに保存するクローラー
 * HTMLパース、データ変換、画像保存を一括で処理
 */
export class PetHomeCrawler {
  /** ベースURL */
  private static readonly BASE_URL = 'https://www.pet-home.jp'
  /** 1ページあたりのペット数 */
  private static readonly PETS_PER_PAGE = FETCH_CONFIG.PETS_PER_PAGE
  /** 最大ページ数 */
  private static readonly MAX_PAGES = FETCH_CONFIG.MAX_PAGES
  /** HTTPリクエスト用ユーザーエージェント */
  private static readonly USER_AGENT = HTTP_CONFIG.USER_AGENT
  /** Drizzle ORMインスタンス */
  private db: ReturnType<typeof drizzle>

  /**
   * コンストラクタ
   * 
   * @param env - Cloudflare Workers環境変数
   */
  constructor(private env: Env) {
    this.db = drizzle(this.env.DB)
  }

  /**
   * メインクロール処理
   * 
   * @param petType - クロール対象のペットタイプ（'dog' | 'cat'）
   * @param limit - 取得するペットの上限数（デフォルト: 10）
   * @returns クロール結果
   * @description 指定されたタイプのペット情報を取得し、データベースに保存
   * 新規作成、更新、エラーの統計情報も返す
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
   * 
   * @param petType - 取得対象のペットタイプ
   * @param limit - 取得上限数
   * @returns ペット情報の配列
   * @description ペットホームの一覧ページからペット情報を収集し、
   * 詳細ページをパースして完整なペットデータを構築
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
   * 
   * @param url - 取得対象のURL
   * @returns HTMLコンテンツ
   * @throws HTTPエラーまたはタイムアウトの場合
   * @description 指定されたURLからHTMLを取得。タイムアウトとUser-Agentを設定
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
   * 
   * @param html - 一覧ページのHTML
   * @param _petType - ペットタイプ（現在未使用）
   * @returns ペットIDと詳細URLの配列
   * @description 一覧ページからペットの基本情報を抽出。
   * CSSセレクタで.contribute_resultを操作
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
   * 
   * @param html - 詳細ページのHTML
   * @param petInfo - ペットの基本情報
   * @param petType - ペットタイプ
   * @returns 完整なペット情報
   * @description 詳細ページから名前、品種、年齢、性別、所在地、
   * 説明文、画像などの詳細情報を抽出してPetオブジェクトを構築
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
   * 
   * @param locationText - 所在地テキスト
   * @returns [都道府県, 市区町村] のタプル
   * @description 「東京都 渋谷区」のような所在地文字列をパースし、
   * 都道府県と市区町村に分離。デフォルトは東京都
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
   * 
   * @param id - ペットID
   * @returns 既存の場合true、新規の場合false
   * @description 指定されたIDのペットがデータベースに存在するか確認
   */
  private async checkExistingPet(id: string): Promise<boolean> {
    const result = await this.db.select({ id: pets.id })
      .from(pets)
      .where(eq(pets.id, id))
      .limit(1)
    return result.length > 0
  }

  /**
   * ペットを作成
   * 
   * @param pet - 作成するペット情報
   * @description 新しいペット情報をデータベースに挿入。
   * Pet型からデータベースレコード型に変換して保存
   */
  private async createPet(pet: Pet): Promise<void> {
    const { petToRecord } = await import('./types')
    const record = petToRecord(pet)
    
    await this.db.insert(pets).values({
      id: record.id,
      type: record.type,
      name: record.name,
      breed: record.breed,
      age: record.age,
      gender: record.gender,
      prefecture: record.prefecture,
      city: record.city,
      location: record.location,
      description: record.description,
      personality: record.personality,
      medicalInfo: record.medical_info,
      careRequirements: record.care_requirements,
      imageUrl: record.image_url,
      shelterName: record.shelter_name,
      shelterContact: record.shelter_contact,
      sourceUrl: record.source_url,
      sourceId: record.source_id || 'pet-home',
      adoptionFee: record.adoption_fee || 0,
      createdAt: record.created_at || new Date().toISOString(),
      updatedAt: record.updated_at || new Date().toISOString()
    })
  }

  /**
   * ペットを更新
   * 
   * @param pet - 更新するペット情報
   * @description 既存のペット情報を最新のデータで更新。
   * ID以外の全フィールドとupdated_atを更新
   */
  private async updatePet(pet: Pet): Promise<void> {
    const { petToRecord } = await import('./types')
    const record = petToRecord(pet)
    
    await this.db.update(pets)
      .set({
        name: record.name,
        breed: record.breed,
        age: record.age,
        gender: record.gender,
        prefecture: record.prefecture,
        city: record.city,
        location: record.location,
        description: record.description,
        personality: record.personality,
        medicalInfo: record.medical_info,
        careRequirements: record.care_requirements,
        imageUrl: record.image_url,
        shelterName: record.shelter_name,
        shelterContact: record.shelter_contact,
        sourceUrl: record.source_url,
        sourceId: record.source_id || 'pet-home',
        updatedAt: new Date().toISOString()
      })
      .where(eq(pets.id, record.id))
  }

  /**
   * 画像をR2に保存
   * 
   * @param pet - 画像を保存するペット情報
   * @description ペットの画像URLから画像をダウンロードし、
   * Cloudflare R2ストレージに保存。エラーが発生しても処理を継続
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

      await this.env.R2_BUCKET.put(key, imageBuffer, {
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
