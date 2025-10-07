#!/usr/bin/env node

/**
 * R2から孤立した画像（DBに存在しないペットの画像）を削除するスクリプト
 *
 * 使用方法:
 * ========
 *
 * 環境変数の設定:
 *   export R2_ACCOUNT_ID=xxx
 *   export R2_ACCESS_KEY_ID=xxx
 *   export R2_SECRET_ACCESS_KEY=xxx
 *   export R2_BUCKET_NAME=buddies-images  # オプション（デフォルト: buddies-images）
 *   export API_URL=https://buddies-api.elchika.app  # オプション
 *
 * または.env.localから読み込み:
 *   set -a && source .env.local && set +a
 *
 * 実行例:
 *   # ドライラン（削除対象の確認のみ、デフォルト）
 *   node scripts/patch/cleanup-orphaned-images.js
 *
 *   # 実際に削除を実行
 *   node scripts/patch/cleanup-orphaned-images.js --execute
 *
 * オプション:
 *   --execute : 実際に削除を実行（指定しない場合はドライラン）
 *
 * 動作:
 *   1. R2の全画像をスキャンしてペットIDを抽出
 *   2. DBの全ペットIDを取得
 *   3. DBに存在しないペットの画像を特定（孤立画像）
 *   4. --executeフラグがある場合のみ削除を実行
 *
 * 出力:
 *   - コンソールに削除対象と進捗を表示
 *   - cleanup-report-YYYY-MM-DDTHH-MM-SS.json にレポートを生成
 *   - 削除される容量（MB）を表示
 *
 * 注意:
 *   - 削除は取り消せません。必ずドライランで確認してから実行してください
 *   - バッチサイズは10ファイルずつ処理（レート制限対策）
 */

import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
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
  DRY_RUN: !process.argv.includes('--execute'),
  BATCH_SIZE: 10,
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
 * R2から全画像リストを取得
 */
