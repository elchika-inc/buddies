import { z } from 'zod'

/**
 * JSONファイルから読み込むペットデータのスキーマ
 *
 * 必須フィールド:
 *   - id: ペットID（画像ファイル名と対応）
 *   - name: ペット名
 *   - type: ペットタイプ（'dog' | 'cat'）
 *
 * その他のフィールドは全てオプション
 * 未指定フィールドはPetDataGeneratorで自動生成されます
 */
export const PetJsonSchema = z.object({
  // 必須フィールド
  id: z.string().min(1, 'IDは必須です'),
  name: z.string().min(1, '名前は必須です'),
  type: z.enum(['dog', 'cat'], {
    errorMap: () => ({ message: 'typeは"dog"または"cat"である必要があります' })
  }),

  // オプションフィールド - 基本情報
  breed: z.string().optional(),
  age: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),

  // オプションフィールド - 場所
  prefecture: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),

  // オプションフィールド - 説明・性格
  description: z.string().optional(),
  personality: z.string().optional(),

  // オプションフィールド - 医療情報
  medicalInfo: z.string().optional(),
  vaccinationStatus: z.string().optional(),
  isNeutered: z.union([z.number(), z.boolean()]).optional(),
  isVaccinated: z.union([z.number(), z.boolean()]).optional(),
  isFivFelvTested: z.union([z.number(), z.boolean()]).optional(),
  healthNotes: z.string().optional(),

  // オプションフィールド - ケア要件
  careRequirements: z.string().optional(),
  goodWith: z.string().optional(),
  goodWithKids: z.union([z.number(), z.boolean()]).optional(),
  goodWithDogs: z.union([z.number(), z.boolean()]).optional(),
  goodWithCats: z.union([z.number(), z.boolean()]).optional(),
  specialNeeds: z.union([z.number(), z.boolean()]).optional(),

  // オプションフィールド - 外見
  color: z.string().optional(),
  weight: z.number().optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  coatLength: z.enum(['short', 'medium', 'long']).optional(),

  // オプションフィールド - 行動レベル（犬）
  exerciseLevel: z.enum(['low', 'medium', 'high']).optional(),
  trainingLevel: z.enum(['none', 'basic', 'advanced']).optional(),

  // オプションフィールド - 行動レベル（猫）
  socialLevel: z.enum(['low', 'medium', 'high']).optional(),
  indoorOutdoor: z.enum(['indoor', 'outdoor', 'both']).optional(),

  // オプションフィールド - その他
  adoptionFee: z.number().optional(),
  status: z.enum(['available', 'pending', 'adopted']).optional(),
})

export type PetJson = z.infer<typeof PetJsonSchema>

/**
 * バリデーション結果
 */
export interface ValidationResult {
  success: boolean
  data?: PetJson
  error?: string
}

/**
 * JSONデータをバリデーション
 */
export function validatePetJson(data: unknown): ValidationResult {
  try {
    const parsed = PetJsonSchema.parse(data)
    return { success: true, data: parsed }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: messages }
    }
    return { success: false, error: String(error) }
  }
}
