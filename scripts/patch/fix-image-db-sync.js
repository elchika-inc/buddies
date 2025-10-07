#!/usr/bin/env node

/**
 * 画像とDBの不整合を修正するスクリプト
 *
 * 問題: R2に画像が存在するが、DBのhas_jpeg/has_webpフラグが0になっている
 * 解決: R2の実際のファイルを確認し、DBのフラグを更新する
 *
 * 使用方法:
 * ========
 *
 * 環境変数の設定:
 *   export R2_ACCOUNT_ID=xxx
 *   export R2_ACCESS_KEY_ID=xxx
 *   export R2_SECRET_ACCESS_KEY=xxx
 *   export API_URL=https://buddies-api.elchika.app
 *   export API_KEY=xxx  # オプション（管理者認証が必要な場合）
 *
 * または.env.localから読み込み:
 *   set -a && source .env.local && set +a
 *
 * 実行例:
 *   # ドライラン（確認のみ、変更なし）
 *   node scripts/patch/fix-image-db-sync.js --dry-run
 *
 *   # 実行（DBを更新）
 *   node scripts/patch/fix-image-db-sync.js
 *
 *   # オプション指定
 *   node scripts/patch/fix-image-db-sync.js --dry-run --limit=100 --type=dog
 *
 * オプション:
 *   --dry-run     : 変更を加えずに不整合を確認のみ
 *   --limit=1000  : 処理するペット数の上限（デフォルト: 1000）
 *   --type=all    : 処理するペットタイプ（dog/cat/all、デフォルト: all）
 *
 * 出力:
 *   - コンソールに進捗と結果を表示
 *   - sync-report-YYYY-MM-DDTHH-MM-SS.json にレポートを生成
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 設定
const CONFIG = {
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'buddies-images',
  API_URL: process.env.API_URL || 'https://buddies-api.elchika.app',
  API_KEY: process.env.API_KEY,
  DRY_RUN: process.argv.includes('--dry-run'),
  LIMIT: parseInt(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || '1000'),
  PET_TYPE: process.argv.find((arg) => arg.startsWith('--type='))?.split('=')[1] || 'all',
}

// R2クライアントの初期化
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CONFIG.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CONFIG.R2_ACCESS_KEY_ID,
    secretAccessKey: CONFIG.R2_SECRET_ACCESS_KEY,
  },
})

/**
 * R2から画像リストを取得
 */
async function fetchR2Images() {
  console.log('📥 Fetching images from R2...')
  console.log(`  Bucket: ${CONFIG.R2_BUCKET_NAME}`)
  console.log(`  Endpoint: https://${CONFIG.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`)

  const images = {
    jpeg: new Set(),
    webp: new Set(),
  }

  let continuationToken = undefined
  let totalFiles = 0

  // 両方のプレフィックスをチェック（pets/とcats|dogs/originals）
  const prefixes = ['pets/', 'cats/', 'dogs/']

  for (const prefix of prefixes) {
    continuationToken = undefined

    do {
      const command = new ListObjectsV2Command({
        Bucket: CONFIG.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })

      try {
        const response = await r2Client.send(command)

        if (response.Contents) {
          for (const object of response.Contents) {
            const key = object.Key
            totalFiles++

            // 複数のパターンに対応
            // 1. pets/dogs/pet-home_pethome_123456/original.jpg
            // 2. dogs/originals/pet-home_pethome_123456.jpg
            // 3. cats/originals/pet-home_pethome_123456.jpg
            let petId = null
            let isJpeg = false
            let isWebp = false

            // パターン1: pets/type/id/filename
            let match = key.match(/pets\/(dogs|cats)\/([^\/]+)\/(original\.jpg|optimized\.webp)/)
            if (match) {
              petId = match[2]
              isJpeg = match[3] === 'original.jpg'
              isWebp = match[3] === 'optimized.webp'
            }

            // パターン2: type/originals/id.ext
            if (!match) {
              match = key.match(/(dogs|cats)\/originals\/([^\/]+)\.(jpg|jpeg|webp)/)
              if (match) {
                petId = match[2]
                isJpeg = match[3] === 'jpg' || match[3] === 'jpeg'
                isWebp = match[3] === 'webp'
              }
            }

            if (petId) {
              if (isJpeg) {
                images.jpeg.add(petId)
              }
              if (isWebp) {
                images.webp.add(petId)
              }
            }
          }
        }

        continuationToken = response.NextContinuationToken
      } catch (error) {
        console.error(`  ❌ R2 API Error: ${error.message}`)
        if (error.Code) {
          console.error(`  Error Code: ${error.Code}`)
        }
        throw error
      }
    } while (continuationToken)
  }

  console.log(`  ✅ Found ${totalFiles} files in R2`)
  console.log(`  📸 JPEG images: ${images.jpeg.size}`)
  console.log(`  🎨 WebP images: ${images.webp.size}`)

  return images
}

