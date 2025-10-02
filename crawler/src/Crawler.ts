/**
 * シンプル化されたペットホームクローラー
 *
 * @description ペットホーム（pet-home.jp）から保護犬・保護猫の情報を取得するクローラー
 * 単一サイト対応のため、不要な抽象化を除去し、高速で信頼性の高い処理を実現
 * @site https://www.pet-home.jp
 */
import type { Pet, CrawlResult, CrawlerCheckpoint } from '../../shared/types/index'
import { ApiServiceClient } from '../../shared/services/api-client'
import { Result } from '../../shared/types/result'
import { R2_PATHS } from '@pawmatch/shared/r2-paths'
import { HTTP_CONFIG, FETCH_CONFIG } from './config/constants'

/**
 * Cloudflare Workers環境変数の型定義
 *
 * @interface Env
 * @description クローラーが使用するCloudflareリソースの型定義
 */
export interface Env {
  /** D1データベースインスタンス */
  DB: D1Database
  /** R2ストレージバケット */
  IMAGES_BUCKET: R2Bucket // wrangler.tomlに合わせて修正
  /** Screenshot Queue (責務ベース) */
  PAWMATCH_SCREENSHOT_QUEUE: Queue
  /** Screenshot DLQ */
  PAWMATCH_SCREENSHOT_DLQ?: Queue
  /** Crawler DLQ */
  PAWMATCH_CRAWLER_DLQ?: Queue
  /** APIサービスBinding */
  API_SERVICE?: Fetcher
  /** CORS許可オリジン */
  ALLOWED_ORIGIN?: string
  /** ローカル画像使用フラグ */
  USE_LOCAL_IMAGES?: string
  /** API URL */
  API_URL?: string
  /** Crawler API キー */
  CRAWLER_API_KEY?: string
  /** ペットホームベースURL */
  PET_HOME_BASE_URL?: string
}
import * as cheerio from 'cheerio'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { pets } from '../../database/schema/schema'

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
  /** デフォルト: 1ページあたりのペット数 */
  private static readonly DEFAULT_PETS_PER_PAGE = 20
  /** デフォルト: 最大ページ数 */
  private static readonly DEFAULT_MAX_PAGES = 10
  /** HTTPリクエスト用ユーザーエージェント */
  private static readonly USER_AGENT = HTTP_CONFIG.USER_AGENT
  /** Drizzle ORMインスタンス */
  private db: ReturnType<typeof drizzle>

  /**
   * コンストラクタ
   *
   * @param env - Cloudflare Workers環境変数
   * @param config - オプショナルな設定（APIから渡される）
   */
  constructor(
    private env: Env,
    private config?: {
      petsPerPage?: number
      maxPages?: number
      maxBatchSize?: number
      requestsPerSecond?: number
    }
  ) {
    this.db = drizzle(this.env.DB)
  }

  /**
   * メインクロール処理
   *
   * @param petType - クロール対象のペットタイプ（'dog' | 'cat'）
   * @param limit - 取得するペットの上限数（デフォルト: 10）
   * @returns クロール結果
   * @description 指定されたタイプのペット情報を取得し、API経由でデータベースに保存
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

    const batchId = `batch-${Date.now()}-${petType}`
    const processedPetIds: string[] = []

    try {
      const pets = await this.fetchPets(petType, limit)
      result.totalPets = pets.length

      // Service Bindingが利用可能な場合はAPI経由で送信
      if (this.env.API_SERVICE) {
        const apiResult = await this.submitToAPI(pets, petType)
        result.newPets = apiResult.newPets
        result.updatedPets = apiResult.updatedPets
        result.success = apiResult.success
        result.errors = apiResult.errors

        // 処理済みペットIDを収集
        pets.forEach((pet) => processedPetIds.push(pet.id))
      } else {
        // 従来のローカルDB保存処理
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
            processedPetIds.push(pet.id)
          } catch (error) {
            result.errors.push(`Failed to process pet ${pet.id}: ${error}`)
          }
        }

        result.success = result.errors.length === 0
      }

      // crawler_statesテーブルを更新
      await this.updateCrawlerState(petType, result, processedPetIds, batchId)

      // Screenshot Queueへ送信（画像がないペットのみ）
      await this.sendToScreenshotQueue(petType, batchId)

      return result
    } catch (error) {
      result.errors.push(`Crawling failed: ${error}`)
      return result
    }
  }

  /**
   * APIにペット情報を送信
   *
   * @param pets - 送信するペット情報の配列
   * @param petType - ペットタイプ
   * @returns クロール結果
   * @description Service Binding経由でAPIにペット情報を送信し、
   * データベースへの保存とDispatcherを通じたスクリーンショット処理をトリガー
   */
  private async submitToAPI(
    pets: Pet[],
    petType: 'dog' | 'cat'
  ): Promise<{
    success: boolean
    newPets: number
    updatedPets: number
    errors: string[]
  }> {
    const apiClient = new ApiServiceClient(this.env.API_SERVICE)

    if (!apiClient.isAvailable()) {
      return {
        success: false,
        newPets: 0,
        updatedPets: 0,
        errors: ['API Service not configured'],
      }
    }

    const result = await apiClient.submitCrawlerData(
      {
        source: 'pet-home',
        petType,
        pets,
        crawlStats: {
          totalProcessed: pets.length,
          successCount: pets.length,
        },
      },
      this.env.CRAWLER_API_KEY || ''
    )

    if (Result.isOk(result)) {
      // result.dataはCrawlerSubmitResult型そのものを返すはずだが、
      // ServiceClientがdata wrapperを追加している可能性がある
      const data = result.data
      if (!data) {
        return {
          success: false,
          newPets: 0,
          updatedPets: 0,
          errors: ['No data returned from API'],
        }
      }

      return {
        success: data.success ?? false,
        newPets: data.newPets ?? 0,
        updatedPets: data.updatedPets ?? 0,
        errors: [],
      }
    } else {
      return {
        success: false,
        newPets: 0,
        updatedPets: 0,
        errors: [result.error.message],
      }
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
    const petsPerPage = this.config?.petsPerPage || PetHomeCrawler.DEFAULT_PETS_PER_PAGE
    const maxPages = this.config?.maxPages || PetHomeCrawler.DEFAULT_MAX_PAGES

    const baseUrl = `${PetHomeCrawler.BASE_URL}/${petType}s/status_2/`
    const actualMaxPages = Math.min(Math.ceil(limit / petsPerPage), maxPages)

    for (let page = 1; page <= actualMaxPages && pets.length < limit; page++) {
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
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': HTTP_CONFIG.USER_AGENT,
          ...HTTP_CONFIG.DEFAULT_HEADERS,
        },
        signal: AbortSignal.timeout(FETCH_CONFIG.REQUEST_TIMEOUT),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`)
      }

      return response.text()
    } catch (error) {
      console.error(`fetchPage error for ${url}:`, error)
      throw error
    }
  }

  /**
   * ペットリストをパース（堅牢な複数セレクター対応）
   *
   * @param html - 一覧ページのHTML
   * @param _petType - ペットタイプ（現在未使用）
   * @returns ペットIDと詳細URLの配列
   * @description 一覧ページからペットの基本情報を抽出。
   * 複数のCSSセレクターパターンを試行して堅牢性を向上
   */
  private parsePetList(
    html: string,
    _petType: 'dog' | 'cat'
  ): Array<{ id: string; detailUrl: string }> {
    const $ = cheerio.load(html)
    const pets: Array<{ id: string; detailUrl: string }> = []

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
                detailUrl: href.startsWith('http') ? href : `${PetHomeCrawler.BASE_URL}${href}`,
              })
            }
          }
        }
      })

      // いずれかのセレクターで結果が得られたら終了
      if (pets.length > 0) {
        break
      }
    }

    // 最後の手段: ページ内のすべてのペットリンクを探索
    if (pets.length === 0) {
      $('a[href*="pn"]').each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          const idMatch = href.match(/pn(\d+)/)
          if (idMatch) {
            const petId = `pn${idMatch[1]}`
            if (!pets.some((p) => p.id === petId)) {
              pets.push({
                id: petId,
                detailUrl: href.startsWith('http') ? href : `${PetHomeCrawler.BASE_URL}${href}`,
              })
            }
          }
        }
      })
    }

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
    const breed = breedLink.text().trim() || null

    // 年齢（数値として処理）
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
    const description = $('.list_title:contains("性格・特徴")').next('p.info').text().trim() || null

    // 画像
    const imageUrl = $('.main_photo img, .photo_main img').attr('src')
    const images: string[] = []
    if (imageUrl) {
      const fullImageUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${PetHomeCrawler.BASE_URL}${imageUrl}`
      images.push(fullImageUrl)
    }

    const now = new Date().toISOString()

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
      location: city ? `${prefecture} ${city}` : prefecture,
      prefecture,
      city,
      medicalInfo: null,
      careRequirements: null,
      goodWith: null,
      healthNotes: null,
      coatLength: null,
      isNeutered: 0,
      isVaccinated: 0,
      vaccinationStatus: null,
      isFivFelvTested: 0,
      exerciseLevel: null,
      trainingLevel: null,
      socialLevel: null,
      indoorOutdoor: null,
      groomingRequirements: null,
      goodWithKids: 0,
      goodWithDogs: 0,
      goodWithCats: 0,
      apartmentFriendly: 0,
      needsYard: 0,
      imageUrl: images && images.length > 0 ? images[0] : null,
      hasJpeg: images && images.length > 0 ? 1 : 0,
      hasWebp: 0,
      imageCheckedAt: null,
      screenshotRequestedAt: null,
      screenshotCompletedAt: null,
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
    try {
      const result = await this.db
        .select({ id: pets.id })
        .from(pets)
        .where(eq(pets.id, id))
        .limit(1)
      return result.length > 0
    } catch (error) {
      console.error(`Failed to check existing pet ${id}:`, error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw new Error(
        `Failed query: select "id" from "pets" where "pets"."id" = ? limit ?\nparams: ${id},1`
      )
    }
  }

  /**
   * ペットを作成
   *
   * @param pet - 作成するペット情報
   * @description 新しいペット情報をデータベースに挿入。
   * Pet型をデータベーススキーマに直接マッピング
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
      sourceId: 'pet-home',
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    })
  }

  /**
   * ペットを更新
   *
   * @param pet - 更新するペット情報
   * @description 既存のペット情報を最新のデータで更新。
   * ID以外の全フィールドとupdatedAtを更新
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
        goodWith: pet.goodWith,
        healthNotes: pet.healthNotes,
        coatLength: pet.coatLength,
        isNeutered: pet.isNeutered,
        isVaccinated: pet.isVaccinated,
        vaccinationStatus: pet.vaccinationStatus,
        isFivFelvTested: pet.isFivFelvTested,
        exerciseLevel: pet.exerciseLevel,
        trainingLevel: pet.trainingLevel,
        socialLevel: pet.socialLevel,
        indoorOutdoor: pet.indoorOutdoor,
        groomingRequirements: pet.groomingRequirements,
        goodWithKids: pet.goodWithKids,
        goodWithDogs: pet.goodWithDogs,
        goodWithCats: pet.goodWithCats,
        apartmentFriendly: pet.apartmentFriendly,
        needsYard: pet.needsYard,
        imageUrl: pet.imageUrl,
        hasJpeg: pet.hasJpeg,
        hasWebp: pet.hasWebp,
        imageCheckedAt: pet.imageCheckedAt,
        screenshotRequestedAt: pet.screenshotRequestedAt,
        screenshotCompletedAt: pet.screenshotCompletedAt,
        shelterName: pet.shelterName,
        shelterContact: pet.shelterContact,
        sourceUrl: pet.sourceUrl,
        sourceId: pet.sourceId,
        adoptionFee: pet.adoptionFee,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(pets.id, pet.id))
  }

  /**
   * 画像をR2に保存
   *
   * @param pet - 画像を保存するペット情報
   * @description ペットの画像URLから画像をダウンロードし、
   * Cloudflare R2ストレージに保存。エラーが発生しても処理を継続
   */
  private async saveImageToR2(pet: Pet): Promise<void> {
    if (!pet.imageUrl) {
      return
    }

    const imageUrl = pet.imageUrl
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return
    }

    try {
      const response = await fetch(imageUrl, {
        headers: { 'User-Agent': PetHomeCrawler.USER_AGENT },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) return

      const imageBuffer = await response.arrayBuffer()
      const key = R2_PATHS.pets.original(pet.type, pet.id)

      await this.env.IMAGES_BUCKET.put(key, imageBuffer, {
        httpMetadata: {
          contentType: 'image/jpeg',
        },
        customMetadata: {
          petId: pet.id,
          petType: pet.type,
          imageIndex: '0',
          uploadedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error(`Failed to save image for pet ${pet.id}:`, error)
    }
  }

  /**
   * crawler_statesテーブルを更新
   *
   * @param petType - ペットタイプ
   * @param result - クロール結果
   * @param processedPetIds - 処理済みペットID一覧
   * @param batchId - バッチID
   */
  private async updateCrawlerState(
    petType: 'dog' | 'cat',
    result: CrawlResult,
    processedPetIds: string[],
    batchId: string
  ): Promise<void> {
    try {
      // 画像がないペットを特定
      const pendingScreenshotPets: string[] = []
      for (const petId of processedPetIds) {
        const petRecord = await this.db.select().from(pets).where(eq(pets.id, petId)).get()

        if (petRecord && !petRecord.hasJpeg) {
          pendingScreenshotPets.push(petId)
        }
      }

      const checkpoint: CrawlerCheckpoint = {
        batchId,
        totalFetched: result.totalPets,
        newPets: result.newPets,
        updatedPets: result.updatedPets,
        processedPetIds,
        screenshotQueue: {
          sent: 0,
          pending: pendingScreenshotPets,
        },
        conversionQueue: {
          sent: 0,
          pending: [],
        },
        lastProcessedAt: new Date().toISOString(),
        errors: result.errors,
      }

      // 既存レコードを確認
      const existing = await this.env.DB.prepare(
        'SELECT id FROM crawler_states WHERE sourceId = ? AND petType = ?'
      )
        .bind('pet-home', petType)
        .first()

      if (existing) {
        // 既存レコードを更新
        await this.env.DB.prepare(
          `
            UPDATE crawler_states
            SET checkpoint = ?, totalProcessed = ?, lastCrawlAt = ?, updatedAt = ?
            WHERE sourceId = ? AND petType = ?
          `
        )
          .bind(
            JSON.stringify(checkpoint),
            result.totalPets,
            new Date().toISOString(),
            new Date().toISOString(),
            'pet-home',
            petType
          )
          .run()
      } else {
        // 新規レコード挿入
        await this.env.DB.prepare(
          `
            INSERT INTO crawler_states (sourceId, petType, checkpoint, totalProcessed, lastCrawlAt, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `
        )
          .bind(
            'pet-home',
            petType,
            JSON.stringify(checkpoint),
            result.totalPets,
            new Date().toISOString(),
            new Date().toISOString(),
            new Date().toISOString()
          )
          .run()
      }

      console.log(
        `Updated crawler_states for ${petType}: batch=${batchId}, total=${result.totalPets}`
      )
    } catch (error) {
      console.error('Failed to update crawler_states:', error)
    }
  }

  /**
   * Screenshot Queueへペット情報を送信
   *
   * @param petType - ペットタイプ
   * @param batchId - バッチID
   */
  private async sendToScreenshotQueue(petType: 'dog' | 'cat', batchId: string): Promise<void> {
    try {
      // crawler_statesから最新の状態を取得
      const stateResult = await this.env.DB.prepare(
        'SELECT checkpoint FROM crawler_states WHERE sourceId = ? AND petType = ?'
      )
        .bind('pet-home', petType)
        .first<{ checkpoint: string }>()

      if (!stateResult) {
        console.warn('No crawler state found for screenshot queue')
        return
      }

      const checkpoint = JSON.parse(stateResult.checkpoint) as CrawlerCheckpoint

      // pendingのペットをScreenshot Queueへ送信
      const pendingPets = checkpoint.screenshotQueue.pending
      if (pendingPets.length === 0) {
        console.log('No pets pending for screenshot')
        return
      }

      // バッチメッセージを作成
      const messages = pendingPets.map((petId) => ({
        body: {
          batchId,
          petId,
          petType,
          expectedTotal: checkpoint.totalFetched,
          source: 'crawler',
          timestamp: new Date().toISOString(),
        },
      }))

      // Queueへバッチ送信
      await this.env.PAWMATCH_SCREENSHOT_QUEUE.sendBatch(messages)
      console.log(`Sent ${pendingPets.length} pets to screenshot queue`)

      // checkpointを更新（sent数を増やし、pendingをクリア）
      checkpoint.screenshotQueue.sent = pendingPets.length
      checkpoint.screenshotQueue.pending = []

      await this.env.DB.prepare(
        `
          UPDATE crawler_states
          SET checkpoint = ?, updatedAt = ?
          WHERE sourceId = ? AND petType = ?
        `
      )
        .bind(JSON.stringify(checkpoint), new Date().toISOString(), 'pet-home', petType)
        .run()
    } catch (error) {
      console.error('Failed to send to screenshot queue:', error)
    }
  }
}
