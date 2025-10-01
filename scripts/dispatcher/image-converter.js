import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// R2パスの定義（TypeScriptファイルから手動でコピー）
const R2_PATHS = {
  pets: {
    screenshot: (type, id) => `pets/${type}s/${id}/screenshot.png`,
    original: (type, id) => `pets/${type}s/${id}/original.jpg`,
    optimized: (type, id) => `pets/${type}s/${id}/optimized.webp`,
    thumbnail: (type, id) => `pets/${type}s/${id}/thumbnail.webp`,
    medium: (type, id) => `pets/${type}s/${id}/medium.webp`,
    large: (type, id) => `pets/${type}s/${id}/large.webp`,
  },
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// R2クライアントの設定
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

// コマンドライン引数を解析
function parseArgs() {
  const args = process.argv.slice(2)
  const params = {}

  for (const arg of args) {
    if (arg.startsWith('--input-file=')) {
      params.inputFile = arg.split('=')[1]
    } else if (arg.startsWith('--batch-id=')) {
      params.batchId = arg.split('=')[1]
    } else if (arg.startsWith('--mode=')) {
      params.mode = arg.split('=')[1] // all, missing-webp, missing-jpeg
    }
  }

  return params
}

// R2から画像を取得してバッファとして返す
async function downloadFromR2(key) {
  try {
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    )

    const chunks = []
    for await (const chunk of response.Body) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch (error) {
    if (error.Code === 'NoSuchKey') {
      return null
    }
    throw error
  }
}

// 画像変換処理
async function convertImage(pet) {
  const startTime = Date.now()
  const results = {
    pet_id: pet.id,
    pet_type: pet.type,
    success: false,
  }

  try {
    console.log(`🔄 Converting images for ${pet.id}`)

    // スクリーンショットのキー（PNGファイル）
    const screenshotKey = pet.screenshotKey || R2_PATHS.pets.screenshot(pet.type, pet.id)

    // R2からPNG画像をダウンロード
    console.log(`  📥 Downloading from R2: ${screenshotKey}`)
    const imageBuffer = await downloadFromR2(screenshotKey)

    if (!imageBuffer) {
      throw new Error(`Screenshot not found: ${screenshotKey}`)
    }

    console.log(`  ✓ Downloaded PNG (${(imageBuffer.length / 1024).toFixed(1)}KB)`)

    // 画像処理: リサイズとフォーマット変換
    const sharpInstance = sharp(imageBuffer).resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })

    const conversions = []

    // JPEG変換（modeがallまたはmissing-jpegの場合）
    if (pet.mode === 'all' || pet.mode === 'missing-jpeg') {
      const jpegBuffer = await sharpInstance
        .clone()
        .jpeg({ quality: 85, progressive: true })
        .toBuffer()

      const jpegKey = R2_PATHS.pets.original(pet.type, pet.id)

      await r2Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: jpegKey,
          Body: jpegBuffer,
          ContentType: 'image/jpeg',
          Metadata: {
            'pet-id': pet.id,
            'pet-type': pet.type,
            'converted-at': new Date().toISOString(),
            'source-key': screenshotKey,
          },
        })
      )

      conversions.push({
        format: 'jpeg',
        key: jpegKey,
        size: jpegBuffer.length,
        url: `https://${process.env.R2_BUCKET_NAME}.r2.dev/${jpegKey}`,
      })

      console.log(`  ✓ JPEG converted (${(jpegBuffer.length / 1024).toFixed(1)}KB)`)
    }

    // WebP変換（modeがallまたはmissing-webpの場合）
    if (pet.mode === 'all' || pet.mode === 'missing-webp') {
      const webpBuffer = await sharpInstance.clone().webp({ quality: 80 }).toBuffer()

      const webpKey = R2_PATHS.pets.optimized(pet.type, pet.id)

      await r2Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: webpKey,
          Body: webpBuffer,
          ContentType: 'image/webp',
          Metadata: {
            'pet-id': pet.id,
            'pet-type': pet.type,
            'converted-at': new Date().toISOString(),
            'source-key': screenshotKey,
          },
        })
      )

      conversions.push({
        format: 'webp',
        key: webpKey,
        size: webpBuffer.length,
        url: `https://${process.env.R2_BUCKET_NAME}.r2.dev/${webpKey}`,
      })

      console.log(`  ✓ WebP converted (${(webpBuffer.length / 1024).toFixed(1)}KB)`)
    }

    // 変換結果のサマリー
    if (conversions.length === 2) {
      const jpegSize = conversions.find((c) => c.format === 'jpeg').size
      const webpSize = conversions.find((c) => c.format === 'webp').size
      console.log(`  💾 WebP savings: ${(100 - (webpSize / jpegSize) * 100).toFixed(1)}%`)
    }

    results.success = true
    results.conversions = conversions
    results.sourceKey = screenshotKey
    results.duration = Date.now() - startTime

    // 結果にURLとサイズを追加し、変換成功フラグも設定
    conversions.forEach((conv) => {
      if (conv.format === 'jpeg') {
        results.jpegUrl = conv.url
        results.jpegSize = conv.size
        results.jpegSuccess = true
      } else if (conv.format === 'webp') {
        results.webpUrl = conv.url
        results.webpSize = conv.size
        results.webpSuccess = true
      }
    })
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
    results.error = error.message
  }

  return results
}

