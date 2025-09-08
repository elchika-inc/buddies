#!/usr/bin/env node

import { chromium } from 'playwright'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 開発環境の設定
const DEV_CONFIG = {
  API_URL: 'http://localhost:8787',
  R2_LOCAL_DIR: path.join(__dirname, '../../.wrangler/state/v3/r2/miniflare-R2BucketObject'),
  BUCKET_NAME: 'pawmatch-images-dev',
}

// コマンドライン引数を解析
function parseArgs() {
  const args = process.argv.slice(2)
  const params = {
    limit: 5,
    type: 'all', // 'dog', 'cat', 'all'
  }

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      params.limit = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--type=')) {
      params.type = arg.split('=')[1]
    } else if (arg === '--help') {
      console.log(`
使用方法: node screenshot-converter-local.js [オプション]

オプション:
  --limit=N     処理するペット数 (デフォルト: 5)
  --type=TYPE   処理するペットタイプ: dog, cat, all (デフォルト: all)
  --help        このヘルプメッセージを表示

例:
  node screenshot-converter-local.js --limit=10 --type=dog
      `)
      process.exit(0)
    }
  }

  return params
}

// ローカルAPIからペットデータを取得
async function fetchPetsFromLocalAPI(limit, type) {
  console.log(`📡 Fetching pets from local API...`)

  try {
    // ローカルAPIから画像が不足しているペットを取得
    const response = await fetch(`${DEV_CONFIG.API_URL}/api/stats`)
    const data = await response.json()

    if (!data.data?.missingImages) {
      console.error('❌ No missing images data found')
      return []
    }

    let pets = data.data.missingImages

    // タイプでフィルタリング
    if (type !== 'all') {
      pets = pets.filter((p) => p.type === type)
    }

    // 制限数までスライス
    pets = pets.slice(0, limit)

    console.log(`  ✓ Found ${pets.length} pets with missing images`)
    return pets
  } catch (error) {
    console.error(`❌ Failed to fetch from API: ${error.message}`)
    return []
  }
}

// R2ローカルストレージに保存（Miniflareのファイル構造をエミュレート）
async function saveToLocalR2(key, buffer, contentType) {
  const r2Dir = DEV_CONFIG.R2_LOCAL_DIR

  // Miniflareのハッシュ形式でファイル名を生成
  const hash = require('crypto').createHash('sha256').update(key).digest('hex')
  const filePath = path.join(r2Dir, hash)

  // ディレクトリが存在しない場合は作成
  await fs.mkdir(path.dirname(filePath), { recursive: true })

  // メタデータファイル
  const metadata = {
    key,
    contentType,
    size: buffer.length,
    uploaded: new Date().toISOString(),
  }

  // ファイルを保存
  await fs.writeFile(filePath, buffer)
  await fs.writeFile(`${filePath}.json`, JSON.stringify(metadata, null, 2))

  console.log(`    💾 Saved to local R2: ${key} (${(buffer.length / 1024).toFixed(1)}KB)`)

  return `http://localhost:8788/${DEV_CONFIG.BUCKET_NAME}/${key}`
}

// スクリーンショット取得と画像処理
async function captureAndConvert(page, pet) {
  const startTime = Date.now()
  const results = {
    pet_id: pet.id,
    pet_type: pet.type,
    success: false,
  }

  try {
    console.log(`\n📸 Processing ${pet.id} - ${pet.name}`)

    // ページに移動
    await page.goto(pet.sourceUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })

    // ページが安定するまで待機
    await page.waitForTimeout(2000)

    // メイン画像を探す
    const selectors = [
      '.main_thumb.img_container img[src*="image.pet-home.jp"]',
      '.main_thumb img[alt]',
      '.img_container img[src*="user_file"]',
      '.photo_area img[src*="image.pet-home.jp"]',
      'img[src*="_th320.jpg"]',
      'img[src*="_th320.jpeg"]',
    ]

    let imageElement = null
    for (const selector of selectors) {
      const element = await page.$(selector)
      if (element) {
        const src = await element.getAttribute('src')
        if (src && !src.includes('ui_img.png') && !src.includes('global_images')) {
          imageElement = element
          console.log(`  ✓ Found image: ${selector}`)
          break
        }
      }
    }

    let screenshotBuffer
    if (imageElement) {
      screenshotBuffer = await imageElement.screenshot({ type: 'png' })
    } else {
      console.log('  ⚠ No specific image found, capturing page area')
      screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 200, width: 800, height: 600 },
      })
    }

    // 画像処理: リサイズとフォーマット変換
    const sharpInstance = sharp(screenshotBuffer).resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })

    // JPEG変換
    const jpegBuffer = await sharpInstance
      .clone()
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    // WebP変換
    const webpBuffer = await sharpInstance.clone().webp({ quality: 80 }).toBuffer()

    console.log(
      `  📦 Converted - JPEG: ${(jpegBuffer.length / 1024).toFixed(1)}KB, WebP: ${(webpBuffer.length / 1024).toFixed(1)}KB`
    )
    console.log(
      `  💾 WebP savings: ${(100 - (webpBuffer.length / jpegBuffer.length) * 100).toFixed(1)}%`
    )

    // ローカルR2に保存
    const jpegKey = `pets/${pet.type}s/${pet.id}/original.jpg`
    const webpKey = `pets/${pet.type}s/${pet.id}/optimized.webp`

    const jpegUrl = await saveToLocalR2(jpegKey, jpegBuffer, 'image/jpeg')
    const webpUrl = await saveToLocalR2(webpKey, webpBuffer, 'image/webp')

    results.success = true
    results.jpegUrl = jpegUrl
    results.webpUrl = webpUrl
    results.jpegSize = jpegBuffer.length
    results.webpSize = webpBuffer.length
    results.duration = Date.now() - startTime
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
    results.error = error.message
  }

  return results
}

