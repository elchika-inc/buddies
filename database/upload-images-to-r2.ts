#!/usr/bin/env tsx
/**
 * 画像をR2にアップロードするスクリプト
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_BASE_URL = 'http://localhost:9789'
const API_KEY = 'b80f83e113c5463a811607a30afd133dbb0b3c39a0eb41ebac716e29eeda27fb'
const IMAGES_DIR = path.join(__dirname, 'fixtures/images')

interface UploadResult {
  petId: string
  success: boolean
  error?: string
}

async function uploadImage(petId: string, petType: 'dog' | 'cat', imagePath: string): Promise<UploadResult> {
  try {
    const imageBuffer = fs.readFileSync(imagePath)
    const blob = new Blob([imageBuffer], { type: 'image/png' })

    const formData = new FormData()
    formData.append('image', blob, path.basename(imagePath))
    formData.append('type', 'original')

    const response = await fetch(`${API_BASE_URL}/api/images/upload/${petId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { petId, success: false, error: `Upload failed: ${response.status} ${errorText}` }
    }

    return { petId, success: true }
  } catch (error) {
    return {
      petId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function main() {
  console.log('🚀 画像をR2にアップロード中...\n')

  const results: UploadResult[] = []

  // 犬の画像
  const dogsDir = path.join(IMAGES_DIR, 'dogs')
  const dogFiles = fs.readdirSync(dogsDir).filter(f => f.endsWith('.png'))

  console.log(`📸 犬の画像: ${dogFiles.length}枚`)
  for (const file of dogFiles) {
    const petId = file.replace('.png', '')
    const imagePath = path.join(dogsDir, file)
    const result = await uploadImage(petId, 'dog', imagePath)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ ${petId}`)
    } else {
      console.log(`  ❌ ${petId}: ${result.error}`)
    }
  }

  // 猫の画像
  const catsDir = path.join(IMAGES_DIR, 'cats')
  const catFiles = fs.readdirSync(catsDir).filter(f => f.endsWith('.png'))

  console.log(`\n📸 猫の画像: ${catFiles.length}枚`)
  for (const file of catFiles) {
    const petId = file.replace('.png', '')
    const imagePath = path.join(catsDir, file)
    const result = await uploadImage(petId, 'cat', imagePath)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ ${petId}`)
    } else {
      console.log(`  ❌ ${petId}: ${result.error}`)
    }
  }

  // サマリー
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log('\n📊 サマリー:')
  console.log(`  ✅ 成功: ${successful}枚`)
  if (failed > 0) {
    console.log(`  ❌ 失敗: ${failed}枚`)
  }
  console.log('')
}

main().catch(console.error)
