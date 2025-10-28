#!/usr/bin/env tsx
/**
 * Database Seeder for Buddies
 *
 * このスクリプトはローカル開発環境のデータベースにテストデータを投入します。
 * JSON優先: database/fixtures/pets/ にJSONファイルがあればそれを使用
 * JSONがない場合: faker.jsでランダムデータを自動生成
 *
 * 使用方法:
 *   npm run db:seed                                 # JSONまたはデフォルト（犬5匹、猫5匹）
 *   npm run db:seed -- --dogs=10 --cats=15          # 件数指定
 *   npm run db:seed -- --clear                      # 全削除してシード
 *   npm run db:seed -- --skip-images                # 画像なしでデータのみ
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { pets, apiKeys } from './schema/schema'
import { eq } from 'drizzle-orm'
import * as crypto from 'crypto'
import minimist from 'minimist'
import { exec } from 'child_process'
import { promisify } from 'util'
import { PetDataGenerator } from './generators/PetDataGenerator'
import { ImageManager } from './utils/ImageManager'
import { R2LocalUploader } from './utils/R2LocalUploader'
import { JsonPetLoader } from './utils/JsonPetLoader'

const execAsync = promisify(exec)

// コマンドライン引数のパース
const args = minimist(process.argv.slice(2), {
  default: {
    dogs: 5,
    cats: 5,
    clear: false,
    'skip-images': false,
  },
  boolean: ['clear', 'skip-images'],
  alias: {
    d: 'dogs',
    c: 'cats',
  },
})

// SQLiteデータベースファイルのパス（APIサーバーと同じパスを使用）
const DB_PATH = './.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite'

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
 * ローカル画像をWebPに変換
 */
async function convertImagesToWebP(): Promise<void> {
  console.log('🔄  画像をWebP形式に変換中...')
  try {
    // npm run images:local を実行
    await execAsync('npm run images:local')
    console.log('  ✅ WebP変換が完了しました')
  } catch (error) {
    console.error('❌ WebP変換に失敗しました:', error)
    // 失敗してもseedは続行
  }
}

/**
 * シードデータ
 */
