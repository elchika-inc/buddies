#!/usr/bin/env tsx
/**
 * 画像ファイル名からJSONファイルを自動生成
 *
 * database/fixtures/images/ にある画像ファイルを走査し、
 * 対応するJSONファイルが存在しない場合、最小限のJSONを自動生成します。
 *
 * 使用方法:
 *   npm run db:sync-json-from-images
 *   npm run db:sync-json-from-images -- --overwrite  # 既存JSONも上書き
 */

import * as fs from 'fs'
import * as path from 'path'
import minimist from 'minimist'
import { faker } from '@faker-js/faker/locale/ja'

// コマンドライン引数のパース
const args = minimist(process.argv.slice(2), {
  default: {
    overwrite: false,
  },
  boolean: ['overwrite'],
})

const IMAGES_DIR = 'database/fixtures/images'
const PETS_DIR = 'database/fixtures/pets'

interface ImageFile {
  id: string
  filename: string
  type: 'dog' | 'cat'
}

/**
 * 画像ファイルを走査してリストを取得
 */
function scanImageFiles(): ImageFile[] {
  const files: ImageFile[] = []

  // 犬の画像を走査
  const dogsDir = path.join(IMAGES_DIR, 'dogs')
  if (fs.existsSync(dogsDir)) {
    const dogFiles = fs.readdirSync(dogsDir)
    dogFiles.forEach(filename => {
      if (filename.match(/\.(jpg|jpeg|png)$/i)) {
        const id = filename.replace(/\.(jpg|jpeg|png)$/i, '')
        files.push({ id, filename, type: 'dog' })
      }
    })
  }

  // 猫の画像を走査
  const catsDir = path.join(IMAGES_DIR, 'cats')
  if (fs.existsSync(catsDir)) {
    const catFiles = fs.readdirSync(catsDir)
    catFiles.forEach(filename => {
      if (filename.match(/\.(jpg|jpeg|png)$/i)) {
        const id = filename.replace(/\.(jpg|jpeg|png)$/i, '')
        files.push({ id, filename, type: 'cat' })
      }
    })
  }

  return files
}

/**
 * JSONファイルが存在するかチェック
 */
function jsonExists(id: string, type: 'dog' | 'cat'): boolean {
  const dirPath = path.join(PETS_DIR, type === 'dog' ? 'dogs' : 'cats')
  const jsonPath = path.join(dirPath, `${id}.json`)
  return fs.existsSync(jsonPath)
}

/**
 * 最小限のJSONデータを生成
 */
function generateMinimalJson(id: string, type: 'dog' | 'cat') {
  return {
    id,
    name: faker.person.firstName(),
    type,
  }
}

/**
 * JSONファイルを作成
 */
function createJsonFile(imageFile: ImageFile): boolean {
  const dirPath = path.join(PETS_DIR, imageFile.type === 'dog' ? 'dogs' : 'cats')
  const jsonPath = path.join(dirPath, `${imageFile.id}.json`)

  // ディレクトリを作成
  fs.mkdirSync(dirPath, { recursive: true })

  // JSONデータを生成
  const jsonData = generateMinimalJson(imageFile.id, imageFile.type)

  // ファイルに書き込み
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n', 'utf-8')

  return true
}

/**
 * メイン処理
 */
async function main() {
  const shouldOverwrite = args.overwrite

  console.log('🔄 画像ファイルからJSONファイルを同期')
  console.log('')
  console.log('📋 設定:')
  console.log(`  - 上書きモード: ${shouldOverwrite ? 'はい' : 'いいえ'}`)
  console.log('')

  // 画像ファイルを走査
  console.log('📸 画像ファイルを走査中...')
  const imageFiles = scanImageFiles()

  if (imageFiles.length === 0) {
    console.log('❌ 画像ファイルが見つかりませんでした')
    console.log(`   確認先: ${IMAGES_DIR}`)
    process.exit(1)
  }

  console.log(`  ✅ ${imageFiles.length}個の画像ファイルを発見`)
  console.log('')

  // 統計
  const dogImages = imageFiles.filter(f => f.type === 'dog')
  const catImages = imageFiles.filter(f => f.type === 'cat')

  console.log('📊 画像統計:')
  console.log(`  - 犬: ${dogImages.length}ファイル`)
  console.log(`  - 猫: ${catImages.length}ファイル`)
  console.log('')

  // JSON同期処理
  console.log('📝 JSONファイルを生成中...')
  console.log('')

  let created = 0
  let skipped = 0
  let overwritten = 0

  for (const imageFile of imageFiles) {
    const exists = jsonExists(imageFile.id, imageFile.type)

    if (exists && !shouldOverwrite) {
      skipped++
      continue
    }

    if (exists && shouldOverwrite) {
      createJsonFile(imageFile)
      overwritten++
      console.log(`  🔄 ${imageFile.id}.json を上書きしました (${imageFile.type})`)
    } else {
      createJsonFile(imageFile)
      created++
      console.log(`  ✅ ${imageFile.id}.json を作成しました (${imageFile.type})`)
    }
  }

  console.log('')
  console.log('✨ JSON同期が完了しました！')
  console.log('')
  console.log('📊 結果:')
  console.log(`  - 新規作成: ${created}ファイル`)
  if (shouldOverwrite) {
    console.log(`  - 上書き: ${overwritten}ファイル`)
  }
  console.log(`  - スキップ: ${skipped}ファイル`)
  console.log('')

  if (created > 0 || overwritten > 0) {
    console.log('🚀 次のステップ:')
    console.log('  1. 生成されたJSONファイルを編集して実際のデータに変更')
    console.log(`     ${PETS_DIR}/`)
    console.log('  2. データベースに投入')
    console.log('     npm run db:seed')
    console.log('')
  }

  if (skipped > 0 && !shouldOverwrite) {
    console.log('💡 ヒント:')
    console.log('  既存のJSONファイルも上書きする場合:')
    console.log('    npm run db:sync-json-from-images -- --overwrite')
    console.log('')
  }
}

// 実行
main().catch(error => {
  console.error('❌ エラーが発生しました:', error)
  process.exit(1)
})
