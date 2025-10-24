#!/usr/bin/env tsx

/**
 * ローカル画像変換スクリプト
 * database/fixtures/images/ の画像を WebP/JPEG に変換
 * 本番環境と同じディレクトリ構造で保存
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  convertImage,
  calculateStatistics,
  formatFileSize,
  R2_PATHS,
  type ConversionResult,
} from './utils/image-converter.js'

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// プロジェクトルートへのパス
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const FIXTURES_DIR = path.join(PROJECT_ROOT, 'database/fixtures/images')
const OUTPUT_BASE_DIR = path.join(PROJECT_ROOT, '.wrangler/state/r2/buddies-images')

// カラー定義
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
  magenta: '\x1b[0;35m',
}

interface PetImage {
  id: string
  type: 'dog' | 'cat'
  sourcePath: string
}

interface ProcessResult {
  pet_id: string
  pet_type: string
  success: boolean
  jpegSize?: number
  webpSize?: number
  savingsPercent?: number
  processingTime?: number
  error?: string
}

/**
 * コマンドライン引数を解析
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    type: 'all' as 'all' | 'dogs' | 'cats',
    limit: undefined as number | undefined,
    verbose: false,
  }

  args.forEach((arg) => {
    if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1] as typeof options.type
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1])
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    }
  })

  return options
}

/**
 * ローカル画像を読み込み
 */
async function loadLocalImages(type: 'all' | 'dogs' | 'cats'): Promise<PetImage[]> {
  const pets: PetImage[] = []

  // 犬の画像を読み込み
  if (type === 'all' || type === 'dogs') {
    const dogsDir = path.join(FIXTURES_DIR, 'dogs')
    try {
      const files = await fs.readdir(dogsDir)
      const imageFiles = files.filter((f) => f.match(/\.(png|jpg|jpeg)$/i))

      for (const file of imageFiles) {
        const id = file.replace(/\.(png|jpg|jpeg)$/i, '')
        pets.push({
          id,
          type: 'dog',
          sourcePath: path.join(dogsDir, file),
        })
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ 犬の画像ディレクトリが見つかりません${colors.reset}`)
    }
  }

  // 猫の画像を読み込み
  if (type === 'all' || type === 'cats') {
    const catsDir = path.join(FIXTURES_DIR, 'cats')
    try {
      const files = await fs.readdir(catsDir)
      const imageFiles = files.filter((f) => f.match(/\.(png|jpg|jpeg)$/i))

      for (const file of imageFiles) {
        const id = file.replace(/\.(png|jpg|jpeg)$/i, '')
        pets.push({
          id,
          type: 'cat',
          sourcePath: path.join(catsDir, file),
        })
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ 猫の画像ディレクトリが見つかりません${colors.reset}`)
    }
  }

  return pets
}

/**
 * 画像を変換して保存
 */