async function seed() {
  const dogCount = parseInt(args.dogs as string, 10)
  const catCount = parseInt(args.cats as string, 10)
  const shouldClear = args.clear
  const skipImages = args['skip-images']

  console.log('🌱 Seeding database...')
  console.log('')
  console.log('📋 設定:')
  console.log(`  - 犬: ${dogCount}匹`)
  console.log(`  - 猫: ${catCount}匹`)
  console.log(`  - クリアモード: ${shouldClear ? 'はい' : 'いいえ'}`)
  console.log(`  - 画像スキップ: ${skipImages ? 'はい' : 'いいえ'}`)
  console.log('')

  try {
    // 既存のデータをクリア（clearモードの場合）
    if (shouldClear) {
      console.log('🧹 既存データをクリア中...')
      await db.delete(pets)
      await db.delete(apiKeys)
      console.log('  ✅ クリア完了')
      console.log('')
    }

    // JSONローダーを初期化
    const jsonLoader = new JsonPetLoader()
    const generator = new PetDataGenerator()

    console.log('🐾 ペットデータを準備中...')
    console.log('')

    // JSONファイルの状況を表示
    jsonLoader.printStats()

    // 犬のデータを取得（JSON優先、不足分はfaker.js）
    console.log('🐕 犬のデータを読み込み中...')
    let dogData = await jsonLoader.loadPets('dog')

    if (dogData.length < dogCount) {
      const additionalCount = dogCount - dogData.length
      console.log(`  📝 追加で${additionalCount}匹をfaker.jsで生成`)
      const additionalDogs = generator.generateMultiple('dog', additionalCount)
      dogData = [...dogData, ...additionalDogs]
    } else if (dogData.length > dogCount) {
      console.log(`  ✂️  ${dogData.length}匹から${dogCount}匹に制限`)
      dogData = dogData.slice(0, dogCount)
    }
    console.log(`  ✅ 犬: ${dogData.length}匹`)
    console.log('')

    // 猫のデータを取得（JSON優先、不足分はfaker.js）
    console.log('🐈 猫のデータを読み込み中...')
    let catData = await jsonLoader.loadPets('cat')

    if (catData.length < catCount) {
      const additionalCount = catCount - catData.length
      console.log(`  📝 追加で${additionalCount}匹をfaker.jsで生成`)
      const additionalCats = generator.generateMultiple('cat', additionalCount)
      catData = [...catData, ...additionalCats]
    } else if (catData.length > catCount) {
      console.log(`  ✂️  ${catData.length}匹から${catCount}匹に制限`)
      catData = catData.slice(0, catCount)
    }
    console.log(`  ✅ 猫: ${catData.length}匹`)
    console.log('')

    const allPets = [...dogData, ...catData]

    console.log(`✨ 合計 ${allPets.length}匹のペットデータを準備しました`)
    console.log('')

    // 画像の準備
    let hasConvertedImages = false
    const imageManager = new ImageManager()

    if (!skipImages) {
      // 画像統計を表示
      imageManager.printStats()

      const hasSourceImages = imageManager.hasImages('dog') || imageManager.hasImages('cat')
      if (!hasSourceImages) {
        console.warn('⚠️  画像が見つかりません。')
        console.warn('    プレースホルダー画像を生成するには:')
        console.warn('      npm run db:generate-placeholders -- --dogs=5 --cats=5')
        console.warn('')
        console.warn('    データのみ保存します（画像なし）...')
      } else {
        // WebP変換を実行
        await convertImagesToWebP()
        hasConvertedImages = true
        console.log(`  ✅ 画像準備完了 (WebP変換済み)`)
      }
      console.log('')
    }

    // データベースに保存
    console.log('💾 データベースに保存中...')
    const insertedPets = await db.insert(pets).values(allPets).returning()
    console.log(`  ✅ ${insertedPets.length}匹のペットを保存しました`)
    console.log('')

    // 画像処理とデータベース更新
    if (!skipImages && (hasConvertedImages || imageManager.hasImages('dog') || imageManager.hasImages('cat'))) {
      const uploader = new R2LocalUploader()

      // APIサーバーが起動しているかチェック
      console.log('🔍 APIサーバーをチェック中...')
      const isApiRunning = await uploader.checkApiServer()

      if (!isApiRunning) {
        console.warn('⚠️  APIサーバーが起動していません。')
        console.warn('    画像のアップロードには API サーバーが必要です。')
        console.warn('    別のターミナルで `npm run dev:api` を実行してください。')
        console.warn('')
        if (hasConvertedImages) {
          console.warn('    データベースフラグのみ更新します...')
        }
      } else {
        console.log('  ✅ APIサーバーが起動しています')
        console.log(`📤 ${hasConvertedImages ? '変換済み画像を' : '画像を'}アップロード中...`)

        let uploadSuccess = 0
        let uploadFailed = 0

        for (let i = 0; i < insertedPets.length; i++) {
          const pet = insertedPets[i]
          if (!pet) continue

          const petType = pet.type as 'dog' | 'cat'

          const result = hasConvertedImages
            ? await uploader.uploadConvertedImages(pet.id, petType, pet.id)
            : await (async () => {
                const imageFile = imageManager.getImageByIndex(petType, i)
                if (!imageFile) return { success: false, error: 'Image file not found' }
                return await uploader.uploadImage(pet.id, petType, imageFile, 'original')
              })()

          if (result.success) {
            uploadSuccess++
            console.log(`  ✅ ${pet.name} (${pet.type})${hasConvertedImages ? ' - JPEG & WebP アップロード完了' : ''}`)
          } else {
            uploadFailed++
            console.error(`  ❌ ${pet.name}: ${result.error}`)
          }
        }

        console.log('')
        console.log(`  ✅ アップロード成功: ${uploadSuccess}${hasConvertedImages ? '匹' : '枚'}`)
        if (uploadFailed > 0) {
          console.log(`  ❌ アップロード失敗: ${uploadFailed}${hasConvertedImages ? '匹' : '枚'}`)
        }
        console.log('')
      }

      // データベースの画像フラグを更新
      console.log('🔄 画像フラグを更新中...')
      for (const pet of insertedPets) {
        if (!pet) continue
        await db
          .update(pets)
          .set({
            hasJpeg: 1,
            hasWebp: hasConvertedImages ? 1 : 0,
            imageUrl: `http://localhost:9789/api/images/${pet.type}/${pet.id}.jpg`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(pets.id, pet.id))
      }
      console.log(`  ✅ 更新完了${hasConvertedImages ? ' (JPEG & WebP 両方利用可能)' : ''}`)
      console.log('')
    }

    // APIキーの作成（初回のみ）
    if (shouldClear) {
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
    console.log(`    - 犬: ${dogData.length}匹 (JSON: ${Math.min(await jsonLoader.countJsonFiles('dog'), dogCount)}匹, faker: ${Math.max(0, dogData.length - await jsonLoader.countJsonFiles('dog'))}匹)`)
    console.log(`    - 猫: ${catData.length}匹 (JSON: ${Math.min(await jsonLoader.countJsonFiles('cat'), catCount)}匹, faker: ${Math.max(0, catData.length - await jsonLoader.countJsonFiles('cat'))}匹)`)
    if (hasConvertedImages) {
      console.log(`  - 画像形式: JPEG & WebP 両方利用可能`)
      console.log(`    - 保存先: .wrangler/state/r2/buddies-images/`)
    } else if (!skipImages) {
      console.log(`  - 画像形式: JPEG のみ`)
    }
    console.log('')
    console.log('🚀 次のステップ:')
    console.log('  1. API サーバーを起動（未起動の場合）: npm run dev:api')
    console.log('  2. ブラウザで確認: http://localhost:9789/api/pets')
    if (!hasConvertedImages && !skipImages) {
      console.log('')
      console.log('💡 ヒント: WebP画像を生成するには:')
      console.log('    npm run images:local')
    }
    console.log('')
    console.log('📝 JSONファイルでデータを管理:')
    console.log('    database/fixtures/pets/ にJSONファイルを配置')
    console.log('    サンプルファイル: database/fixtures/pets/dogs/dog-01.json')
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
