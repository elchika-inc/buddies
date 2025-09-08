import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
    console.error(`Error downloading ${key}:`, error.message)
    return null
  }
}

// すべてのオブジェクトを取得（ページネーション対応）
async function getAllObjects(prefix) {
  const allObjects = []
  let continuationToken

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    })

    const response = await r2Client.send(listCommand)

    if (response.Contents) {
      allObjects.push(...response.Contents)
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return allObjects
}

// 画像をWebPに変換
async function convertToWebp(imageKey, petType) {
  const startTime = Date.now()

  try {
    // ファイル名からペットIDを抽出
    const filename = path.basename(imageKey)
    const petId = filename.replace(/\.(jpg|jpeg|png|gif)$/i, '')

    console.log(`🔄 Converting ${petType} ${petId}`)
    console.log(`  Source: ${imageKey}`)

    // GIFファイルはスキップ
    if (imageKey.toLowerCase().endsWith('.gif')) {
      console.log(`  ⚠️ Skipping GIF file`)
      return null
    }

    // 画像をダウンロード
    const imageBuffer = await downloadFromR2(imageKey)
    if (!imageBuffer) {
      throw new Error('Failed to download image')
    }

    console.log(`  ✓ Downloaded (${(imageBuffer.length / 1024).toFixed(1)}KB)`)

    // WebPに変換
    const webpBuffer = await sharp(imageBuffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer()

    // WebPの保存先を決定（optimizedフォルダに保存）
    const webpKey = `${petType}/optimized/${petId}.webp`

    // WebPをR2にアップロード
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: webpKey,
        Body: webpBuffer,
        ContentType: 'image/webp',
        Metadata: {
          'pet-id': petId,
          'pet-type': petType,
          'converted-at': new Date().toISOString(),
          'source-key': imageKey,
        },
      })
    )

    const savings = (100 - (webpBuffer.length / imageBuffer.length) * 100).toFixed(1)
    console.log(`  ✓ WebP created (${(webpBuffer.length / 1024).toFixed(1)}KB)`)
    console.log(`  💾 Size reduction: ${savings}%`)
    console.log(`  ☁️ Uploaded to: ${webpKey}`)

    return {
      success: true,
      pet_id: petId,
      pet_type: petType,
      sourceKey: imageKey,
      webpKey,
      sourceSize: imageBuffer.length,
      webpSize: webpBuffer.length,
      savings: parseFloat(savings),
      duration: Date.now() - startTime,
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
    return {
      success: false,
      sourceKey: imageKey,
      error: error.message,
    }
  }
}

