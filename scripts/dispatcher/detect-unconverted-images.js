import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { R2_PATHS } from '@pawmatch/shared/r2-paths'

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
  const params = {
    mode: 'all',
    limit: 50,
    output: 'conversion_list.json',
  }

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      params.mode = arg.split('=')[1]
    } else if (arg.startsWith('--limit=')) {
      params.limit = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--output=')) {
      params.output = arg.split('=')[1]
    }
  }

  return params
}

// オブジェクトの存在確認
async function objectExists(key) {
  try {
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    )
    return true
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

// ペットIDとタイプをキーから抽出
function parsePetFromKey(key) {
  // pets/dogs/12345/screenshot.png -> { id: '12345', type: 'dog' }
  // pets/cats/67890/screenshot.png -> { id: '67890', type: 'cat' }
  const match = key.match(/pets\/(dogs|cats)\/([^\/]+)\//)
  if (match) {
    return {
      id: match[2],
      type: match[1] === 'dogs' ? 'dog' : 'cat',
    }
  }
  return null
}

// R2から未変換画像を検出
async function detectUnconvertedImages(params) {
  const unconverted = []
  let continuationToken
  let scannedCount = 0

  console.log(`🔍 Scanning R2 for unconverted images...`)
  console.log(`  Mode: ${params.mode}`)
  console.log(`  Limit: ${params.limit}`)

  do {
    // スクリーンショットPNGファイルをリスト
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: 'pets/',
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    })

    const response = await r2Client.send(listCommand)

    if (response.Contents) {
      for (const object of response.Contents) {
        // スクリーンショットPNGファイルのみ対象
        if (!object.Key.endsWith('/screenshot.png')) {
          continue
        }

        scannedCount++

        const pet = parsePetFromKey(object.Key)
        if (!pet) continue

        // 変換済みファイルの存在確認
        const jpegKey = R2_PATHS.pets.original(pet.type, pet.id)
        const webpKey = R2_PATHS.pets.optimized(pet.type, pet.id)

        let needsConversion = false
        let conversionInfo = {
          id: pet.id,
          type: pet.type,
          screenshotKey: object.Key,
          screenshotSize: object.Size,
          screenshotLastModified: object.LastModified,
        }

        // モードに応じてチェック
        if (params.mode === 'all') {
          // JPEG と WebP 両方をチェック
          const [jpegExists, webpExists] = await Promise.all([
            objectExists(jpegKey),
            objectExists(webpKey),
          ])

          if (!jpegExists || !webpExists) {
            needsConversion = true
            conversionInfo.missingJpeg = !jpegExists
            conversionInfo.missingWebp = !webpExists
          }
        } else if (params.mode === 'missing-jpeg') {
          // JPEGのみチェック
          const jpegExists = await objectExists(jpegKey)
          if (!jpegExists) {
            needsConversion = true
            conversionInfo.missingJpeg = true
          }
        } else if (params.mode === 'missing-webp') {
          // WebPのみチェック
          const webpExists = await objectExists(webpKey)
          if (!webpExists) {
            needsConversion = true
            conversionInfo.missingWebp = true
          }
        }

        if (needsConversion) {
          unconverted.push(conversionInfo)
          console.log(
            `  📸 Found: ${pet.type} ${pet.id} (JPEG: ${conversionInfo.missingJpeg ? '❌' : '✓'}, WebP: ${conversionInfo.missingWebp ? '❌' : '✓'})`
          )

          // リミットに達したら終了
          if (unconverted.length >= params.limit) {
            break
          }
        }

        // 進捗表示
        if (scannedCount % 100 === 0) {
          console.log(`  ... scanned ${scannedCount} screenshots`)
        }
      }
    }

    continuationToken = response.NextContinuationToken

    // リミットに達したら終了
    if (unconverted.length >= params.limit) {
      break
    }
  } while (continuationToken)

  console.log(`\n📊 Scan Summary:`)
  console.log(`  Total screenshots scanned: ${scannedCount}`)
  console.log(`  Unconverted images found: ${unconverted.length}`)

  if (unconverted.length > 0) {
    // タイプ別の統計
    const dogCount = unconverted.filter((p) => p.type === 'dog').length
    const catCount = unconverted.filter((p) => p.type === 'cat').length
    console.log(`  🐕 Dogs: ${dogCount}`)
    console.log(`  🐱 Cats: ${catCount}`)

    // 欠落フォーマットの統計
    const missingJpeg = unconverted.filter((p) => p.missingJpeg).length
    const missingWebp = unconverted.filter((p) => p.missingWebp).length
    if (params.mode === 'all') {
      console.log(`  Missing JPEG: ${missingJpeg}`)
      console.log(`  Missing WebP: ${missingWebp}`)
    }
  }

  return unconverted
}

// APIから画像なしペットを取得（フォールバック用）
async function fetchFromAPI(limit) {
  const apiUrl = process.env.API_URL || 'https://pawmatch-api.elchika.app'

  try {
    const response = await fetch(`${apiUrl}/api/stats`)
    const data = await response.json()

    if (data.data && data.data.missingImages) {
      return data.data.missingImages.slice(0, limit).map((pet) => ({
        id: pet.id,
        type: pet.type,
        name: pet.name,
        sourceUrl: pet.sourceUrl,
      }))
    }
  } catch (error) {
    console.error('Failed to fetch from API:', error)
  }

  return []
}

// メイン処理
async function main() {
  const params = parseArgs()

  try {
    // R2から未変換画像を検出
    const unconvertedImages = await detectUnconvertedImages(params)

    if (unconvertedImages.length > 0) {
      // R2内に存在するスクリーンショットの変換リストを保存
      await fs.writeFile(params.output, JSON.stringify(unconvertedImages, null, 2))
      console.log(`\n✅ Results saved to: ${params.output}`)
    } else {
      // R2に未変換画像がない場合
      console.log('\n⚠️ No unconverted images found in R2')
      console.log('ℹ️  This is normal if all screenshots have been converted.')
      console.log('ℹ️  To capture new screenshots, use the Screenshot Capture workflow instead.')

      // 空の配列を出力（エラーではない）
      await fs.writeFile(params.output, JSON.stringify([], null, 2))

      // 注意: APIからのフォールバックは削除
      // 理由: スクリーンショットが存在しないペットを変換しようとするとエラーになるため
    }
  } catch (error) {
    console.error('❌ Error:', error)
    // エラー時は空の配列を出力
    await fs.writeFile(params.output, JSON.stringify([], null, 2))
    process.exit(1)
  }
}

// エラーハンドリング
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
