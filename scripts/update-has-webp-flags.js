#!/usr/bin/env node

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// APIエンドポイント（環境変数から取得）
const API_URL = process.env.API_URL || 'https://pawmatch-api.elchika.app'
const API_ADMIN_SECRET = process.env.API_ADMIN_SECRET || ''

async function updateHasWebpFlags() {
  console.log('🚀 Updating has_webp flags based on conversion results')
  console.log('====================================================')

  // logsディレクトリ内の最新の変換結果ファイルを探す
  const logDir = path.join(__dirname, 'logs')

  try {
    const files = await fs.readdir(logDir)
    const conversionFiles = files.filter((f) => f.startsWith('originals-conversion-'))

    if (conversionFiles.length === 0) {
      console.error('❌ No conversion result files found in logs directory')
      return
    }

    // 最新のファイルを選択
    conversionFiles.sort()
    const latestFile = conversionFiles[conversionFiles.length - 1]
    const resultPath = path.join(logDir, latestFile)

    console.log(`📂 Reading conversion results from: ${latestFile}`)

    // 結果ファイルを読み込む
    const resultsData = JSON.parse(await fs.readFile(resultPath, 'utf8'))

    // 成功した変換のペットIDを抽出
    const successfulConversions = resultsData.results
      .filter((r) => r && r.success)
      .map((r) => ({
        pet_id: r.pet_id,
        pet_type: r.pet_type,
        webpKey: r.webpKey,
      }))

    console.log(`✅ Found ${successfulConversions.length} successful conversions`)

    // ペットタイプごとにグループ化
    const catIds = successfulConversions.filter((c) => c.pet_type === 'cats').map((c) => c.pet_id)

    const dogIds = successfulConversions.filter((c) => c.pet_type === 'dogs').map((c) => c.pet_id)

    console.log(`  🐱 Cats: ${catIds.length}`)
    console.log(`  🐕 Dogs: ${dogIds.length}`)

    // バッチサイズ
    const BATCH_SIZE = 50

    // API経由でフラグを更新
    let totalUpdated = 0

    // Catsの更新
    if (catIds.length > 0) {
      console.log('\n🐱 Updating cat records...')
      for (let i = 0; i < catIds.length; i += BATCH_SIZE) {
        const batch = catIds.slice(i, i + BATCH_SIZE)
        const updated = await updateBatch('cat', batch)
        totalUpdated += updated

        const progress = Math.min(i + BATCH_SIZE, catIds.length)
        console.log(`  Progress: ${progress}/${catIds.length}`)
      }
    }

    // Dogsの更新
    if (dogIds.length > 0) {
      console.log('\n🐕 Updating dog records...')
      for (let i = 0; i < dogIds.length; i += BATCH_SIZE) {
        const batch = dogIds.slice(i, i + BATCH_SIZE)
        const updated = await updateBatch('dog', batch)
        totalUpdated += updated

        const progress = Math.min(i + BATCH_SIZE, dogIds.length)
        console.log(`  Progress: ${progress}/${dogIds.length}`)
      }
    }

    // 結果サマリー
    console.log('\n📊 Update Summary:')
    console.log('==================')
    console.log(`  Total records updated: ${totalUpdated}`)
    console.log(`  Conversion results processed: ${successfulConversions.length}`)

    if (totalUpdated < successfulConversions.length) {
      console.log(`  ⚠️ Some records may not have been updated`)
      console.log(`     This could be because the pets don't exist in the database`)
    }

    // 更新ログを保存
    const updateLogPath = path.join(logDir, `webp-flag-update-${Date.now()}.json`)
    await fs.writeFile(
      updateLogPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          conversionFile: latestFile,
          totalConversions: successfulConversions.length,
          catsUpdated: catIds.length,
          dogsUpdated: dogIds.length,
          totalUpdated,
          petIds: {
            cats: catIds,
            dogs: dogIds,
          },
        },
        null,
        2
      )
    )

    console.log(`\n📁 Update log saved to: ${updateLogPath}`)
    console.log('✨ has_webp flags update completed!')
  } catch (error) {
    console.error('❌ Error updating flags:', error)
    process.exit(1)
  }
}

// バッチでAPIを呼び出してフラグを更新
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
          has_jpeg: true, // originalsフォルダにある画像はJPEG
        },
      }),
    })

    if (!response.ok) {
      console.error(`  ❌ API request failed: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`     ${errorText}`)
      return 0
    }

    const result = await response.json()
    return result.updated || 0
  } catch (error) {
    console.error(`  ❌ Failed to update batch:`, error.message)
    return 0
  }
}

// 直接実行の場合
if (import.meta.url === `file://${process.argv[1]}`) {
  updateHasWebpFlags().catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { updateHasWebpFlags }
