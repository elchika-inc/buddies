/**
 * API通信サービス
 * D1データベースと連携してデータを取得・保存
 */

import { Dog } from '@/types/dog'
import { Cat } from '@/types/cat'

const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:8787'

export interface UserSession {
  userId: string
  sessionId: string
}

export interface SwipeActionRequest {
  userId: string
  animalId: string
  action: 'like' | 'pass' | 'superlike'
}

export interface SwipeActionResponse {
  success: boolean
  swipeId: string
  message: string
}

export interface UserSwipeHistory {
  like: any[]
  pass: any[]
  superlike: any[]
}

/**
 * APIサービスクラス
 */
export class ApiService {
  private static baseUrl = API_BASE_URL

  /**
   * ユーザーセッションを作成
   */
  static async createUserSession(): Promise<UserSession> {
    const response = await fetch(`${this.baseUrl}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to create user session')
    }

    return response.json()
  }

  /**
   * 動物データを取得
   */
  static async getAnimals(species: 'dog' | 'cat'): Promise<(Dog | Cat)[]> {
    const response = await fetch(`${this.baseUrl}/api/animals?species=${species}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch animals')
    }

    const animals = await response.json() as any[]

    // データベースの形式からフロントエンド用の形式に変換
    return animals.map((animal: any) => {
      const baseAnimal = {
        id: animal.id,
        name: animal.name,
        breed: animal.breed,
        age: animal.age,
        gender: animal.gender,
        size: animal.size,
        color: animal.color,
        location: animal.location,
        description: animal.description,
        personality: animal.personality,
        medicalInfo: animal.medical_info,
        careRequirements: animal.care_requirements,
        imageUrl: animal.image_url,
        shelterName: animal.shelter_name,
        shelterContact: animal.shelter_contact,
        adoptionFee: animal.adoption_fee,
        isNeutered: animal.is_neutered,
        isVaccinated: animal.is_vaccinated,
        goodWithKids: animal.good_with_kids,
        goodWithOtherDogs: animal.good_with_other_animals,
        createdAt: animal.created_at,
      }

      if (species === 'dog') {
        return {
          ...baseAnimal,
          exerciseLevel: animal.species_details.exerciseLevel,
          trainingLevel: animal.species_details.trainingLevel,
          walkFrequency: animal.species_details.walkFrequency,
          needsYard: animal.species_details.needsYard,
          apartmentFriendly: animal.species_details.apartmentFriendly,
        } as Dog
      } else {
        return {
          ...baseAnimal,
          coatLength: animal.species_details.coatLength || '短毛',
          indoorOutdoor: animal.species_details.indoorOutdoor || '完全室内',
          socialLevel: animal.species_details.socialLevel || '普通',
          goodWithMultipleCats: animal.species_details.multiCatCompatible || false,
          groomingRequirements: animal.species_details.groomingRequirements || '低',
          vocalizationLevel: animal.species_details.vocalization || '普通',
          activityTime: animal.species_details.activityTime || 'どちらでも',
          playfulness: animal.species_details.playfulness || '中',
          isFIVFeLVTested: animal.species_details.isFIVFeLVTested || false,
        } as Cat
      }
    })
  }

  /**
   * スワイプアクションを記録
   */
  static async recordSwipeAction(swipeAction: SwipeActionRequest): Promise<SwipeActionResponse> {
    const response = await fetch(`${this.baseUrl}/api/swipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(swipeAction),
    })

    if (!response.ok) {
      throw new Error('Failed to record swipe action')
    }

    return response.json()
  }

  /**
   * ユーザーのスワイプ履歴を取得
   */
  static async getUserSwipeHistory(userId: string): Promise<UserSwipeHistory> {
    const response = await fetch(`${this.baseUrl}/api/user/${userId}/swipes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user swipe history')
    }

    return response.json()
  }
}

/**
 * ローカルストレージからユーザーセッションを取得または作成
 */
export async function getUserSession(): Promise<UserSession> {
  const stored = localStorage.getItem('pawmatch_user_session')
  
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      // パースエラーの場合は新しいセッションを作成
    }
  }

  // 新しいセッションを作成
  const session = await ApiService.createUserSession()
  localStorage.setItem('pawmatch_user_session', JSON.stringify(session))
  return session
}

/**
 * ユーザーセッションをクリア
 */
export function clearUserSession(): void {
  localStorage.removeItem('pawmatch_user_session')
}