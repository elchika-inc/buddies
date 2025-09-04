/**
 * APIクライアント
 */

import { Pet } from '@/types/pet'
import { getPetType } from '@/config/petConfig'

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'https://pawmatch-api.elchika.app'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface PetsResponse {
  pets: Pet[]
  total: number
  page: number
  limit: number
}

class PetApi {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async fetchPets(offset: number = 0, limit: number = 10): Promise<PetsResponse> {
    const petType = getPetType()
    const url = `${this.baseUrl}/api/pets/${petType}?offset=${offset}&limit=${limit}`

    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': process.env['NEXT_PUBLIC_API_KEY'] || ''
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json() as ApiResponse<PetsResponse>
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch pets')
      }

      return data.data
    } catch (error) {
      console.error('Error fetching pets:', error)
      throw error
    }
  }

  async fetchAllPets(): Promise<Pet[]> {
    const allPets: Pet[] = []
    const limit = 100
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const response = await this.fetchPets(offset, limit)
      allPets.push(...response.pets)
      
      hasMore = response.pets.length === limit
      offset += limit
    }

    return allPets
  }
}

const petApi = new PetApi()
export default petApi