#!/usr/bin/env tsx
/**
 * Database Seeder for Buddies
 *
 * このスクリプトはローカル開発環境のデータベースにテストデータを投入します。
 *
 * 使用方法:
 *   npm run db:seed                                 # デフォルト（犬5匹、猫5匹）
 *   npm run db:seed -- --dogs=10 --cats=15          # 件数指定
 *   npm run db:seed -- --clear                      # 全削除してシード
 *   npm run db:seed -- --append --dogs=5            # 既存データ保持で追加
 *   npm run db:seed -- --skip-images                # 画像なしでデータのみ
 *   npm run db:seed -- --generate-placeholders      # プレースホルダー画像を自動生成
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { pets, apiKeys } from './schema/schema'
import * as crypto from 'crypto'
import minimist from 'minimist'
import { exec } from 'child_process'
import { promisify } from 'util'
import { PetDataGenerator } from './generators/PetDataGenerator'
import { ImageManager } from './utils/ImageManager'
import { R2LocalUploader } from './utils/R2LocalUploader'

const execAsync = promisify(exec)

// コマンドライン引数のパース
const args = minimist(process.argv.slice(2), {
  default: {
    dogs: 5,
    cats: 5,
    clear: false,
    append: false,
    'skip-images': false,
    'generate-placeholders': false,
  },
  boolean: ['clear', 'append', 'skip-images', 'generate-placeholders'],
  alias: {
    d: 'dogs',
    c: 'cats',
  },
})

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

/**
 * プレースホルダー画像を自動生成
 */
async function generatePlaceholders(dogCount: number, catCount: number): Promise<void> {
  console.log('🖼️  プレースホルダー画像を生成中...')
  try {
    await execAsync(`tsx database/generate-placeholders.ts --dogs=${dogCount} --cats=${catCount}`)
  } catch (error) {
    console.error('❌ プレースホルダー画像の生成に失敗しました:', error)
    throw error
  }
}

/**
 * シードデータ
 */
