/**
 * APIクライアント
 * ペット情報の取得を担当するサービス層
 */

import { FrontendPet } from '../types/pet'
import type { Pet as SharedPet } from '../../../shared/types'
import { getPetType } from '../config/petConfig'
import { Location } from '../components/LocationModal'

/** APIのベースURL（環境変数から取得、デフォルトは本番環境） */
const API_BASE_URL = process.env['NEXT_PUBLIC_BUDDIES_API_URL'] || 'https://buddies-api.elchika.app'

/** API共通レスポンス型 */
interface ApiResponse<T> {
  /** リクエスト成功フラグ */
  success: boolean
  /** レスポンスデータ */
  data?: T
  /** エラーメッセージ */
  error?: string
}

/** ペット一覧APIレスポンス型（バックエンド形式） */
interface PetsResponse {
  /** ペット配列 */
  pets: SharedPet[]
  /** 総件数 */
  total: number
  /** 現在のページ番号 */
  page: number
  /** 1ページあたりの件数 */
  limit: number
}

/** ペット一覧APIレスポンス型（フロントエンド形式） */
interface FrontendPetsResponse {
  /** ペット配列（フロントエンド型） */
  pets: FrontendPet[]
  /** 総件数 */
  total: number
  /** 現在のページ番号 */
  page: number
  /** 1ページあたりの件数 */
  limit: number
}

/**
 * ペットAPI クライアントクラス
 * APIとの通信を管理
 */
class PetApi {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  /**
   * ペット一覧を取得（ページネーション対応）
   * @param offset 開始位置
   * @param limit 取得件数
   * @param locations 地域フィルター
   * @returns ペット一覧レスポンス
   */
  async fetchPets(
    offset: number = 0,
    limit: number = 10,
    locations?: Location[]
  ): Promise<FrontendPetsResponse> {
    // ペットタイプ（犬/猫）を取得
    const petType = getPetType()
    // offsetからpageを計算（1ベースのページ番号）
    const page = Math.floor(offset / limit) + 1

    // URLパラメータを構築
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())

    // 地域フィルター（都道府県のみ）をパラメータに追加
    if (locations && locations.length > 0) {
      const prefectures = new Set<string>()

      locations.forEach((loc) => {
        prefectures.add(loc.prefecture)
      })

      prefectures.forEach((pref) => params.append('prefecture[]', pref))
    }

    const url = `${this.baseUrl}/api/pets/type/${petType}?${params.toString()}`

    try {
      // APIリクエスト（APIキー認証付き）
      const response = await fetch(url, {
        headers: {
          'X-API-Key': process.env['NEXT_PUBLIC_BUDDIES_API_KEY'] || '',
        },
      })

      // HTTPステータスチェック
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // レスポンスJSONをパース
      const data = (await response.json()) as ApiResponse<PetsResponse>

      // APIレスポンスの成功チェック
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch pets')
      }

      // SharedPet型は既にFrontendPet型と互換性があるため、変換不要
      const frontendPets = data.data.pets as FrontendPet[]

      return {
        ...data.data,
        pets: frontendPets,
      }
    } catch (error) {
      console.error('Error fetching pets:', error)
      throw error
    }
  }

  /**
   * 全ペット情報を取得（ページング自動処理）
   * @param locations 地域フィルター
   * @returns 全ペットの配列
   */
  async fetchAllPets(locations?: Location[]): Promise<FrontendPet[]> {
    const allPets: FrontendPet[] = []
    const limit = 100 // 1回あたりの取得件数
    let offset = 0
    let hasMore = true

    // ページング処理：全件取得するまでループ
    while (hasMore) {
      const response = await this.fetchPets(offset, limit, locations)
      allPets.push(...response.pets)

      // 取得件数がlimitと同じならまだデータがある可能性
      hasMore = response.pets.length === limit
      offset += limit
    }

    return allPets
  }
}

/** PetApiクラスのシングルトンインスタンス */
export const petApi = new PetApi()
export default petApi
