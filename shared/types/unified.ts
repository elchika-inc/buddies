/**
 * 統一されたPet型定義
 * このファイルが唯一の信頼できるPet型のソースです
 */

import { z } from 'zod';

// ペットのタイプ
export const PetTypeSchema = z.enum(['dog', 'cat']);
export type PetType = z.infer<typeof PetTypeSchema>;

// ペットのステータス
export const PetStatusSchema = z.enum(['available', 'adopted', 'pending', 'unavailable']);
export type PetStatus = z.infer<typeof PetStatusSchema>;

// ペットの性別
export const PetGenderSchema = z.enum(['male', 'female', 'unknown']);
export type PetGender = z.infer<typeof PetGenderSchema>;

// ペットのサイズ
export const PetSizeSchema = z.enum(['small', 'medium', 'large', 'extra_large']);
export type PetSize = z.infer<typeof PetSizeSchema>;

// 年齢グループ
export const AgeGroupSchema = z.enum(['baby', 'young', 'adult', 'senior']);
export type AgeGroup = z.infer<typeof AgeGroupSchema>;

// 基本的なPetスキーマ
export const PetSchema = z.object({
  id: z.string(),
  type: PetTypeSchema,
  name: z.string(),
  breed: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  age_group: AgeGroupSchema.nullable().optional(),
  gender: PetGenderSchema,
  size: PetSizeSchema.nullable().optional(),
  weight: z.number().nullable().optional(),
  color: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  prefecture: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  status: PetStatusSchema,
  medical_info: z.string().nullable().optional(),
  vaccination_status: z.string().nullable().optional(),
  spayed_neutered: z.boolean().nullable().optional(),
  special_needs: z.string().nullable().optional(),
  personality_traits: z.array(z.string()).nullable().optional(),
  good_with_kids: z.boolean().nullable().optional(),
  good_with_pets: z.boolean().nullable().optional(),
  adoption_fee: z.number().nullable().optional(),
  organization_id: z.string().nullable().optional(),
  organization_name: z.string().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  posted_date: z.string().nullable().optional(),
  updated_date: z.string().nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  external_id: z.string().nullable().optional(),
  care_requirements: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  video_url: z.string().url().nullable().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  views: z.number().default(0),
  likes: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

// TypeScript型の導出
export type Pet = z.infer<typeof PetSchema>;

// 画像情報の型定義
export const ImageSchema = z.object({
  id: z.string(),
  pet_id: z.string(),
  url: z.string(),
  thumbnail_url: z.string().nullable().optional(),
  alt_text: z.string().nullable().optional(),
  is_primary: z.boolean().default(false),
  display_order: z.number().default(0),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  size: z.number().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  status: z.enum(['pending', 'processed', 'failed', 'deleted']).default('pending'),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Image = z.infer<typeof ImageSchema>;

// ペットと画像を含む完全な型
export const PetWithImagesSchema = PetSchema.extend({
  images_data: z.array(ImageSchema).default([]),
});

export type PetWithImages = z.infer<typeof PetWithImagesSchema>;

// APIレスポンス用の型
export const PetResponseSchema = z.object({
  success: z.boolean(),
  data: PetSchema.nullable().optional(),
  error: z.string().nullable().optional(),
});

export type PetResponse = z.infer<typeof PetResponseSchema>;

export const PetsListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(PetSchema).default([]),
  total: z.number().default(0),
  page: z.number().default(1),
  limit: z.number().default(20),
  error: z.string().nullable().optional(),
});

export type PetsListResponse = z.infer<typeof PetsListResponseSchema>;

// フィルター用の型
export const PetFilterSchema = z.object({
  type: PetTypeSchema.optional(),
  status: PetStatusSchema.optional(),
  gender: PetGenderSchema.optional(),
  size: PetSizeSchema.optional(),
  age_group: AgeGroupSchema.optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  good_with_kids: z.boolean().optional(),
  good_with_pets: z.boolean().optional(),
  featured: z.boolean().optional(),
  organization_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

export type PetFilter = z.infer<typeof PetFilterSchema>;

// ソート用の型
export const PetSortSchema = z.enum([
  'created_at_desc',
  'created_at_asc',
  'updated_at_desc',
  'updated_at_asc',
  'name_asc',
  'name_desc',
  'views_desc',
  'likes_desc',
]);

export type PetSort = z.infer<typeof PetSortSchema>;

// ペット作成用の入力型
export const CreatePetInputSchema = PetSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  views: true,
  likes: true,
}).partial();

export type CreatePetInput = z.infer<typeof CreatePetInputSchema>;

// ペット更新用の入力型
export const UpdatePetInputSchema = CreatePetInputSchema.partial();

export type UpdatePetInput = z.infer<typeof UpdatePetInputSchema>;

// 型ガード関数
export const isPet = (value: unknown): value is Pet => {
  return PetSchema.safeParse(value).success;
};

export const isPetWithImages = (value: unknown): value is PetWithImages => {
  return PetWithImagesSchema.safeParse(value).success;
};

export const isImage = (value: unknown): value is Image => {
  return ImageSchema.safeParse(value).success;
};

// ヘルパー関数
export const validatePet = (data: unknown): Pet => {
  return PetSchema.parse(data);
};

export const validatePetPartial = (data: unknown) => {
  return PetSchema.partial().parse(data);
};

export const validateCreatePetInput = (data: unknown): CreatePetInput => {
  return CreatePetInputSchema.parse(data);
};

export const validateUpdatePetInput = (data: unknown): UpdatePetInput => {
  return UpdatePetInputSchema.parse(data);
};

// デフォルト値の生成関数
export const createDefaultPet = (overrides?: Partial<Pet>): Pet => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: 'dog',
    name: 'Unknown',
    breed: null,
    age: null,
    age_group: null,
    gender: 'unknown',
    size: null,
    weight: null,
    color: null,
    description: null,
    location: null,
    prefecture: null,
    city: null,
    status: 'available',
    medical_info: null,
    vaccination_status: null,
    spayed_neutered: null,
    special_needs: null,
    personality_traits: null,
    good_with_kids: null,
    good_with_pets: null,
    adoption_fee: null,
    organization_id: null,
    organization_name: null,
    contact_email: null,
    contact_phone: null,
    posted_date: null,
    updated_date: null,
    source_url: null,
    external_id: null,
    care_requirements: null,
    images: [],
    video_url: null,
    tags: [],
    featured: false,
    views: 0,
    likes: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};