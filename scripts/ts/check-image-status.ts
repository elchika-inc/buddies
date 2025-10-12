#!/usr/bin/env tsx

/**
 * 画像ステータス確認スクリプト
 * ペットの画像ステータスを確認し、統計情報を表示します。
 */

import { execSync } from 'child_process'

// カラー定義
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
}

// 設定
const API_URL = process.env.API_URL || 'https://buddies-api.elchika.app'
const API_KEY = process.env.API_KEY || 'admin_sk_super_secure_admin_key_2024'

interface PetData {
  id: string
  type: 'dog' | 'cat'
  name: string
  screenshotCompletedAt: string | null
  hasWebp: boolean
  hasJpeg: boolean
}

interface ApiResponse {
  success: boolean
  data: {
    dogs: PetData[]
    cats: PetData[]
  }
}

async function fetchPets(): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/api/pets?limit=200`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  return response.json()
}

function printHeader(title: string) {
  console.log(`${colors.cyan}${'━'.repeat(44)}${colors.reset}`)
  console.log(`${colors.cyan}  ${title}${colors.reset}`)
  console.log(`${colors.cyan}${'━'.repeat(44)}${colors.reset}`)
}

function printRow(label: string, dogs: number, cats: number, total: number, color = '') {
  const reset = color ? colors.reset : ''
  console.log(
    `${label.padEnd(20)} ${color}${dogs.toString().padStart(10)}${reset} ${color}${cats.toString().padStart(10)}${reset} ${color}${total.toString().padStart(10)}${reset}`
  )
}

async function main() {
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log(`${colors.blue}  ペット画像ステータス確認${colors.reset}`)
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log()

  console.log(`${colors.yellow}📊 ペット情報を取得中...${colors.reset}`)

  let data: ApiResponse
  try {
    data = await fetchPets()
  } catch (error) {
    console.log(
      `${colors.red}❌ ペット情報の取得に失敗しました${colors.reset}`
    )
    console.error(error)
    process.exit(1)
  }

  const dogs = data.data.dogs || []
  const cats = data.data.cats || []
  const allPets = [...dogs, ...cats]

  // 統計計算
  const totalDogs = dogs.length
  const totalCats = cats.length
  const totalPets = allPets.length

  const dogsWithoutScreenshot = dogs.filter((p) => !p.screenshotCompletedAt).length
  const catsWithoutScreenshot = cats.filter((p) => !p.screenshotCompletedAt).length
  const totalWithoutScreenshot = dogsWithoutScreenshot + catsWithoutScreenshot

  const dogsWithScreenshot = totalDogs - dogsWithoutScreenshot
  const catsWithScreenshot = totalCats - catsWithoutScreenshot
  const totalWithScreenshot = totalPets - totalWithoutScreenshot

  const dogsWithoutWebp = dogs.filter((p) => !p.hasWebp).length
  const catsWithoutWebp = cats.filter((p) => !p.hasWebp).length
  const totalWithoutWebp = dogsWithoutWebp + catsWithoutWebp

  const dogsWithWebp = totalDogs - dogsWithoutWebp
  const catsWithWebp = totalCats - catsWithoutWebp
  const totalWithWebp = totalPets - totalWithoutWebp

  const dogsWithoutJpeg = dogs.filter((p) => !p.hasJpeg).length
  const catsWithoutJpeg = cats.filter((p) => !p.hasJpeg).length
  const totalWithoutJpeg = dogsWithoutJpeg + catsWithoutJpeg

  const dogsWithJpeg = totalDogs - dogsWithoutJpeg
  const catsWithJpeg = totalCats - catsWithoutJpeg
  const totalWithJpeg = totalPets - totalWithoutJpeg

  console.log(`${colors.green}✅ ペット情報を取得しました${colors.reset}`)
  console.log()

  // 全体統計
  printHeader('全体統計')
  console.log(''.padEnd(20) + '犬'.padStart(10) + '猫'.padStart(10) + '合計'.padStart(10))
  console.log('─'.repeat(44))
  printRow('ペット総数', totalDogs, totalCats, totalPets, colors.green)
  console.log()

  // スクリーンショット
  printHeader('スクリーンショット')
  console.log(''.padEnd(20) + '犬'.padStart(10) + '猫'.padStart(10) + '合計'.padStart(10))
  console.log('─'.repeat(44))
  printRow('取得済み', dogsWithScreenshot, catsWithScreenshot, totalWithScreenshot, colors.green)
  printRow('未取得', dogsWithoutScreenshot, catsWithoutScreenshot, totalWithoutScreenshot, colors.red)
  if (totalPets > 0) {
    const percentage = Math.floor((totalWithScreenshot * 100) / totalPets)
    console.log(`${'完了率'.padEnd(20)} ${colors.blue}${percentage.toString().padStart(29)}%${colors.reset}`)
  }
  console.log()

  // WebP画像
  printHeader('WebP画像')
  console.log(''.padEnd(20) + '犬'.padStart(10) + '猫'.padStart(10) + '合計'.padStart(10))
  console.log('─'.repeat(44))
  printRow('変換済み', dogsWithWebp, catsWithWebp, totalWithWebp, colors.green)
  printRow('未変換', dogsWithoutWebp, catsWithoutWebp, totalWithoutWebp, colors.red)
  if (totalPets > 0) {
    const percentage = Math.floor((totalWithWebp * 100) / totalPets)
    console.log(`${'変換率'.padEnd(20)} ${colors.blue}${percentage.toString().padStart(29)}%${colors.reset}`)
  }
  console.log()

  // JPEG画像
  printHeader('JPEG画像')
  console.log(''.padEnd(20) + '犬'.padStart(10) + '猫'.padStart(10) + '合計'.padStart(10))
  console.log('─'.repeat(44))
  printRow('保存済み', dogsWithJpeg, catsWithJpeg, totalWithJpeg, colors.green)
  printRow('未保存', dogsWithoutJpeg, catsWithoutJpeg, totalWithoutJpeg, colors.red)
  if (totalPets > 0) {
    const percentage = Math.floor((totalWithJpeg * 100) / totalPets)
    console.log(`${'保存率'.padEnd(20)} ${colors.blue}${percentage.toString().padStart(29)}%${colors.reset}`)
  }
  console.log()

  // 推奨アクション
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log(`${colors.blue}  推奨アクション${colors.reset}`)
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)

  if (totalWithoutScreenshot > 0) {
    console.log(
      `${colors.yellow}📸 スクリーンショットが必要なペット: ${totalWithoutScreenshot}件${colors.reset}`
    )
    console.log(
      `   実行: ${colors.green}npm run images:screenshot ${totalWithoutScreenshot}${colors.reset}`
    )
    console.log()
  }

  if (totalWithoutWebp > 0) {
    console.log(
      `${colors.yellow}🖼️  WebP変換が必要なペット: ${totalWithoutWebp}件${colors.reset}`
    )
    console.log(
      `   実行: ${colors.green}npm run images:convert missing-webp ${totalWithoutWebp}${colors.reset}`
    )
    console.log()
  }

  if (totalWithoutScreenshot === 0 && totalWithoutWebp === 0) {
    console.log(`${colors.green}✅ 全てのペットに画像があります！${colors.reset}`)
    console.log()
  }

  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log()

  // 画像がないペットのIDを表示（10件まで）
  if (totalWithoutScreenshot > 0 && totalWithoutScreenshot <= 10) {
    console.log(`${colors.yellow}📋 スクリーンショットが必要なペット:${colors.reset}`)
    allPets
      .filter((p) => !p.screenshotCompletedAt)
      .forEach((p) => {
        console.log(`  - ${p.id} (${p.type}): ${p.name}`)
      })
    console.log()
  }
}

main().catch((error) => {
  console.error(`${colors.red}エラー:${colors.reset}`, error)
  process.exit(1)
})