async function convertAndSave(pet: PetImage, verbose: boolean = false): Promise<ProcessResult> {
  const startTime = Date.now()
  const result: ProcessResult = {
    pet_id: pet.id,
    pet_type: pet.type,
    success: false,
  }

  try {
    if (verbose) {
      console.log(`🔄 Processing ${pet.id}...`)
    }

    // 元画像を読み込み
    const imageBuffer = await fs.readFile(pet.sourcePath)

    // 画像を変換
    const conversion = await convertImage(imageBuffer)

    // 出力ディレクトリを作成
    const outputDir = path.join(OUTPUT_BASE_DIR, 'pets', `${pet.type}s`, pet.id)
    await fs.mkdir(outputDir, { recursive: true })

    // 元画像をコピー (screenshot.png として)
    const screenshotPath = path.join(outputDir, 'screenshot.png')
    await fs.copyFile(pet.sourcePath, screenshotPath)

    // JPEG を保存 (original.jpg として - 本番環境の命名規則)
    const jpegPath = path.join(outputDir, 'original.jpg')
    await fs.writeFile(jpegPath, conversion.jpegBuffer)

    // WebP を保存 (optimized.webp として - 本番環境の命名規則)
    const webpPath = path.join(outputDir, 'optimized.webp')
    await fs.writeFile(webpPath, conversion.webpBuffer)

    result.success = true
    result.jpegSize = conversion.jpegSize
    result.webpSize = conversion.webpSize
    result.savingsPercent = conversion.savingsPercent
    result.processingTime = Date.now() - startTime

    if (verbose) {
      console.log(
        `  ✓ JPEG: ${formatFileSize(conversion.jpegSize)} | ` +
          `WebP: ${formatFileSize(conversion.webpSize)} | ` +
          `${colors.green}Saved: ${conversion.savingsPercent.toFixed(1)}%${colors.reset}`
      )
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    if (verbose) {
      console.error(`  ${colors.red}✗ Error: ${result.error}${colors.reset}`)
    }
  }

  return result
}

/**
 * 結果サマリーを表示
 */
function showSummary(results: ProcessResult[]) {
  const stats = calculateStatistics(results)

  console.log()
  console.log(`${colors.blue}${'━'.repeat(50)}${colors.reset}`)
  console.log(`${colors.blue}  📊 変換結果サマリー${colors.reset}`)
  console.log(`${colors.blue}${'━'.repeat(50)}${colors.reset}`)
  console.log()

  console.log(`  処理数: ${stats.totalProcessed}`)
  console.log(`  ${colors.green}✅ 成功: ${stats.successful}${colors.reset}`)
  if (stats.failed > 0) {
    console.log(`  ${colors.red}❌ 失敗: ${stats.failed}${colors.reset}`)
  }

  if (stats.successful > 0) {
    console.log()
    console.log(`  ${colors.cyan}📦 ファイルサイズ:${colors.reset}`)
    console.log(`    JPEG合計: ${formatFileSize(stats.totalJpegSize)}`)
    console.log(`    WebP合計: ${formatFileSize(stats.totalWebpSize)}`)
    console.log(
      `    ${colors.green}💾 削減率: ${stats.overallSavingsPercent.toFixed(1)}%${colors.reset}`
    )

    if (stats.averageProcessingTime > 0) {
      console.log()
      console.log(`  ⏱  平均処理時間: ${stats.averageProcessingTime.toFixed(0)}ms`)
    }
  }

  console.log()
  console.log(`  ${colors.cyan}📂 出力先:${colors.reset}`)
  console.log(`    ${OUTPUT_BASE_DIR}`)
  console.log()
}

/**
 * メイン処理
 */
async function main() {
  const options = parseArgs()

  console.log()
  console.log(`${colors.magenta}${'═'.repeat(50)}${colors.reset}`)
  console.log(`${colors.magenta}  🚀 Local Image Conversion Pipeline${colors.reset}`)
  console.log(`${colors.magenta}${'═'.repeat(50)}${colors.reset}`)
  console.log()
  console.log(`  📋 Type: ${colors.cyan}${options.type}${colors.reset}`)
  if (options.limit) {
    console.log(`  📋 Limit: ${colors.cyan}${options.limit}${colors.reset}`)
  }
  console.log(`  📁 Source: ${FIXTURES_DIR}`)
  console.log(`  📂 Output: ${OUTPUT_BASE_DIR}`)
  console.log()

  // 画像リストを取得
  console.log(`${colors.yellow}📸 画像を検索中...${colors.reset}`)
  let pets = await loadLocalImages(options.type)

  if (pets.length === 0) {
    console.log(`${colors.red}❌ 変換する画像が見つかりませんでした${colors.reset}`)
    process.exit(1)
  }

  // limit が指定されている場合は制限
  if (options.limit && options.limit < pets.length) {
    pets = pets.slice(0, options.limit)
  }

  console.log(`  ✓ ${pets.length} 個の画像を見つけました`)
  console.log()

  // バッチ処理で変換
  const BATCH_SIZE = 5
  const results: ProcessResult[] = []

  console.log(`${colors.yellow}🔄 変換処理を開始...${colors.reset}`)
  console.log()

  for (let i = 0; i < pets.length; i += BATCH_SIZE) {
    const batch = pets.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map((pet) => convertAndSave(pet, options.verbose)))
    results.push(...batchResults)

    // 進捗表示
    const progress = Math.min(i + BATCH_SIZE, pets.length)
    const percent = ((progress / pets.length) * 100).toFixed(0)
    console.log(
      `  ${colors.blue}[${progress}/${pets.length}]${colors.reset} ` +
        `${colors.cyan}${percent}% 完了${colors.reset}`
    )
  }

  // 結果サマリーを表示
  showSummary(results)

  // concurrently との統合のためのメッセージ送信
  if (process.send) {
    process.send({
      type: 'complete',
      stats: calculateStatistics(results),
    })
  }

  // エラーがある場合は終了コード1
  const hasErrors = results.some((r) => !r.success)
  process.exit(hasErrors ? 1 : 0)
}

// エラーハンドリング
main().catch((error) => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error)
  process.exit(1)
})