// データベース更新処理
async function updateDatabase(results) {
  const API_URL = process.env.API_URL || 'https://pawmatch-api.elchika.app'
  const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET || ''

  console.log('\n🔄 Updating database with conversion results...')
  console.log('================================================')

  // 成功した変換のペットIDを抽出
  const successfulConversions = results
    .filter((r) => r && r.success)
    .map((r) => ({
      pet_id: r.pet_id,
      pet_type: r.pet_type,
    }))

  if (successfulConversions.length === 0) {
    console.log('  No successful conversions to update')
    return { updated: 0 }
  }

  // ペットタイプごとにグループ化
  const catIds = successfulConversions.filter((c) => c.pet_type === 'cats').map((c) => c.pet_id)

  const dogIds = successfulConversions.filter((c) => c.pet_type === 'dogs').map((c) => c.pet_id)

  console.log(`  🐱 Cat IDs to update: ${catIds.length}`)
  console.log(`  🐕 Dog IDs to update: ${dogIds.length}`)

  const BATCH_SIZE = 50
  let totalUpdated = 0

  // バッチ更新関数
  async function updateBatch(petType, petIds) {
    try {
      const response = await fetch(`${API_URL}/api/admin/pets/update-flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': API_ADMIN_SECRET,
        },
        body: JSON.stringify({
          petType,
          petIds,
          flags: {
            has_webp: true,
            has_jpeg: true,
          },
        }),
      })

      if (!response.ok) {
        console.error(`    ❌ API request failed: ${response.status}`)
        return 0
      }

      const result = await response.json()
      return result.updated || 0
    } catch (error) {
      console.error(`    ❌ Failed to update batch:`, error.message)
      return 0
    }
  }

  // Catsの更新
  if (catIds.length > 0) {
    console.log('\n  🐱 Updating cat records...')
    for (let i = 0; i < catIds.length; i += BATCH_SIZE) {
      const batch = catIds.slice(i, i + BATCH_SIZE)
      const updated = await updateBatch('cat', batch)
      totalUpdated += updated
      console.log(`    Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updated} updated`)
    }
  }

  // Dogsの更新
  if (dogIds.length > 0) {
    console.log('\n  🐕 Updating dog records...')
    for (let i = 0; i < dogIds.length; i += BATCH_SIZE) {
      const batch = dogIds.slice(i, i + BATCH_SIZE)
      const updated = await updateBatch('dog', batch)
      totalUpdated += updated
      console.log(`    Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updated} updated`)
    }
  }

  console.log(`\n  ✅ Database update completed: ${totalUpdated} records updated`)

  return {
    updated: totalUpdated,
    attempted: successfulConversions.length,
  }
}

// メイン処理
async function main() {
  console.log(`🚀 Convert cats/originals and dogs/originals to WebP`)
  console.log(`=====================================================`)
  console.log(`Account: ${process.env.R2_ACCOUNT_ID}`)
  console.log(`Bucket: ${process.env.R2_BUCKET_NAME}`)
  console.log()

  // ログディレクトリを作成
  const logDir = path.join(__dirname, 'logs')
  await fs.mkdir(logDir, { recursive: true })

  // cats/originals の画像を取得
  console.log('📋 Scanning cats/originals/...')
  const catImages = await getAllObjects('cats/originals/')
  console.log(`  Found ${catImages.length} cat images`)

  // dogs/originals の画像を取得
  console.log('📋 Scanning dogs/originals/...')
  const dogImages = await getAllObjects('dogs/originals/')
  console.log(`  Found ${dogImages.length} dog images`)

  // 既存のWebPファイルを確認
  console.log('\n📋 Checking existing WebP files...')
  const catWebp = await getAllObjects('cats/optimized/')
  const dogWebp = await getAllObjects('dogs/optimized/')
  console.log(`  Existing WebP: ${catWebp.length} cats, ${dogWebp.length} dogs`)

  // 既にWebPがあるペットIDを取得
  const existingWebpIds = new Set()
  ;[...catWebp, ...dogWebp].forEach((obj) => {
    const filename = path.basename(obj.Key)
    const id = filename.replace('.webp', '')
    existingWebpIds.add(id)
  })

  // 変換対象をフィルタ（WebPがまだないもの、GIF以外）
  const catsToConvert = catImages.filter((img) => {
    const filename = path.basename(img.Key)
    const id = filename.replace(/\.(jpg|jpeg|png|gif)$/i, '')
    return !existingWebpIds.has(id) && !img.Key.toLowerCase().endsWith('.gif')
  })

  const dogsToConvert = dogImages.filter((img) => {
    const filename = path.basename(img.Key)
    const id = filename.replace(/\.(jpg|jpeg|png|gif)$/i, '')
    return !existingWebpIds.has(id) && !img.Key.toLowerCase().endsWith('.gif')
  })

  const totalToConvert = catsToConvert.length + dogsToConvert.length

  console.log(`\n🎯 Conversion plan:`)
  console.log(`  Cats to convert: ${catsToConvert.length}`)
  console.log(`  Dogs to convert: ${dogsToConvert.length}`)
  console.log(`  Total: ${totalToConvert}`)

  if (totalToConvert === 0) {
    console.log('\n✨ All images already have WebP versions!')
    return
  }

  // バッチ処理の準備
  const BATCH_SIZE = 5 // 同時処理数
  const results = []
  let processedCount = 0

  // 処理開始
  console.log(`\n🔄 Starting conversion of ${totalToConvert} images...\n`)

  // Catsを処理
  if (catsToConvert.length > 0) {
    console.log(`\n🐱 Processing ${catsToConvert.length} cat images...\n`)
    for (let i = 0; i < catsToConvert.length; i += BATCH_SIZE) {
      const batch = catsToConvert.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map((img) => convertToWebp(img.Key, 'cats')))

      results.push(...batchResults.filter((r) => r !== null))
      processedCount += batch.length

      // 進捗表示
      const progress = Math.round((processedCount / totalToConvert) * 100)
      console.log(`\n📊 Overall progress: ${processedCount}/${totalToConvert} (${progress}%)\n`)
    }
  }

  // Dogsを処理
  if (dogsToConvert.length > 0) {
    console.log(`\n🐕 Processing ${dogsToConvert.length} dog images...\n`)
    for (let i = 0; i < dogsToConvert.length; i += BATCH_SIZE) {
      const batch = dogsToConvert.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map((img) => convertToWebp(img.Key, 'dogs')))

      results.push(...batchResults.filter((r) => r !== null))
      processedCount += batch.length

      // 進捗表示
      const progress = Math.round((processedCount / totalToConvert) * 100)
      console.log(`\n📊 Overall progress: ${processedCount}/${totalToConvert} (${progress}%)\n`)
    }
  }

  // 結果サマリー
  const successful = results.filter((r) => r && r.success).length
  const failed = results.filter((r) => r && !r.success).length

  console.log('\n📊 Conversion Summary:')
  console.log('======================')
  console.log(`  ✅ Successfully converted: ${successful}`)
  console.log(`  ❌ Failed: ${failed}`)

  if (successful > 0) {
    const totalSourceSize = results
      .filter((r) => r && r.success)
      .reduce((sum, r) => sum + r.sourceSize, 0)
    const totalWebpSize = results
      .filter((r) => r && r.success)
      .reduce((sum, r) => sum + r.webpSize, 0)
    const avgSavings =
      results.filter((r) => r && r.success).reduce((sum, r) => sum + r.savings, 0) / successful

    console.log(`  📦 Total source size: ${(totalSourceSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`  🎨 Total WebP size: ${(totalWebpSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`  💾 Average savings: ${avgSavings.toFixed(1)}%`)
    console.log(
      `  💰 Total saved: ${((totalSourceSize - totalWebpSize) / 1024 / 1024).toFixed(2)}MB`
    )
  }

  // データベースを更新
  const dbUpdateResult = await updateDatabase(results)

  // 結果をファイルに保存
  const resultsPath = path.join(logDir, `originals-conversion-${Date.now()}.json`)
  await fs.writeFile(
    resultsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalScanned: catImages.length + dogImages.length,
        totalProcessed: totalToConvert,
        successful,
        failed,
        results,
        databaseUpdate: dbUpdateResult,
      },
      null,
      2
    )
  )

  console.log(`\n📂 Results saved to: ${resultsPath}`)
  console.log('✨ All conversions and database updates completed!')
}

// エラーハンドリング
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