// D1データベースを更新
async function updateLocalD1(results) {
  console.log('\n📊 Updating local D1 database...')

  const successfulResults = results.filter((r) => r.success)
  if (successfulResults.length === 0) {
    console.log('  ⚠ No successful results to update')
    return
  }

  // LocalD1Updaterを動的インポート
  const { default: LocalD1Updater } = await import('./util/update-local-d1.js')
  const updater = new LocalD1Updater()

  try {
    // ペットの画像URLを更新
    const pets = successfulResults.map((result) => ({
      id: result.pet_id,
      imageUrl: result.jpegUrl,
      thumbnailUrl: result.webpUrl,
    }))

    await updater.updatePetImages(pets)
  } catch (error) {
    console.error(`  ❌ Failed to update D1: ${error.message}`)
  }
}

// メイン処理
async function main() {
  const args = parseArgs()

  console.log(`🚀 Local Development Image Pipeline`)
  console.log(`📋 Settings: limit=${args.limit}, type=${args.type}`)
  console.log(`🏠 Local API: ${DEV_CONFIG.API_URL}`)
  console.log(`💾 Local R2: ${DEV_CONFIG.R2_LOCAL_DIR}\n`)

  // ローカルAPIからペットデータを取得
  const pets = await fetchPetsFromLocalAPI(args.limit, args.type)

  if (pets.length === 0) {
    console.log('❌ No pets to process')
    process.exit(0)
  }

  console.log(`📦 Processing ${pets.length} pets...\n`)

  // ログディレクトリを作成
  const logDir = path.join(__dirname, '../../logs/dev')
  await fs.mkdir(logDir, { recursive: true })

  // ブラウザを起動
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (compatible; PawMatch-Dev-Bot/1.0)',
  })

  const page = await context.newPage()
  const results = []

  // 各ペットを処理
  for (const pet of pets) {
    const result = await captureAndConvert(page, pet)
    results.push(result)

    // レート制限対策
    if (pets.indexOf(pet) < pets.length - 1) {
      await page.waitForTimeout(1000)
    }
  }

  await browser.close()

  // 結果サマリー
  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log('\n📊 Results Summary:')
  console.log(`  ✅ Successful: ${successful}/${pets.length}`)
  console.log(`  ❌ Failed: ${failed}/${pets.length}`)

  if (successful > 0) {
    const totalJpegSize = results.filter((r) => r.success).reduce((sum, r) => sum + r.jpegSize, 0)
    const totalWebpSize = results.filter((r) => r.success).reduce((sum, r) => sum + r.webpSize, 0)

    console.log(`  📦 Total JPEG size: ${(totalJpegSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`  📦 Total WebP size: ${(totalWebpSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`  💾 Total savings: ${(100 - (totalWebpSize / totalJpegSize) * 100).toFixed(1)}%`)
  }

  // ローカルD1を更新
  await updateLocalD1(results)

  // 結果をJSONファイルに保存
  const resultsPath = path.join(logDir, `results-${Date.now()}.json`)
  await fs.writeFile(
    resultsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        environment: 'development',
        totalProcessed: pets.length,
        successful,
        failed,
        results,
      },
      null,
      2
    )
  )

  console.log(`\n✨ Pipeline completed!`)
  console.log(`📂 Results saved to: ${resultsPath}`)

  process.exit(failed > 0 ? 1 : 0)
}

// エラーハンドリング
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
