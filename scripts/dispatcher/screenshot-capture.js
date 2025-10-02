import { chromium } from 'playwright'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// API設定
const API_URL = process.env.API_URL || 'https://pawmatch-api.elchika.app'
const API_KEY = process.env.API_KEY || process.env.PUBLIC_API_KEY

// コマンドライン引数を解析
function parseArgs() {
  const args = process.argv.slice(2)
  const params = {}

  for (const arg of args) {
    if (arg.startsWith('--batch-file=')) {
      params.batchFile = arg.split('=')[1]
    } else if (arg.startsWith('--batch-id=')) {
      params.batchId = arg.split('=')[1]
    } else if (arg.startsWith('--max-retries=')) {
      params.maxRetries = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--append-results=')) {
      params.appendResults = arg.split('=')[1] === 'true'
    }
  }

  return params
}

// リトライ付きスクリーンショット処理
async function processWithRetry(page, pet, maxRetries = 1) {
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Processing ${pet.id} - ${pet.name} (attempt ${attempt}/${maxRetries})`)

      const result = await captureScreenshot(page, pet)

      if (result.success) {
        console.log(`  ✅ Success on attempt ${attempt}`)
        return { ...result, attempts: attempt }
      }

      lastError = result.error

      // 最終試行でなければ待機
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000 // 2秒、4秒と増やす
        console.log(`  ⏳ Waiting ${waitTime}ms before retry...`)
        await page.waitForTimeout(waitTime)
      }
    } catch (error) {
      lastError = error.message
      console.error(`  ❌ Attempt ${attempt} failed:`, error.message)

      // 最終試行でなければ待機
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000
        await page.waitForTimeout(waitTime)
      }
    }
  }

  // 全試行失敗
  console.error(`  ❌ All ${maxRetries} attempts failed for ${pet.id}`)
  return {
    pet_id: pet.id,
    pet_type: pet.type,
    success: false,
    error: lastError,
    attempts: maxRetries
  }
}

// スクリーンショット取得
async function captureScreenshot(page, pet) {
  const startTime = Date.now()
  const results = {
    pet_id: pet.id,
    pet_type: pet.type,
    success: false,
  }

  try {
    console.log(`📸 Capturing screenshot for ${pet.id} - ${pet.name}`)

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
    let imageInfo = null

    for (const selector of selectors) {
      const element = await page.$(selector)
      if (element) {
        const src = await element.getAttribute('src')
        if (src && !src.includes('ui_img.png') && !src.includes('global_images')) {
          imageElement = element
          imageInfo = { selector, src }
          console.log(`  ✓ Found image: ${selector}`)
          break
        }
      }
    }

    let screenshotBuffer
    let captureMethod = 'element'

    if (imageElement) {
      // 要素のスクリーンショット
      screenshotBuffer = await imageElement.screenshot({ type: 'png' })
    } else {
      // ページエリアのスクリーンショット
      console.log('  ⚠ No specific image found, capturing page area')
      captureMethod = 'page-area'
      screenshotBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 200, width: 800, height: 600 },
      })
    }

    // R2に直接アップロード
    // pet.typeが単数形（dog/cat）の場合は複数形に変換
    const petTypeFolder = pet.type.endsWith('s') ? pet.type : `${pet.type}s`
    const screenshotKey = `pets/${petTypeFolder}/${pet.id}/screenshot.png`
    const tempFilePath = `/tmp/screenshot-${pet.id}.png`

    // 一時ファイルに保存
    await fs.writeFile(tempFilePath, screenshotBuffer)
    console.log(`  💾 Saved screenshot to temp file: ${tempFilePath}`)

    // AWS S3 SDKでR2にアップロード
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

    try {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
        },
      })

      console.log(`  📤 Uploading to R2: ${screenshotKey}`)

      const putCommand = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'pawmatch-images',
        Key: screenshotKey,
        Body: screenshotBuffer,
        ContentType: 'image/png',
      })

      await s3Client.send(putCommand)
      console.log(`  ☁️ R2 upload complete: ${screenshotKey}`)

      // APIを呼び出してフラグを更新
      console.log(`  🔄 Updating screenshot status via API...`)
      const statusUpdateResponse = await fetch(`${API_URL}/api/images/status/update`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY || 'dummy-key',
          'Content-Type': 'application/json',
          'User-Agent': 'PawMatch-Screenshot-Capture/1.0',
        },
        body: JSON.stringify({
          petId: pet.id,
          petType: pet.type,
          screenshotKey: screenshotKey,
          hasScreenshot: true,
        }),
      })

      if (!statusUpdateResponse.ok) {
        const errorText = await statusUpdateResponse.text()
        console.error(`  ⚠️ Status update failed: ${statusUpdateResponse.status} - ${errorText}`)
        // ステータス更新失敗はエラーにしない（画像はアップロード済みなので）
      } else {
        console.log(`  ✅ Screenshot status updated successfully`)
      }

      // 一時ファイルを削除
      await fs
        .unlink(tempFilePath)
        .catch((err) => console.warn(`  ⚠️ Failed to delete temp file: ${err.message}`))
    } catch (uploadError) {
      console.error(`  ❌ R2 upload failed: ${uploadError.message}`)
      console.error(`  📝 Error details: ${JSON.stringify(uploadError)}`)
      // 一時ファイルを削除
      await fs.unlink(tempFilePath).catch(() => {})
      throw uploadError
    }

    console.log(
      `  ☁️ Uploaded PNG screenshot to R2 (${(screenshotBuffer.length / 1024).toFixed(1)}KB)`
    )

    results.success = true
    results.screenshotKey = screenshotKey
    results.screenshotUrl = `${API_URL}/api/images/${pet.type}/${pet.id}.png`
    results.screenshotSize = screenshotBuffer.length
    results.captureMethod = captureMethod
    results.imageInfo = imageInfo
    results.duration = Date.now() - startTime
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
    results.error = error.message
  }

  return results
}

// メイン処理
async function main() {
  const args = parseArgs()

  if (!args.batchFile) {
    console.error('❌ Error: --batch-file parameter is required')
    process.exit(1)
  }

  const batchId = args.batchId || `capture-${Date.now()}`
  const maxRetries = args.maxRetries || 3
  const appendResults = args.appendResults || false

  // ペットデータを読み込み
  const petsData = await fs.readFile(args.batchFile, 'utf-8')
  const pets = JSON.parse(petsData)

  console.log(`🚀 Screenshot Capture Pipeline`)
  console.log(`📋 Batch ID: ${batchId}`)
  console.log(`🔄 Max retries: ${maxRetries}`)
  console.log(`📸 Capturing screenshots for ${pets.length} pets\n`)

  // ログディレクトリを作成
  const logDir = path.join(__dirname, '../logs')
  await fs.mkdir(logDir, { recursive: true })

  // 既存の結果を読み込み（appendResultsがtrueの場合）
  let existingResults = []
  const resultsPath = path.join(logDir, 'capture-results.json')
  if (appendResults) {
    try {
      const existingData = await fs.readFile(resultsPath, 'utf-8')
      const existingJson = JSON.parse(existingData)
      existingResults = existingJson.results || []
      console.log(`📂 Appending to existing results (${existingResults.length} existing)\n`)
    } catch (err) {
      console.log(`📝 Starting fresh results file\n`)
    }
  }

  // ブラウザを起動
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (compatible; PawMatch-Screenshot-Bot/1.0)',
  })

  const page = await context.newPage()
  const results = []

  // 各ペットのスクリーンショットを取得（リトライ付き）
  for (const pet of pets) {
    const result = await processWithRetry(page, pet, maxRetries)
    results.push(result)

    // レート制限対策
    if (pets.indexOf(pet) < pets.length - 1) {
      await page.waitForTimeout(1000)
    }
  }

  await browser.close()

  // 全結果を結合（appendResultsがtrueの場合）
  const allResults = appendResults ? [...existingResults, ...results] : results

  // 結果サマリー
  const successful = allResults.filter((r) => r.success).length
  const failed = allResults.filter((r) => !r.success).length

  console.log('\n📊 Capture Summary:')
  console.log(`  ✅ Successful: ${successful}/${allResults.length}`)
  console.log(`  ❌ Failed: ${failed}/${allResults.length}`)

  if (successful > 0) {
    const successfulResults = allResults.filter((r) => r.success)
    const totalSize = successfulResults.reduce((sum, r) => sum + r.screenshotSize, 0)

    console.log(`  📦 Total PNG size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(
      `  ⏱️ Average capture time: ${(successfulResults.reduce((sum, r) => sum + r.duration, 0) / successful / 1000).toFixed(1)}s`
    )

    // リトライ統計
    const retriedResults = successfulResults.filter(r => r.attempts > 1)
    if (retriedResults.length > 0) {
      console.log(`  🔄 Succeeded with retries: ${retriedResults.length} pets`)
      const avgRetries = retriedResults.reduce((sum, r) => sum + r.attempts, 0) / retriedResults.length
      console.log(`  📈 Average attempts for retry cases: ${avgRetries.toFixed(1)}`)
    }
  }

  // 結果をJSONファイルに保存
  await fs.writeFile(
    resultsPath,
    JSON.stringify(
      {
        batchId,
        timestamp: new Date().toISOString(),
        totalProcessed: allResults.length,
        successful,
        failed,
        results: allResults,
      },
      null,
      2
    )
  )

  console.log(`\n✨ Screenshot capture completed!`)
  console.log(`📂 Results saved to: ${resultsPath}`)

  // 成功した場合は0、失敗がある場合は1を返す
  process.exit(failed > 0 ? 1 : 0)
}

// エラーハンドリング
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