// メイン処理
async function main() {
  const args = parseArgs()

  if (!args.inputFile) {
    console.error('❌ Error: --input-file parameter is required')
    process.exit(1)
  }

  const batchId = args.batchId || `convert-${Date.now()}`
  const mode = args.mode || 'all'

  // 変換対象のペットデータを読み込み
  const inputData = await fs.readFile(args.inputFile, 'utf-8')
  const pets = JSON.parse(inputData)

  // modeを各ペットに追加
  const petsWithMode = pets.map((pet) => ({ ...pet, mode }))

  console.log(`🚀 Image Conversion Pipeline`)
  console.log(`📋 Batch ID: ${batchId}`)
  console.log(`🔄 Mode: ${mode}`)
  console.log(`📦 Converting images for ${pets.length} pets\n`)

  // ログディレクトリを作成
  const logDir = path.join(__dirname, '../logs')
  await fs.mkdir(logDir, { recursive: true })

  const results = []

  // バッチ処理（並列実行）
  const BATCH_SIZE = 5 // 同時に処理する数
  for (let i = 0; i < petsWithMode.length; i += BATCH_SIZE) {
    const batch = petsWithMode.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map((pet) => convertImage(pet)))
    results.push(...batchResults)

    console.log(
      `  📊 Progress: ${Math.min(i + BATCH_SIZE, petsWithMode.length)}/${petsWithMode.length}`
    )
  }

  // 結果サマリー
  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  console.log('\n📊 Conversion Summary:')
  console.log(`  ✅ Successful: ${successful}/${pets.length}`)
  console.log(`  ❌ Failed: ${failed}/${pets.length}`)

  if (successful > 0) {
    const totalConversions = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + (r.conversions ? r.conversions.length : 0), 0)

    console.log(`  📦 Total conversions: ${totalConversions}`)

    // JPEG/WebPのサイズ統計
    const jpegResults = results.filter((r) => r.jpegSize)
    const webpResults = results.filter((r) => r.webpSize)

    if (jpegResults.length > 0) {
      const totalJpegSize = jpegResults.reduce((sum, r) => sum + r.jpegSize, 0)
      console.log(`  📸 Total JPEG size: ${(totalJpegSize / 1024 / 1024).toFixed(2)}MB`)
    }

    if (webpResults.length > 0) {
      const totalWebpSize = webpResults.reduce((sum, r) => sum + r.webpSize, 0)
      console.log(`  🎨 Total WebP size: ${(totalWebpSize / 1024 / 1024).toFixed(2)}MB`)
    }

    if (jpegResults.length > 0 && webpResults.length > 0) {
      const totalJpegSize = jpegResults.reduce((sum, r) => sum + r.jpegSize, 0)
      const totalWebpSize = webpResults.reduce((sum, r) => sum + r.webpSize, 0)
      console.log(
        `  💾 Overall savings: ${(100 - (totalWebpSize / totalJpegSize) * 100).toFixed(1)}%`
      )
    }
  }

  // 結果をJSONファイルに保存
  const resultsPath = path.join(logDir, 'conversion-results.json')
  await fs.writeFile(
    resultsPath,
    JSON.stringify(
      {
        batchId,
        timestamp: new Date().toISOString(),
        mode,
        totalProcessed: pets.length,
        successful,
        failed,
        results,
      },
      null,
      2
    )
  )

  console.log(`\n✨ Image conversion completed!`)
  console.log(`📂 Results saved to: ${resultsPath}`)

  // 成功した場合は0、失敗がある場合は1を返す
  process.exit(failed > 0 ? 1 : 0)
}

// エラーハンドリング
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
