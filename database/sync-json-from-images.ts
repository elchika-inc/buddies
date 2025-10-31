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

// コマンドライン引数のパース
const args = minimist(process.argv.slice(2), {
  default: {
    overwrite: false,
  },
  boolean: ['overwrite'],
})

const IMAGES_DIR = 'database/fixtures/images'
const PETS_DIR = 'database/fixtures/pets'

// カタカナの名前リスト（犬用）
const DOG_NAMES = [
  'ポチ', 'タロウ', 'ハチ', 'マル', 'モモ', 'サクラ', 'ハナ', 'ココ', 'チョコ', 'ラッキー',
  'レオ', 'ソラ', 'コタロウ', 'リン', 'ミルク', 'クッキー', 'マロン', 'コロン', 'ベル', 'ルル',
  'チビ', 'コムギ', 'キナコ', 'アズキ', 'ムギ', 'ゴン', 'ゲン', 'ケン', 'ブン', 'ラン',
  'ハル', 'ナツ', 'アキ', 'フユ', 'ユキ', 'ホシ', 'ツキ', 'ヒカル', 'ノア', 'ライ',
  'テン', 'カイ', 'ダイ', 'ソウ', 'レイ', 'シュウ', 'ジン', 'ユウ', 'リク', 'カケル'
]

// カタカナの名前リスト（猫用）
const CAT_NAMES = [
  'タマ', 'ミケ', 'クロ', 'シロ', 'トラ', 'チビ', 'ミー', 'ニャー', 'ソラ', 'モモ',
  'ハナ', 'サクラ', 'ユキ', 'ココ', 'ルル', 'レオ', 'リン', 'メイ', 'ルナ', 'マル',
  'チャチャ', 'ムギ', 'キナコ', 'マロン', 'モカ', 'ラテ', 'ミルク', 'クリーム', 'バニラ', 'ショコラ',
  'ハッピー', 'ラッキー', 'チョビ', 'コタロウ', 'ベル', 'ミント', 'ピーチ', 'メロン', 'レモン', 'ミカン',
  'ナナ', 'ヒメ', 'プリン', 'ゴマ', 'ノア', 'ライ', 'カイ', 'リク', 'ソウ', 'ハル'
]

interface ImageFile {
  id: string
  filename: string
  type: 'dog' | 'cat'
}

// 使用済み名前を追跡
let usedDogNames = new Set<string>()
let usedCatNames = new Set<string>()

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
 * 既存のJSONファイルから使用済みの名前を読み込む
 */
function loadExistingNames(): void {
  // 犬の名前を読み込み
  const dogsDir = path.join(PETS_DIR, 'dogs')
  if (fs.existsSync(dogsDir)) {
    const files = fs.readdirSync(dogsDir).filter(f => f.endsWith('.json'))
    files.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(dogsDir, file), 'utf-8')
        const data = JSON.parse(content)
        if (data.name) {
          usedDogNames.add(data.name)
        }
      } catch (error) {
        // JSON読み込みエラーは無視
      }
    })
  }

  // 猫の名前を読み込み
  const catsDir = path.join(PETS_DIR, 'cats')
  if (fs.existsSync(catsDir)) {
    const files = fs.readdirSync(catsDir).filter(f => f.endsWith('.json'))
    files.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(catsDir, file), 'utf-8')
        const data = JSON.parse(content)
        if (data.name) {
          usedCatNames.add(data.name)
        }
      } catch (error) {
        // JSON読み込みエラーは無視
      }
    })
  }
}

/**
 * 重複しない名前を取得
 */
function getUniqueName(type: 'dog' | 'cat'): string {
  const nameList = type === 'dog' ? DOG_NAMES : CAT_NAMES
  const usedNames = type === 'dog' ? usedDogNames : usedCatNames

  // 未使用の名前を探す
  for (const name of nameList) {
    if (!usedNames.has(name)) {
      usedNames.add(name)
      return name
    }
  }

  // 全ての名前が使用済みの場合、番号を付けて生成
  let counter = 1
  while (true) {
    const name = `${nameList[0]}${counter}`
    if (!usedNames.has(name)) {
      usedNames.add(name)
      return name
    }
    counter++
  }
}

/**
 * 最小限のJSONデータを生成
 */
function generateMinimalJson(id: string, type: 'dog' | 'cat') {
  return {
    id,
    name: getUniqueName(type),
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

  // 既存の名前を読み込み
  if (!shouldOverwrite) {
    loadExistingNames()
    console.log('📖 既存のJSONファイルから名前を読み込みました')
    console.log(`  - 犬: ${usedDogNames.size}個の名前`)
    console.log(`  - 猫: ${usedCatNames.size}個の名前`)
    console.log('')
  }

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