async function seed() {
  const dogCount = parseInt(args.dogs as string, 10)
  const catCount = parseInt(args.cats as string, 10)
  const shouldClear = args.clear
  const shouldAppend = args.append
  const skipImages = args['skip-images']
  const generatePlaceholderImages = args['generate-placeholders']

  console.log('🌱 Seeding database...')
  console.log('')
  console.log('📋 設定:')
  console.log(`  - 犬: ${dogCount}匹`)
  console.log(`  - 猫: ${catCount}匹`)
  console.log(`  - クリアモード: ${shouldClear ? 'はい' : 'いいえ'}`)
  console.log(`  - 追加モード: ${shouldAppend ? 'はい' : 'いいえ'}`)
  console.log(`  - 画像スキップ: ${skipImages ? 'はい' : 'いいえ'}`)
  console.log(`  - プレースホルダー生成: ${generatePlaceholderImages ? 'はい' : 'いいえ'}`)
  console.log('')

  try {
    // プレースホルダー画像を生成（必要な場合）
    if (generatePlaceholderImages && !skipImages) {
      // 画像が足りない場合のみ生成
      const imageManager = new ImageManager()
      const existingDogImages = imageManager.getImageCount('dog')
      const existingCatImages = imageManager.getImageCount('cat')

      const dogsToGenerate = Math.max(0, Math.min(dogCount, 10) - existingDogImages)
      const catsToGenerate = Math.max(0, Math.min(catCount, 10) - existingCatImages)

      if (dogsToGenerate > 0 || catsToGenerate > 0) {
        await generatePlaceholders(dogsToGenerate, catsToGenerate)
      }
    }

    // 既存のデータをクリア（clearモードの場合）
    if (shouldClear || !shouldAppend) {
      console.log('🧹 既存データをクリア中...')
      await db.delete(pets)
      if (!shouldAppend) {
        await db.delete(apiKeys)
      }
      console.log('  ✅ クリア完了')
      console.log('')
    }

    // ペットデータ生成
    const generator = new PetDataGenerator()
    console.log('🐾 ペットデータを生成中...')

    const dogData = generator.generateMultiple('dog', dogCount)
    const catData = generator.generateMultiple('cat', catCount)
    const allPets = [...dogData, ...catData]

    console.log(`  ✅ ${allPets.length}匹のペットデータを生成しました`)
    console.log('')

    // 画像の準備
    let shouldUploadImages = false
    const imageManager = new ImageManager()
    const uploader = new R2LocalUploader()

    if (!skipImages) {
      // APIサーバーが起動しているかチェック
      console.log('🔍 APIサーバーをチェック中...')
      const isApiRunning = await uploader.checkApiServer()

      if (!isApiRunning) {
        console.warn('⚠️  APIサーバーが起動していません。')
        console.warn('    画像のアップロードには API サーバーが必要です。')
        console.warn('    別のターミナルで `npm run dev:api` を実行してください。')
        console.warn('')
        console.warn('    データのみ保存します（画像なし）...')
      } else {
        console.log('  ✅ APIサーバーが起動しています')

        // 画像統計を表示
        imageManager.printStats()

        shouldUploadImages = imageManager.hasImages('dog') || imageManager.hasImages('cat')
        if (!shouldUploadImages) {
          console.warn('⚠️  画像が見つかりません。')
          console.warn('    プレースホルダー画像を生成するには:')
          console.warn('      npm run db:generate-placeholders -- --dogs=5 --cats=5')
          console.warn('')
          console.warn('    データのみ保存します（画像なし）...')
        }
      }
      console.log('')
    }

    // データベースに保存
    console.log('💾 データベースに保存中...')
    const insertedPets = await db.insert(pets).values(allPets).returning()
    console.log(`  ✅ ${insertedPets.length}匹のペットを保存しました`)
    console.log('')

    // 画像をアップロード
    if (shouldUploadImages) {
      console.log('📤 画像をローカルR2にアップロード中...')

      let uploadSuccess = 0
      let uploadFailed = 0

      for (let i = 0; i < insertedPets.length; i++) {
        const pet = insertedPets[i]
        if (!pet) continue

        const petType = pet.type as 'dog' | 'cat'
        const imageFile = imageManager.getImageByIndex(petType, i)

        if (imageFile) {
          const result = await uploader.uploadImage(pet.id, petType, imageFile, 'original')

          if (result.success) {
            uploadSuccess++
            console.log(`  ✅ [${i + 1}/${insertedPets.length}] ${pet.name} (${pet.type})`)
          } else {
            uploadFailed++
            console.error(`  ❌ [${i + 1}/${insertedPets.length}] ${pet.name}: ${result.error}`)
          }
        }

        // 進捗表示のため少し待つ
        if (i % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      console.log('')
      console.log(`  ✅ アップロード成功: ${uploadSuccess}枚`)
      if (uploadFailed > 0) {
        console.log(`  ❌ アップロード失敗: ${uploadFailed}枚`)
      }
      console.log('')

      // データベースの画像フラグを更新
      if (uploadSuccess > 0) {
        console.log('🔄 画像フラグを更新中...')
        for (const pet of insertedPets) {
          if (!pet) continue
          await db
            .update(pets)
            .set({
              hasJpeg: 1,
              hasWebp: 0,
              imageUrl: `http://localhost:9789/api/images/${pet.type}/${pet.id}.jpg`,
              updatedAt: new Date().toISOString(),
            })
            .where({ id: pet.id })
        }
        console.log('  ✅ 更新完了')
        console.log('')
      }
    }

    // APIキーの作成（初回のみ）
    if (!shouldAppend) {
      console.log('🔑 APIキーを作成中...')
      const apiKeyData = [
        {
          id: generateId(),
          key: 'b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb',
          name: 'Development API Key',
          type: 'admin',
          permissions: JSON.stringify(['*']),
          rateLimit: 1000,
          expiresAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastUsedAt: null,
          isActive: 1,
          metadata: JSON.stringify({ environment: 'development' }),
        },
      ]

      const insertedApiKeys = await db.insert(apiKeys).values(apiKeyData).returning()
      console.log(`  ✅ ${insertedApiKeys.length}個のAPIキーを作成しました`)
      console.log('')
    }

    console.log('✨ データベースシードが完了しました！')
    console.log('')
    console.log('📊 サマリー:')
    console.log(`  - ペット総数: ${insertedPets.length}匹`)
    console.log(`    - 犬: ${dogCount}匹`)
    console.log(`    - 猫: ${catCount}匹`)
    if (shouldUploadImages) {
      console.log(`  - 画像アップロード: 完了`)
    }
    console.log('')
    console.log('🚀 次のステップ:')
    console.log('  1. API サーバーを起動（未起動の場合）: npm run dev:api')
    console.log('  2. ブラウザで確認: http://localhost:9789/api/pets')
    console.log('')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

// 実行
seed().catch(console.error)
