#!/usr/bin/env tsx
/**
 * プレースホルダー画像生成スクリプト
 *
 * 使用方法:
 *   npm run db:generate-placeholders -- --dogs=5 --cats=5
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import minimist from 'minimist'

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// コマンドライン引数のパース
const args = minimist(process.argv.slice(2), {
  default: {
    dogs: 5,
    cats: 5,
  },
  alias: {
    d: 'dogs',
    c: 'cats',
  },
})

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'images')
const DOG_DIR = path.join(FIXTURES_DIR, 'dogs')
const CAT_DIR = path.join(FIXTURES_DIR, 'cats')

/**
 * 画像をダウンロード
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  fs.writeFileSync(filepath, Buffer.from(buffer))
}

/**
 * プレースホルダー画像を生成
 */
async function generatePlaceholders() {
  const dogCount = parseInt(args.dogs as string, 10)
  const catCount = parseInt(args.cats as string, 10)

  console.log('🖼️  プレースホルダー画像を生成中...')
  console.log(`  - 犬: ${dogCount}枚`)
  console.log(`  - 猫: ${catCount}枚`)
  console.log('')

  // ディレクトリが存在するか確認
  if (!fs.existsSync(DOG_DIR)) {
    fs.mkdirSync(DOG_DIR, { recursive: true })
  }
  if (!fs.existsSync(CAT_DIR)) {
    fs.mkdirSync(CAT_DIR, { recursive: true })
  }

  let successCount = 0
  let failCount = 0

  // 犬の画像をダウンロード
  console.log('🐕 犬の画像をダウンロード中...')
  console.log('   (Lorem Picsum からランダム画像を取得)')
  for (let i = 1; i <= dogCount; i++) {
    try {
      // Lorem Picsumからランダム画像を取得
      const randomSeed = `dog-${Date.now()}-${i}`
      const url = `https://picsum.photos/seed/${randomSeed}/800/600`
      const filepath = path.join(DOG_DIR, `dog-${i}.jpg`)

      await downloadImage(url, filepath)
      console.log(`  ✅ dog-${i}.jpg を保存しました`)
      successCount++
    } catch (error) {
      console.error(`  ❌ dog-${i}.jpg のダウンロードに失敗:`, error)
      failCount++
    }
  }

  console.log('')

  // 猫の画像をダウンロード
  console.log('🐱 猫の画像をダウンロード中...')
  console.log('   (Lorem Picsum からランダム画像を取得)')
  for (let i = 1; i <= catCount; i++) {
    try {
      // Lorem Picsumからランダム画像を取得
      const randomSeed = `cat-${Date.now()}-${i}`
      const url = `https://picsum.photos/seed/${randomSeed}/800/600`
      const filepath = path.join(CAT_DIR, `cat-${i}.jpg`)

      await downloadImage(url, filepath)
      console.log(`  ✅ cat-${i}.jpg を保存しました`)
      successCount++
    } catch (error) {
      console.error(`  ❌ cat-${i}.jpg のダウンロードに失敗:`, error)
      failCount++
    }
  }

  console.log('')
  console.log('✨ プレースホルダー画像の生成が完了しました！')
  console.log(`  - 成功: ${successCount}枚`)
  console.log(`  - 失敗: ${failCount}枚`)
  console.log('')
  console.log('📁 保存先:')
  console.log(`  - 犬: ${DOG_DIR}`)
  console.log(`  - 猫: ${CAT_DIR}`)
}

// 実行
generatePlaceholders().catch((error) => {
  console.error('❌ エラーが発生しました:', error)
  process.exit(1)
})
