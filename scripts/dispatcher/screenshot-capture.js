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
    }
  }

  return params
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
    const screenshotKey = `pets/${pet.type}s/${pet.id}/screenshot.png`
    const tempFilePath = `/tmp/screenshot-${pet.id}.png`

    // 一時ファイルに保存
    await fs.writeFile(tempFilePath, screenshotBuffer)
    console.log(`  💾 Saved screenshot to temp file: ${tempFilePath}`)

    // wrangler r2コマンドでR2にアップロード
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      const uploadCommand = `CLOUDFLARE_API_TOKEN=${process.env.CLOUDFLARE_API_TOKEN || 'EsGXyRrfvFxsDc3b4jXOe2WCAeO-eFHDHldtLU31'} npx wrangler r2 object put pawmatch-images/${screenshotKey} --file=${tempFilePath} --content-type=image/png`
      console.log(`  📤 Uploading to R2: ${screenshotKey}`)

      const { stdout, stderr } = await execAsync(uploadCommand)
      if (stderr) {
        console.error(`  ⚠️ R2 upload stderr: ${stderr}`)
      }
      console.log(`  ☁️ R2 upload complete: ${stdout}`)

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

  // ペットデータを読み込み
  const petsData = await fs.readFile(args.batchFile, 'utf-8')
  const pets = JSON.parse(petsData)

  console.log(`🚀 Screenshot Capture Pipeline`)
  console.log(`📋 Batch ID: ${batchId}`)
  console.log(`📸 Capturing screenshots for ${pets.length} pets\n`)

  // ログディレクトリを作成
  const logDir = path.join(__dirname, '../logs')
  await fs.mkdir(logDir, { recursive: true })

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

  // 各ペットのスクリーンショットを取得
  for (const pet of pets) {
    const result = await captureScreenshot(page, pet)
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

  console.log('\n📊 Capture Summary:')
  console.log(`  ✅ Successful: ${successful}/${pets.length}`)
  console.log(`  ❌ Failed: ${failed}/${pets.length}`)

  if (successful > 0) {
    const totalSize = results.filter((r) => r.success).reduce((sum, r) => sum + r.screenshotSize, 0)

    console.log(`  📦 Total PNG size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(
      `  ⏱️ Average capture time: ${(results.filter((r) => r.success).reduce((sum, r) => sum + r.duration, 0) / successful / 1000).toFixed(1)}s`
    )
  }

  // 結果をJSONファイルに保存
  const resultsPath = path.join(logDir, 'capture-results.json')
  await fs.writeFile(
    resultsPath,
    JSON.stringify(
      {
        batchId,
        timestamp: new Date().toISOString(),
        totalProcessed: pets.length,
        successful,
        failed,
        results,
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