/**
 * APIからDBのペット情報を取得
 */
async function fetchDBPets() {
  console.log('📊 Fetching pet data from database...')

  const allPets = []
  let offset = 0
  const limit = 100

  while (offset < CONFIG.LIMIT) {
    const url =
      CONFIG.PET_TYPE === 'all'
        ? `${CONFIG.API_URL}/api/pets?limit=${limit}&offset=${offset}`
        : `${CONFIG.API_URL}/api/pets/${CONFIG.PET_TYPE}?limit=${limit}&offset=${offset}`

    const response = await fetch(url)

    if (!response.ok) {
      console.error(`  ❌ Failed to fetch pets: ${response.status}`)
      break
    }

    const data = await response.json()

    if (!data.success || !data.data) {
      break
    }

    // APIレスポンス構造に応じて処理
    let fetchedCount = 0
    if (data.data.pets) {
      // 古い形式
      allPets.push(...data.data.pets)
      fetchedCount = data.data.pets.length
    } else if (data.data.dogs || data.data.cats) {
      // 新しい形式
      if (data.data.dogs) {
        allPets.push(...data.data.dogs)
        fetchedCount += data.data.dogs.length
      }
      if (data.data.cats) {
        allPets.push(...data.data.cats)
        fetchedCount += data.data.cats.length
      }
    } else {
      break
    }

    if (fetchedCount < limit) {
      break
    }

    offset += limit
  }

  console.log(`  ✅ Fetched ${allPets.length} pets from database`)

  return allPets
}

/**
 * 不整合を検出
 */
function detectInconsistencies(r2Images, dbPets) {
  console.log('\n🔍 Detecting inconsistencies...')

  const inconsistencies = []

  for (const pet of dbPets) {
    const hasJpegInR2 = r2Images.jpeg.has(pet.id)
    const hasWebpInR2 = r2Images.webp.has(pet.id)

    const needsUpdate =
      (hasJpegInR2 && !pet.hasJpeg) ||
      (hasWebpInR2 && !pet.hasWebp) ||
      (!hasJpegInR2 && pet.hasJpeg) ||
      (!hasWebpInR2 && pet.hasWebp)

    if (needsUpdate) {
      inconsistencies.push({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        db: {
          hasJpeg: pet.hasJpeg,
          hasWebp: pet.hasWebp,
        },
        r2: {
          hasJpeg: hasJpegInR2,
          hasWebp: hasWebpInR2,
        },
        updates: {
          hasJpeg: hasJpegInR2,
          hasWebp: hasWebpInR2,
        },
      })
    }
  }

  console.log(`  ⚠️  Found ${inconsistencies.length} inconsistencies`)

  // 詳細表示
  const missingInDB = inconsistencies.filter(
    (i) => (i.r2.hasJpeg && !i.db.hasJpeg) || (i.r2.hasWebp && !i.db.hasWebp)
  )
  const extraInDB = inconsistencies.filter(
    (i) => (!i.r2.hasJpeg && i.db.hasJpeg) || (!i.r2.hasWebp && i.db.hasWebp)
  )

  console.log(`  📸 Images exist in R2 but not marked in DB: ${missingInDB.length}`)
  console.log(`  ❌ Images marked in DB but not in R2: ${extraInDB.length}`)

  return inconsistencies
}

/**
 * DBのフラグを更新
 */
