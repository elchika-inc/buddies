import { faker } from '@faker-js/faker/locale/ja'
import * as crypto from 'crypto'

export type PetType = 'dog' | 'cat'

export interface GeneratedPetData {
  id: string
  type: PetType
  name: string
  breed: string
  age: string
  gender: 'male' | 'female'
  prefecture: string
  city: string
  location: string
  description: string
  personality: string
  medicalInfo: string
  careRequirements: string
  goodWith: string
  healthNotes: string
  color: string
  weight: number
  size: 'small' | 'medium' | 'large'
  coatLength: 'short' | 'medium' | 'long'
  isNeutered: number
  isVaccinated: number
  vaccinationStatus: string
  isFivFelvTested?: number
  exerciseLevel?: 'low' | 'medium' | 'high'
  trainingLevel?: 'none' | 'basic' | 'advanced'
  socialLevel: 'low' | 'medium' | 'high'
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both'
  goodWithKids: number
  goodWithDogs: number
  goodWithCats: number
  specialNeeds: number
  adoptionFee: number
  status: 'available' | 'pending' | 'adopted'
  createdAt: string
  updatedAt: string
}

/**
 * ペットデータジェネレーター
 * faker.jsを使ってリアルなダミーデータを生成
 */
export class PetDataGenerator {
  // 犬の品種リスト
  private readonly dogBreeds = [
    '柴犬', 'トイプードル', 'チワワ', 'ミニチュアダックスフンド', 'ポメラニアン',
    'フレンチブルドッグ', 'ゴールデンレトリバー', 'ラブラドールレトリバー', 'ビーグル', '柴犬',
    'ミニチュアシュナウザー', 'ヨークシャーテリア', 'パグ', 'コーギー', 'マルチーズ',
    'シーズー', 'ボストンテリア', 'ジャックラッセルテリア', '秋田犬', '雑種'
  ]

  // 猫の品種リスト
  private readonly catBreeds = [
    '三毛猫', '黒猫', '白猫', 'キジトラ', 'サバトラ', 'アメリカンショートヘア',
    'スコティッシュフォールド', 'マンチカン', 'ペルシャ', 'ロシアンブルー',
    'メインクーン', 'ラグドール', 'ノルウェージャンフォレストキャット', 'ブリティッシュショートヘア',
    'シャム', 'アビシニアン', 'ベンガル', '雑種'
  ]

  // 都道府県リスト（主要都市）
  private readonly prefectures = [
    '東京都', '大阪府', '神奈川県', '愛知県', '北海道', '福岡県', '埼玉県', '千葉県',
    '兵庫県', '京都府', '広島県', '宮城県', '静岡県', '新潟県', '長野県', '岐阜県'
  ]

  // 色のリスト
  private readonly dogColors = [
    '茶色', '白', '黒', 'クリーム', 'ゴールド', 'ブラウン', 'グレー', '黒白',
    '茶白', '赤茶', 'トライカラー', 'バイカラー'
  ]

  private readonly catColors = [
    '三毛', '黒', '白', 'キジトラ', 'サバトラ', '茶トラ', 'グレー', 'クリーム',
    '黒白', '茶白', 'グレー白', 'ブルー', 'シルバー'
  ]

  /**
   * ペットIDを生成
   */
  private generateId(): string {
    return crypto.randomUUID()
  }

  /**
   * ランダムなブール値を生成
   */
  private randomBoolean(): number {
    return Math.random() > 0.5 ? 1 : 0
  }

