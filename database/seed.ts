#!/usr/bin/env tsx
/**
 * Database Seeder for PawMatch
 *
 * このスクリプトはローカル開発環境のデータベースにテストデータを投入します。
 * 使用方法: npm run db:seed
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { pets, apiKeys } from './schema/schema'
import * as crypto from 'crypto'
// import * as bcrypt from 'bcrypt'

// SQLiteデータベースファイルのパス
const DB_PATH = './api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite'

// glob パターンを解決
import glob from 'glob'
const dbFiles = glob.sync(DB_PATH)

if (dbFiles.length === 0) {
  console.error('❌ データベースファイルが見つかりません。先に npm run db:push を実行してください。')
  process.exit(1)
}

const sqlite = new Database(dbFiles[0])
const db = drizzle(sqlite)

// ヘルパー関数
function generateId(): string {
  return crypto.randomUUID()
}

function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

// async function hashPassword(password: string): Promise<string> {
//   return bcrypt.hash(password, 10)
// }

// シードデータ
async function seed() {
  console.log('🌱 Seeding database...')

  try {
    // 既存のデータをクリア
    console.log('🧹 Clearing existing data...')
    await db.delete(pets)
    await db.delete(apiKeys)


    // テスト用ペット
    console.log('🐾 Creating pets...')
    const petData = [
      // 犬
      {
        id: generateId(),
        type: 'dog',
        name: 'ポチ',
        breed: '柴犬',
        age: '2歳',
        gender: 'male',
        prefecture: '東京都',
        city: '渋谷区',
        location: '東京都渋谷区',
        description: '人懐っこくて元気な柴犬です。散歩が大好きで、他の犬とも仲良くできます。',
        personality: '明るく活発、人懐っこい',
        medicalInfo: 'ワクチン接種済み、去勢手術済み',
        careRequirements: '毎日の散歩が必要です',
        goodWith: '子供、他の犬',
        healthNotes: '健康状態良好',
        color: '赤茶',
        weight: 10.5,
        size: 'medium',
        coatLength: 'short',
        isNeutered: 1,
        isVaccinated: 1,
        vaccinationStatus: '完了',
        exerciseLevel: 'high',
        trainingLevel: 'basic',
        socialLevel: 'high',
        goodWithKids: 1,
        goodWithDogs: 1,
        goodWithCats: 0,
        specialNeeds: 0,
        adoptionFee: 30000,
        status: 'available',
        imageUrl: 'https://placedog.net/400/400?id=1',
        hasJpeg: 1,
        hasWebp: 1, // WebP画像対応フラグ
        additionalImages: JSON.stringify([
          'https://placedog.net/400/400?id=2',
          'https://placedog.net/400/400?id=3'
        ]),
        shelterId: generateId(),
        rescueDate: '2024-01-15',
        isPromoted: 1,
        viewCount: 150,
        likeCount: 45,
        applicationCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: generateId(),
        type: 'dog',
        name: 'ココ',
        breed: 'トイプードル',
        age: '3歳',
        gender: 'female',
        prefecture: '東京都',
        city: '世田谷区',
        location: '東京都世田谷区',
        description: '小型で飼いやすいトイプードルです。室内飼いに適しています。',
        personality: '穏やか、甘えん坊',
        medicalInfo: 'ワクチン接種済み、避妊手術済み',
        careRequirements: '定期的なトリミングが必要',
        goodWith: '子供、高齢者',
        healthNotes: '健康状態良好',
        color: 'ブラウン',
        weight: 4.2,
        size: 'small',
        coatLength: 'long',
        isNeutered: 1,
        isVaccinated: 1,
        vaccinationStatus: '完了',
        exerciseLevel: 'medium',
        trainingLevel: 'advanced',
        socialLevel: 'medium',
        goodWithKids: 1,
        goodWithDogs: 1,
        goodWithCats: 1,
        specialNeeds: 0,
        adoptionFee: 35000,
        status: 'available',
        imageUrl: 'https://placedog.net/400/400?id=4',
        hasJpeg: 1,
        hasWebp: 1, // WebP画像対応フラグ
        additionalImages: JSON.stringify([
          'https://placedog.net/400/400?id=5'
        ]),
        shelterId: generateId(),
        rescueDate: '2024-02-01',
        isPromoted: 0,
        viewCount: 89,
        likeCount: 23,
        applicationCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // 猫
      {
        id: generateId(),
        type: 'cat',
        name: 'ミケ',
        breed: '三毛猫',
        age: '1歳',
        gender: 'female',
        prefecture: '大阪府',
        city: '大阪市',
        location: '大阪府大阪市',
        description: '美しい三毛模様の猫です。人見知りしない性格で、初めての方でも飼いやすいです。',
        personality: '人懐っこい、好奇心旺盛',
        medicalInfo: 'ワクチン接種済み、避妊手術済み、FIV/FeLV陰性',
        careRequirements: '室内飼いのみ',
        goodWith: '子供、他の猫',
        healthNotes: '健康状態良好',
        color: '三毛',
        weight: 3.8,
        size: 'small',
        coatLength: 'medium',
        isNeutered: 1,
        isVaccinated: 1,
        vaccinationStatus: '完了',
        isFivFelvTested: 1,
        socialLevel: 'high',
        indoorOutdoor: 'indoor',
        goodWithKids: 1,
        goodWithDogs: 0,
        goodWithCats: 1,
        specialNeeds: 0,
        adoptionFee: 25000,
        status: 'available',
        imageUrl: 'https://placekitten.com/400/400?image=1',
        hasJpeg: 1,
        hasWebp: 1, // WebP画像対応フラグ
        additionalImages: JSON.stringify([
          'https://placekitten.com/400/400?image=2',
          'https://placekitten.com/400/400?image=3'
        ]),
        shelterId: generateId(),
        rescueDate: '2024-03-01',
        isPromoted: 1,
        viewCount: 203,
        likeCount: 67,
        applicationCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: generateId(),
        type: 'cat',
        name: 'クロ',
        breed: '黒猫',
        age: '4歳',
        gender: 'male',
        prefecture: '大阪府',
        city: '堺市',
        location: '大阪府堺市',
        description: '落ち着いた性格の黒猫です。静かな環境を好みます。',
        personality: '穏やか、独立心あり',
        medicalInfo: 'ワクチン接種済み、去勢手術済み、FIV/FeLV陰性',
        careRequirements: '静かな環境、室内飼いのみ',
        goodWith: '大人、単独飼育推奨',
        healthNotes: '健康状態良好',
        color: '黒',
        weight: 5.2,
        size: 'medium',
        coatLength: 'short',
        isNeutered: 1,
        isVaccinated: 1,
        vaccinationStatus: '完了',
        isFivFelvTested: 1,
        socialLevel: 'low',
        indoorOutdoor: 'indoor',
        goodWithKids: 0,
        goodWithDogs: 0,
        goodWithCats: 0,
        specialNeeds: 0,
        adoptionFee: 20000,
        status: 'available',
        imageUrl: 'https://placekitten.com/400/400?image=4',
        hasJpeg: 1,
        hasWebp: 1, // WebP画像対応フラグ
        additionalImages: JSON.stringify([
          'https://placekitten.com/400/400?image=5'
        ]),
        shelterId: generateId(),
        rescueDate: '2024-01-20',
        isPromoted: 0,
        viewCount: 76,
        likeCount: 12,
        applicationCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    const insertedPets = await db.insert(pets).values(petData).returning()
    console.log(`✅ ${insertedPets.length} pets created`)


    // テスト用APIキー
    console.log('🔑 Creating API keys...')
    const apiKeyData = [
      {
        id: generateId(),
        key: generateApiKey(),
        name: 'Development API Key',
        type: 'admin',
        permissions: JSON.stringify(['*']),
        rateLimit: 1000,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: null,
        isActive: 1,
        metadata: JSON.stringify({ environment: 'development' })
      },
      {
        id: generateId(),
        key: generateApiKey(),
        name: 'Test Public API Key',
        type: 'public',
        permissions: JSON.stringify(['pets:read', 'shelters:read']),
        rateLimit: 100,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年後
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: null,
        isActive: 1,
        metadata: null
      },
      {
        id: generateId(),
        key: generateApiKey(),
        name: 'Internal Service Key',
        type: 'internal',
        permissions: JSON.stringify(['pets:*', 'shelters:*', 'users:read']),
        rateLimit: 500,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: null,
        isActive: 1,
        metadata: JSON.stringify({ service: 'crawler' })
      }
    ]

    const insertedApiKeys = await db.insert(apiKeys).values(apiKeyData).returning()
    console.log(`✅ ${insertedApiKeys.length} API keys created`)

    // 作成したAPIキーを表示
    console.log('\n📝 Created API Keys:')
    insertedApiKeys.forEach(key => {
      console.log(`  - ${key.name}: ${key.key}`)
    })

    console.log('\n✨ Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - Pets: ${insertedPets.length}`)
    console.log(`  - API Keys: ${insertedApiKeys.length}`)

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

// 実行
seed().catch(console.error)