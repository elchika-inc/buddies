/**
 * GraphQL関連の型定義
 */

export interface AnimalFilter {
  species?: 'dog' | 'cat'
  age?: {
    min?: number
    max?: number
  }
  breed?: string
  gender?: 'male' | 'female'
  location?: string
  adoptionStatus?: 'available' | 'pending' | 'adopted'
  size?: 'small' | 'medium' | 'large'
}

export interface GetDogsVariables {
  page?: number
  limit?: number
}

export interface GetCatsVariables {
  page?: number
  limit?: number
}

export interface GetAnimalsVariables {
  filter?: AnimalFilter
  page?: number
  limit?: number
}

export interface Pagination {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface GraphQLAnimalResponse<T> {
  animals: T[]
  pagination: Pagination
}