  /**
   * 配列からランダムに選択
   */
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  /**
   * 犬のデータを生成
   */
  generateDog(): GeneratedPetData {
    const gender = this.randomChoice(['male', 'female'] as const)
    const prefecture = this.randomChoice(this.prefectures)
    const city = faker.location.city()
    const size = this.randomChoice(['small', 'medium', 'large'] as const)
    const isNeutered = this.randomBoolean()
    const isVaccinated = this.randomBoolean()

    return {
      id: this.generateId(),
      type: 'dog',
      name: faker.person.firstName(),
      breed: this.randomChoice(this.dogBreeds),
      age: `${faker.number.int({ min: 0, max: 15 })}歳`,
      gender,
      prefecture,
      city,
      location: `${prefecture}${city}`,
      description: `${faker.lorem.sentence()} 散歩が大好きで、${faker.lorem.sentence()}`,
      personality: this.randomChoice([
        '明るく活発、人懐っこい', '穏やか、甘えん坊', '元気いっぱい、好奇心旺盛',
        '落ち着いている、賢い', '遊び好き、社交的', '警戒心がやや強い、忠実'
      ]),
      medicalInfo: `ワクチン接種${isVaccinated ? '済み' : '未実施'}、${isNeutered ? (gender === 'male' ? '去勢手術済み' : '避妊手術済み') : '未実施'}`,
      careRequirements: this.randomChoice([
        '毎日の散歩が必要です', '定期的な運動が必要', '室内飼い推奨',
        '定期的なトリミングが必要', '広いスペースが理想的'
      ]),
      goodWith: this.randomChoice([
        '子供、他の犬', '大人、静かな環境', '子供、高齢者',
        '他の犬、猫', '単独飼育推奨'
      ]),
      healthNotes: '健康状態良好',
      color: this.randomChoice(this.dogColors),
      weight: faker.number.float({ min: 2, max: 40, fractionDigits: 1 }),
      size,
      coatLength: this.randomChoice(['short', 'medium', 'long'] as const),
      isNeutered,
      isVaccinated,
      vaccinationStatus: isVaccinated ? '完了' : '未実施',
      exerciseLevel: this.randomChoice(['low', 'medium', 'high'] as const),
      trainingLevel: this.randomChoice(['none', 'basic', 'advanced'] as const),
      socialLevel: this.randomChoice(['low', 'medium', 'high'] as const),
      goodWithKids: this.randomBoolean(),
      goodWithDogs: this.randomBoolean(),
      goodWithCats: this.randomBoolean(),
      specialNeeds: Math.random() > 0.8 ? 1 : 0,
      adoptionFee: faker.number.int({ min: 20000, max: 50000 }),
      status: 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * 猫のデータを生成
   */
  generateCat(): GeneratedPetData {
    const gender = this.randomChoice(['male', 'female'] as const)
    const prefecture = this.randomChoice(this.prefectures)
    const city = faker.location.city()
    const size = this.randomChoice(['small', 'medium', 'large'] as const)
    const isNeutered = this.randomBoolean()
    const isVaccinated = this.randomBoolean()

    return {
      id: this.generateId(),
      type: 'cat',
      name: faker.person.firstName(),
      breed: this.randomChoice(this.catBreeds),
      age: `${faker.number.int({ min: 0, max: 18 })}歳`,
      gender,
      prefecture,
      city,
      location: `${prefecture}${city}`,
      description: `${faker.lorem.sentence()} ${faker.lorem.sentence()}`,
      personality: this.randomChoice([
        '人懐っこい、好奇心旺盛', '穏やか、独立心あり', '甘えん坊、遊び好き',
        '落ち着いている、静か', '活発、元気', '人見知り、慎重'
      ]),
      medicalInfo: `ワクチン接種${isVaccinated ? '済み' : '未実施'}、${isNeutered ? (gender === 'male' ? '去勢手術済み' : '避妊手術済み') : '未実施'}、FIV/FeLV${this.randomBoolean() ? '陰性' : '検査済み'}`,
      careRequirements: this.randomChoice([
        '室内飼いのみ', '定期的な爪切りが必要', '長毛種のためブラッシング必要',
        '静かな環境を好む', '遊び相手が必要'
      ]),
      goodWith: this.randomChoice([
        '子供、他の猫', '大人、静かな環境', '単独飼育推奨',
        '他の猫OK', '犬とも仲良くできる'
      ]),
      healthNotes: '健康状態良好',
      color: this.randomChoice(this.catColors),
      weight: faker.number.float({ min: 2, max: 8, fractionDigits: 1 }),
      size,
      coatLength: this.randomChoice(['short', 'medium', 'long'] as const),
      isNeutered,
      isVaccinated,
      vaccinationStatus: isVaccinated ? '完了' : '未実施',
      isFivFelvTested: this.randomBoolean(),
      socialLevel: this.randomChoice(['low', 'medium', 'high'] as const),
      indoorOutdoor: this.randomChoice(['indoor', 'outdoor', 'both'] as const),
      goodWithKids: this.randomBoolean(),
      goodWithDogs: this.randomBoolean(),
      goodWithCats: this.randomBoolean(),
      specialNeeds: Math.random() > 0.9 ? 1 : 0,
      adoptionFee: faker.number.int({ min: 15000, max: 40000 }),
      status: 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * 複数のペットデータを生成
   */
  generateMultiple(type: PetType, count: number): GeneratedPetData[] {
    const pets: GeneratedPetData[] = []
    const generator = type === 'dog' ? this.generateDog.bind(this) : this.generateCat.bind(this)

    for (let i = 0; i < count; i++) {
      pets.push(generator())
    }

    return pets
  }

  /**
   * boolean値を数値に変換
   */
  private toBinaryNumber(value: boolean | number | undefined, defaultValue: number = 0): number {
    if (value === undefined) return defaultValue
    if (typeof value === 'boolean') return value ? 1 : 0
    return value
  }

  /**
   * 部分的なペットデータを完全なデータに補完
   * JSONから読み込んだデータの不足フィールドをfaker.jsで生成
   */
  completePartialData(partial: Partial<GeneratedPetData> & { id: string; name: string; type: PetType }): GeneratedPetData {
    // ベースとなる完全なデータを生成
    const base = partial.type === 'dog' ? this.generateDog() : this.generateCat()

    // JSONから読み込んだ値で上書き（undefined以外）
    const gender = (partial.gender ?? base.gender) as 'male' | 'female'
    const isNeutered = this.toBinaryNumber(partial.isNeutered, base.isNeutered)
    const isVaccinated = this.toBinaryNumber(partial.isVaccinated, base.isVaccinated)

    // 医療情報が提供されていない場合は自動生成
    const medicalInfo = partial.medicalInfo ??
      `ワクチン接種${isVaccinated ? '済み' : '未実施'}、${isNeutered ? (gender === 'male' ? '去勢手術済み' : '避妊手術済み') : '未実施'}${
        partial.type === 'cat' ? `、FIV/FeLV${this.randomBoolean() ? '陰性' : '検査済み'}` : ''
      }`

    // 場所情報の補完
    const prefecture = partial.prefecture ?? base.prefecture
    const city = partial.city ?? base.city
    const location = partial.location ?? `${prefecture}${city}`

    const completed: GeneratedPetData = {
      // 必須フィールド（JSONから）
      id: partial.id,
      name: partial.name,
      type: partial.type,

      // オプションフィールド（JSONがあればそれを使用、なければfaker.js）
      breed: partial.breed ?? base.breed,
      age: partial.age ?? base.age,
      gender,
      prefecture,
      city,
      location,
      description: partial.description ?? base.description,
      personality: partial.personality ?? base.personality,
      medicalInfo,
      careRequirements: partial.careRequirements ?? base.careRequirements,
      goodWith: partial.goodWith ?? base.goodWith,
      healthNotes: partial.healthNotes ?? base.healthNotes,
      color: partial.color ?? base.color,
      weight: partial.weight ?? base.weight,
      size: partial.size ?? base.size,
      coatLength: partial.coatLength ?? base.coatLength,
      isNeutered,
      isVaccinated,
      vaccinationStatus: partial.vaccinationStatus ?? (isVaccinated ? '完了' : '未実施'),
      socialLevel: partial.socialLevel ?? base.socialLevel,
      goodWithKids: this.toBinaryNumber(partial.goodWithKids, base.goodWithKids),
      goodWithDogs: this.toBinaryNumber(partial.goodWithDogs, base.goodWithDogs),
      goodWithCats: this.toBinaryNumber(partial.goodWithCats, base.goodWithCats),
      specialNeeds: this.toBinaryNumber(partial.specialNeeds, base.specialNeeds),
      adoptionFee: partial.adoptionFee ?? base.adoptionFee,
      status: partial.status ?? 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 犬固有のフィールド
    if (partial.type === 'dog') {
      completed.exerciseLevel = partial.exerciseLevel ?? base.exerciseLevel
      completed.trainingLevel = partial.trainingLevel ?? base.trainingLevel
    }

    // 猫固有のフィールド
    if (partial.type === 'cat') {
      completed.isFivFelvTested = this.toBinaryNumber(partial.isFivFelvTested, base.isFivFelvTested)
      completed.indoorOutdoor = partial.indoorOutdoor ?? base.indoorOutdoor
    }

    return completed
  }
}