async function updateDatabase(inconsistencies) {
  if (CONFIG.DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made')
    console.log('\n📋 Would update the following pets:')

    for (const item of inconsistencies.slice(0, 10)) {
      console.log(
        `  ${item.id}: JPEG ${item.db.hasJpeg}→${item.r2.hasJpeg}, WebP ${item.db.hasWebp}→${item.r2.hasWebp}`
      )
    }

    if (inconsistencies.length > 10) {
      console.log(`  ... and ${inconsistencies.length - 10} more`)
    }

    return
  }

  console.log('\n📤 Updating database...')

  // バッチ処理（50件ずつ）
  const batchSize = 50
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < inconsistencies.length; i += batchSize) {
    const batch = inconsistencies.slice(i, i + batchSize)

    const payload = {
      results: batch.map((item) => ({
        pet_id: item.id,
        pet_type: item.type,
        success: true,
        jpegUrl: item.r2.hasJpeg
          ? `https://${CONFIG.R2_BUCKET_NAME}.r2.dev/pets/${item.type}s/${item.id}/original.jpg`
          : null,
        webpUrl: item.r2.hasWebp
          ? `https://${CONFIG.R2_BUCKET_NAME}.r2.dev/pets/${item.type}s/${item.id}/optimized.webp`
          : null,
      })),
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
      }

      if (CONFIG.API_KEY) {
        headers['Authorization'] = `Bearer ${CONFIG.API_KEY}`
      }

      const response = await fetch(`${CONFIG.API_URL}/api/admin/update-images`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        successCount += result.updatedCount || batch.length
        console.log(
          `  ✅ Batch ${Math.floor(i / batchSize) + 1}: Updated ${result.updatedCount || batch.length} pets`
        )
      } else {
        errorCount += batch.length
        console.error(
          `  ❌ Batch ${Math.floor(i / batchSize) + 1}: Failed with status ${response.status}`
        )
      }
    } catch (error) {
      errorCount += batch.length
      console.error(`  ❌ Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
    }

    // レート制限対策
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log(`\n✨ Update complete!`)
  console.log(`  ✅ Successfully updated: ${successCount} pets`)
  console.log(`  ❌ Failed to update: ${errorCount} pets`)
}

/**
 * レポート生成
 */
async function generateReport(inconsistencies) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const reportPath = path.join(__dirname, `sync-report-${timestamp}.json`)

  const report = {
    timestamp: new Date().toISOString(),
    config: {
      dryRun: CONFIG.DRY_RUN,
      limit: CONFIG.LIMIT,
      petType: CONFIG.PET_TYPE,
    },
    summary: {
      total: inconsistencies.length,
      missingInDB: inconsistencies.filter(
        (i) => (i.r2.hasJpeg && !i.db.hasJpeg) || (i.r2.hasWebp && !i.db.hasWebp)
      ).length,
      extraInDB: inconsistencies.filter(
        (i) => (!i.r2.hasJpeg && i.db.hasJpeg) || (!i.r2.hasWebp && i.db.hasWebp)
      ).length,
    },
    details: inconsistencies,
  }

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Report saved to: ${reportPath}`)
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔧 Image-DB Sync Fixer')
  console.log('='.repeat(50))
  console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Pet Type: ${CONFIG.PET_TYPE}`)
  console.log(`Limit: ${CONFIG.LIMIT}`)
  console.log('='.repeat(50) + '\n')

  try {
    // 1. R2から画像リストを取得
    const r2Images = await fetchR2Images()

    // 2. DBからペット情報を取得
    const dbPets = await fetchDBPets()

    // 3. 不整合を検出
    const inconsistencies = await detectInconsistencies(r2Images, dbPets)

    if (inconsistencies.length === 0) {
      console.log('\n✨ No inconsistencies found! Database is in sync with R2.')
      return
    }

    // 4. レポート生成
    await generateReport(inconsistencies)

    // 5. DBを更新
    await updateDatabase(inconsistencies)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// 環境変数チェック
if (!CONFIG.R2_ACCOUNT_ID || !CONFIG.R2_ACCESS_KEY_ID || !CONFIG.R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('  - R2_ACCOUNT_ID')
  console.error('  - R2_ACCESS_KEY_ID')
  console.error('  - R2_SECRET_ACCESS_KEY')
  console.error('\nExample usage:')
  console.error(
    '  R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx node fix-image-db-sync.js --dry-run'
  )
  process.exit(1)
}

// 実行
main().catch(console.error)
