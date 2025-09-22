import { z } from 'zod'

// ペットのバリデーションスキーマ
export const petSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['dog', 'cat']),
  name: z.string().min(1, '名前は必須です'),
  breed: z.string().optional(),
  age: z.string().optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  personality: z.string().optional(),
  medicalInfo: z.string().optional(),
  careRequirements: z.string().optional(),
  goodWith: z.string().optional(),
  healthNotes: z.string().optional(),
  color: z.string().optional(),
  weight: z.number().positive().optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  coatLength: z.enum(['short', 'medium', 'long']).optional(),
  isNeutered: z.number().min(0).max(1).optional(),
  isVaccinated: z.number().min(0).max(1).optional(),
  vaccinationStatus: z.string().optional(),
  isFivFelvTested: z.number().min(0).max(1).optional(),
  exerciseLevel: z.enum(['low', 'medium', 'high']).optional(),
  trainingLevel: z.enum(['none', 'basic', 'advanced']).optional(),
  socialLevel: z.enum(['low', 'medium', 'high']).optional(),
  indoorOutdoor: z.enum(['indoor', 'outdoor', 'both']).optional(),
  groomingRequirements: z.string().optional(),
  goodWithKids: z.number().min(0).max(1).optional(),
  goodWithDogs: z.number().min(0).max(1).optional(),
  goodWithCats: z.number().min(0).max(1).optional(),
  apartmentFriendly: z.number().min(0).max(1).optional(),
  needsYard: z.number().min(0).max(1).optional(),
  imageUrl: z.string().url().optional(),
  additionalImages: z.string().optional(),
  shelterName: z.string().optional(),
  shelterContact: z.string().optional(),
  shelterId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  sourceId: z.string().optional(),
  adoptionFee: z.number().min(0).optional(),
  rescueDate: z.string().optional(),
  isPromoted: z.number().min(0).max(1).optional(),
  viewCount: z.number().min(0).optional(),
  likeCount: z.number().min(0).optional(),
  applicationCount: z.number().min(0).optional(),
  status: z.enum(['available', 'pending', 'adopted', 'unavailable']).optional(),
  specialNeeds: z.number().min(0).max(1).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

// APIキーのバリデーションスキーマ
export const apiKeySchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(32, 'APIキーは32文字以上必要です'),
  name: z.string().min(1, '名前は必須です'),
  type: z.enum(['public', 'internal', 'admin']),
  permissions: z.string(), // JSON配列の文字列
  rateLimit: z.number().min(1).max(10000).optional(),
  expiresAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  lastUsedAt: z.string().optional(),
  isActive: z.number().min(0).max(1).optional(),
  metadata: z.string().optional(), // JSON文字列
})

// フィールドごとの必須・オプション情報を取得する関数
export function getFieldRequirements(schema: z.ZodSchema<any>) {
  const shape = (schema as any)._def.shape()
  const requirements: Record<string, { required: boolean; label: string }> = {}

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodType<any>
    const isOptional = zodType.isOptional()

    // フィールド名を日本語ラベルに変換
    const labels: Record<string, string> = {
      // ペット共通
      id: 'ID',
      type: 'タイプ',
      name: '名前',
      breed: '品種',
      age: '年齢',
      gender: '性別',
      prefecture: '都道府県',
      city: '市区町村',
      location: '場所',
      description: '説明',
      personality: '性格',
      medicalInfo: '医療情報',
      careRequirements: 'ケア要件',
      goodWith: '相性が良い対象',
      healthNotes: '健康メモ',
      color: '毛色',
      weight: '体重',
      size: 'サイズ',
      coatLength: '毛の長さ',
      isNeutered: '去勢・避妊済み',
      isVaccinated: 'ワクチン接種済み',
      vaccinationStatus: 'ワクチン接種状況',
      isFivFelvTested: 'FIV/FeLV検査済み',
      exerciseLevel: '運動レベル',
      trainingLevel: '訓練レベル',
      socialLevel: '社交性レベル',
      indoorOutdoor: '飼育環境',
      groomingRequirements: 'グルーミング要件',
      goodWithKids: '子供OK',
      goodWithDogs: '犬OK',
      goodWithCats: '猫OK',
      apartmentFriendly: 'アパート可',
      needsYard: '庭必要',
      imageUrl: '画像URL',
      additionalImages: '追加画像',
      shelterName: 'シェルター名',
      shelterContact: 'シェルター連絡先',
      shelterId: 'シェルターID',
      sourceUrl: '情報元URL',
      sourceId: '情報元ID',
      adoptionFee: '譲渡費用',
      rescueDate: '保護日',
      isPromoted: 'プロモーション中',
      viewCount: '閲覧数',
      likeCount: 'いいね数',
      applicationCount: '応募数',
      status: 'ステータス',
      specialNeeds: '特別なニーズ',
      createdAt: '作成日時',
      updatedAt: '更新日時',

      // APIキー
      key: 'APIキー',
      permissions: '権限',
      rateLimit: 'レート制限',
      expiresAt: '有効期限',
      lastUsedAt: '最終使用日時',
      isActive: '有効',
      metadata: 'メタデータ',
    }

    requirements[key] = {
      required: !isOptional,
      label: labels[key] || key
    }
  }

  return requirements
}

// タイプ定義
export type Pet = z.infer<typeof petSchema>
export type ApiKey = z.infer<typeof apiKeySchema>