async function fetchAllR2Images() {
  console.log('📥 Fetching all images from R2...')

  const images = []
  let continuationToken = undefined

  do {
    const command = new ListObjectsV2Command({
      Bucket: CONFIG.R2_BUCKET_NAME,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    })

    const response = await r2Client.send(command)

    if (response.Contents) {
      for (const object of response.Contents) {
        const key = object.Key

        // ペットIDを抽出
        let petId = null
        let type = null

        // パターン1: pets/dogs/pet-home_pethome_123456/original.jpg
        let match = key.match(/pets\/(dogs|cats)\/([^\/]+)\//)
        if (match) {
          type = match[1].slice(0, -1) // dogs -> dog
          petId = match[2]
        }

        // パターン2: dogs/originals/pet-home_pethome_123456.jpg
        if (!match) {
          match = key.match(/(dogs|cats)\/originals\/([^\.]+)\./)
          if (match) {
            type = match[1].slice(0, -1) // dogs -> dog
            petId = match[2]
          }
        }

        if (petId) {
          images.push({
            key,
            petId,
            type,
            size: object.Size,
            lastModified: object.LastModified,
          })
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  console.log(`  ✅ Found ${images.length} pet images in R2`)

  // ペットIDごとにグループ化
  const byPetId = {}
  for (const img of images) {
    if (!byPetId[img.petId]) {
      byPetId[img.petId] = []
    }
    byPetId[img.petId].push(img)
  }

  console.log(`  📊 Unique pet IDs in R2: ${Object.keys(byPetId).length}`)

  return { images, byPetId }
}

/**
 * DBから全ペットIDを取得
 */
async function fetchAllDBPetIds() {
  console.log('\n📊 Fetching all pet IDs from database...')

  const petIds = new Set()
  let offset = 0
  const limit = 100
  let maxIterations = 100 // 最大10000件

  while (maxIterations > 0) {
    const url = `${CONFIG.API_URL}/api/pets?limit=${limit}&offset=${offset}`

    try {
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
        data.data.pets.forEach((p) => petIds.add(p.id))
        fetchedCount = data.data.pets.length
      } else if (data.data.dogs || data.data.cats) {
        if (data.data.dogs) {
          data.data.dogs.forEach((p) => petIds.add(p.id))
          fetchedCount += data.data.dogs.length
        }
        if (data.data.cats) {
          data.data.cats.forEach((p) => petIds.add(p.id))
          fetchedCount += data.data.cats.length
        }
      }

      if (fetchedCount < limit) {
        break
      }

      offset += limit
      maxIterations--

      // 進捗表示
      if (offset % 1000 === 0) {
        console.log(`  Processing... ${petIds.size} pet IDs collected`)
      }
    } catch (error) {
      console.error(`  ❌ Error fetching pets: ${error.message}`)
      break
    }
  }

  console.log(`  ✅ Found ${petIds.size} pets in database`)

  return petIds
}

/**
 * 孤立画像を特定
 */
function identifyOrphanedImages(r2Data, dbPetIds) {
  console.log('\n🔍 Identifying orphaned images...')

  const orphaned = []

  for (const [petId, files] of Object.entries(r2Data.byPetId)) {
    if (!dbPetIds.has(petId)) {
      orphaned.push({
        petId,
        files,
      })
    }
  }

  console.log(
    `  ⚠️  Found ${orphaned.length} orphaned pet IDs with ${orphaned.reduce((sum, o) => sum + o.files.length, 0)} files`
  )

  return orphaned
}

/**
 * 画像を削除
 */
async function deleteImages(orphanedImages) {
  if (CONFIG.DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No files will be deleted')
    console.log('\n📋 Would delete the following files:')

    let displayCount = 0
    for (const orphan of orphanedImages) {
      if (displayCount >= 10) {
        console.log(`  ... and ${orphanedImages.length - 10} more pet IDs`)
        break
      }
      console.log(`  Pet ID: ${orphan.petId} (${orphan.files.length} files)`)
      for (const file of orphan.files) {
        console.log(`    - ${file.key} (${file.size} bytes)`)
      }
      displayCount++
    }

    console.log(
      `\n📊 Total files to delete: ${orphanedImages.reduce((sum, o) => sum + o.files.length, 0)}`
    )
    console.log('\n⚠️  To execute deletion, run with --execute flag')
    return
  }

  console.log('\n🗑️  Deleting orphaned images...')

  let successCount = 0
  let errorCount = 0
  const allFiles = orphanedImages.flatMap((o) => o.files)

  // バッチ処理
  for (let i = 0; i < allFiles.length; i += CONFIG.BATCH_SIZE) {
    const batch = allFiles.slice(i, i + CONFIG.BATCH_SIZE)

    const deletePromises = batch.map(async (file) => {
      try {
        const command = new DeleteObjectCommand({
          Bucket: CONFIG.R2_BUCKET_NAME,
          Key: file.key,
        })
        await r2Client.send(command)
        console.log(`  ✅ Deleted: ${file.key}`)
        return true
      } catch (error) {
        console.error(`  ❌ Failed to delete ${file.key}: ${error.message}`)
        return false
      }
    })

    const results = await Promise.all(deletePromises)
    successCount += results.filter((r) => r).length
    errorCount += results.filter((r) => !r).length

    // レート制限対策
    if (i + CONFIG.BATCH_SIZE < allFiles.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  console.log(`\n✨ Deletion complete!`)
  console.log(`  ✅ Successfully deleted: ${successCount} files`)
  console.log(`  ❌ Failed to delete: ${errorCount} files`)
}

/**
 * レポート生成
 */
async function generateReport(orphanedImages, totalSize) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const reportPath = path.join(__dirname, `cleanup-report-${timestamp}.json`)

  const report = {
    timestamp: new Date().toISOString(),
    mode: CONFIG.DRY_RUN ? 'DRY_RUN' : 'EXECUTE',
    summary: {
      orphanedPetIds: orphanedImages.length,
      totalFiles: orphanedImages.reduce((sum, o) => sum + o.files.length, 0),
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    },
    details: orphanedImages,
  }

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Report saved to: ${reportPath}`)
}

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 Orphaned Image Cleanup Tool')
  console.log('='.repeat(50))
  console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`)
  console.log('='.repeat(50) + '\n')

  try {
    // 1. R2から画像リストを取得
    const r2Data = await fetchAllR2Images()

    // 2. DBからペットIDを取得
    const dbPetIds = await fetchAllDBPetIds()

    // 3. 孤立画像を特定
    const orphanedImages = identifyOrphanedImages(r2Data, dbPetIds)

    if (orphanedImages.length === 0) {
      console.log('\n✨ No orphaned images found! R2 is clean.')
      return
    }

    // 総サイズ計算
    const totalSize = orphanedImages.reduce(
      (sum, o) => sum + o.files.reduce((s, f) => s + f.size, 0),
      0
    )

    console.log(`\n📊 Storage to be freed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)

    // 4. レポート生成
    await generateReport(orphanedImages, totalSize)

    // 5. 画像削除
    await deleteImages(orphanedImages)
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
  console.error('  # Dry run (default):')
  console.error('  node cleanup-orphaned-images.js')
  console.error('  # Execute deletion:')
  console.error('  node cleanup-orphaned-images.js --execute')
  process.exit(1)
}

// 実行
main().catch(console.error)
