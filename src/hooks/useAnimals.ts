/**
 * 動物データを取得するためのカスタムフック
 * GraphQL + Apollo Clientを使用してデータを取得
 * 
 * 責任分離:
 * - データ取得ロジック
 * - エラーハンドリング
 * - 型安全性の保証
 */

import { useQuery } from '@apollo/client'
import { Dog } from '@/types/dog'
import { Cat } from '@/types/cat'
import { GET_DOGS, GET_CATS, GET_ANIMALS } from '@/graphql/queries'
import type { GetDogsVariables, GetCatsVariables, GetAnimalsVariables, AnimalFilter } from '@/types/graphql'

export interface UseAnimalsResult {
  animals: (Dog | Cat)[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// デフォルトのクエリオプション
const DEFAULT_QUERY_OPTIONS = {
  page: 1,
  limit: 50,
  errorPolicy: 'all' as const,
}

/**
 * 指定された動物種のデータを取得
 * @param species 動物種別
 * @param filter オプションのフィルター条件
 */
export function useAnimals(species: 'dog' | 'cat', filter?: AnimalFilter): UseAnimalsResult {
  // クエリ変数の構築
  const variables = buildQueryVariables(species, filter)
  
  // クエリの選択
  const query = getQueryBySpecies(species)

  const { data, loading, error, refetch } = useQuery(query, {
    variables,
    ...DEFAULT_QUERY_OPTIONS,
  })

  // データの正規化
  const animals = extractAnimalsFromResponse(data)

  return {
    animals,
    loading,
    error: error?.message || null,
    refetch: () => refetch()
  }
}

/**
 * 動物種別に応じたクエリ変数を構築
 */
function buildQueryVariables(species: 'dog' | 'cat', filter?: AnimalFilter) {
  const baseVariables = {
    page: DEFAULT_QUERY_OPTIONS.page,
    limit: DEFAULT_QUERY_OPTIONS.limit
  }

  if (species === 'dog') {
    return baseVariables as GetDogsVariables
  } else if (species === 'cat') {
    return baseVariables as GetCatsVariables
  } else {
    return {
      filter: { species, ...filter },
      ...baseVariables
    } as GetAnimalsVariables
  }
}

/**
 * 動物種別に応じたGraphQLクエリを取得
 */
function getQueryBySpecies(species: 'dog' | 'cat') {
  switch (species) {
    case 'dog':
      return GET_DOGS
    case 'cat':
      return GET_CATS
    default:
      return GET_ANIMALS
  }
}

/**
 * GraphQLレスポンスから動物データを抽出
 */
function extractAnimalsFromResponse(data: unknown): (Dog | Cat)[] {
  if (!data || typeof data !== 'object') {
    return []
  }
  
  const response = data as Record<string, { animals: (Dog | Cat)[] }>
  return response?.dogs?.animals || response?.cats?.animals || response?.animals?.animals || []
}

/**
 * 犬データを取得
 * useAnimalsの特化版として実装
 */
export function useDogs(): UseAnimalsResult {
  return useAnimals('dog')
}

/**
 * 猫データを取得
 * useAnimalsの特化版として実装
 */
export function useCats(): UseAnimalsResult {
  return useAnimals('cat')
}