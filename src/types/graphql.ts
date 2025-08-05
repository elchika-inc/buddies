// GraphQL関連の型定義
import type { Dog } from './dog';
import type { Cat } from './cat';
import type { BaseAnimal } from './common';

// GraphQLコンテキスト型
export interface GraphQLContext {
  db?: any; // D1Database type
}

// GraphQLリゾルバー引数の型
export interface GraphQLResolverArgs {
  parent: unknown;
  args: Record<string, unknown>;
  context: GraphQLContext;
  info: unknown;
}

export interface AnimalFilter {
  species?: 'dog' | 'cat';
  breed?: string;
  ageMin?: number;
  ageMax?: number;
  gender?: 'male' | 'female';
  size?: 'small' | 'medium' | 'large';
  location?: string;
  healthStatus?: 'healthy' | 'special_needs' | 'medical_attention';
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface AnimalConnection {
  animals: (Dog | Cat | BaseAnimal)[];
  pagination: PaginationInfo;
}

export interface SwipeAction {
  id: string;
  animalId: string;
  userId: string;
  action: string;
  timestamp: string;
}

// クエリ変数の型定義
export interface GetAnimalsVariables {
  filter?: AnimalFilter;
  page?: number;
  limit?: number;
}

export interface GetAnimalVariables {
  id: string;
}

export interface GetDogsVariables {
  page?: number;
  limit?: number;
}

export interface GetCatsVariables {
  page?: number;
  limit?: number;
}

export interface SearchAnimalsVariables {
  query: string;
  species?: 'dog' | 'cat';
  page?: number;
  limit?: number;
}

export interface GetFeaturedAnimalsVariables {
  species?: 'dog' | 'cat';
  limit?: number;
}

export interface GetRecentAnimalsVariables {
  species?: 'dog' | 'cat';
  limit?: number;
}

export interface RecordSwipeVariables {
  animalId: string;
  action: string;
}

export interface ToggleFavoriteVariables {
  animalId: string;
}