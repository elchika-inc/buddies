#!/usr/bin/env tsx

/**
 * スクリーンショット取得手動トリガースクリプト
 */

import { execSync } from 'child_process'

// カラー定義
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
}

// 設定
const API_URL = process.env.API_URL || 'https://buddies-api.elchika.app'
const API_KEY = process.env.API_KEY || 'admin_sk_super_secure_admin_key_2024'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin_sk_super_secure_admin_key_2024'
const DEFAULT_LIMIT = 50

async function main() {
  const limit = parseInt(process.argv[2] || String(DEFAULT_LIMIT), 10)

  if (isNaN(limit) || limit <= 0) {
    console.log(`${colors.red}❌ エラー: limitは正の数値である必要があります${colors.reset}`)
    console.log('使用方法: npm run images:screenshot [件数]')
    process.exit(1)
  }

  if (limit > 200) {
    console.log(`${colors.yellow}⚠️  警告: limit が大きすぎます (最大200推奨)${colors.reset}`)
  }

  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log(`${colors.blue}  スクリーンショット取得トリガー${colors.reset}`)
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log()

  // ステップ1: 画像がないペット数を確認
  console.log(`${colors.yellow}📊 画像がないペット数を確認中...${colors.reset}`)

  const petsResponse = await fetch(`${API_URL}/api/pets?limit=200`, {
    headers: { 'X-API-Key': API_KEY },
  })

  if (!petsResponse.ok) {
    console.log(`${colors.red}❌ ペット数の取得に失敗しました${colors.reset}`)
    process.exit(1)
  }

  const petsData = await petsResponse.json()
  const allPets = [...(petsData.data.dogs || []), ...(petsData.data.cats || [])]
  const petsWithoutScreenshot = allPets.filter((p: any) => !p.screenshotCompletedAt)
  const petsCount = petsWithoutScreenshot.length

  console.log(`${colors.green}✅ 画像がないペット: ${petsCount}件${colors.reset}`)
  console.log()

  if (petsCount === 0) {
    console.log(`${colors.green}✅ 全てのペットに画像があります${colors.reset}`)
    process.exit(0)
  }

  const actualLimit = Math.min(limit, petsCount)
  console.log(`${colors.blue}📸 ${actualLimit}件のペットのスクリーンショットを取得します${colors.reset}`)
  console.log()

  // ステップ2: スクリーンショットをトリガー
  console.log(`${colors.yellow}🚀 スクリーンショット処理をトリガー中...${colors.reset}`)

  const response = await fetch(`${API_URL}/api/admin/trigger-screenshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-Admin-Secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ limit }),
  })

  const result = await response.json()

  if (!result.success) {
    console.log(`${colors.red}❌ エラー: スクリーンショットのトリガーに失敗しました${colors.reset}`)
    console.log(JSON.stringify(result, null, 2))
    process.exit(1)
  }

  console.log(`${colors.green}✅ スクリーンショット処理がトリガーされました！${colors.reset}`)
  console.log()
  console.log(`${colors.blue}📋 処理情報:${colors.reset}`)
  console.log(`  Batch ID: ${colors.green}${result.data.batchId}${colors.reset}`)
  console.log(`  戦略: ${colors.green}${result.data.strategy}${colors.reset}`)
  console.log(`  ペット数: ${colors.green}${result.data.petCount}件${colors.reset}`)
  console.log()

  // ステップ3: GitHub Actionsの状況を確認
  console.log(`${colors.yellow}🔍 GitHub Actionsの実行状況を確認中...${colors.reset}`)

  try {
    execSync('gh --version', { stdio: 'ignore' })

    // 少し待つ
    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log()
    console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
    console.log(`${colors.blue}  最近のワークフロー実行${colors.reset}`)
    console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)

    try {
      const runs = execSync('gh run list --workflow=screenshot-capture.yml --limit 3', {
        encoding: 'utf-8',
      })
      console.log(runs)
    } catch {
      console.log('ワークフロー情報の取得に失敗しました')
    }

    // 最新のRUN_IDを取得
    try {
      const latestRunId = execSync(
        'gh run list --workflow=screenshot-capture.yml --limit 1 --json databaseId --jq ".[0].databaseId"',
        { encoding: 'utf-8' }
      ).trim()

      if (latestRunId) {
        console.log(`${colors.yellow}💡 ヒント: 以下のコマンドでリアルタイムログを監視できます:${colors.reset}`)
        console.log(`  ${colors.green}gh run watch ${latestRunId}${colors.reset}`)
        console.log()
        console.log(`${colors.yellow}💡 ワークフローの詳細を確認:${colors.reset}`)
        console.log(`  ${colors.green}gh run view ${latestRunId}${colors.reset}`)
      }
    } catch {
      // Ignore
    }
  } catch {
    console.log(`${colors.yellow}⚠️  GitHub CLIがインストールされていません${colors.reset}`)
    console.log('GitHub Actionsの状況は https://github.com/elchika-inc/pawmatch/actions で確認してください')
  }

  console.log()
  console.log(`${colors.green}✅ 完了しました！${colors.reset}`)
  console.log()
}

main().catch((error) => {
  console.error(`${colors.red}エラー:${colors.reset}`, error)
  process.exit(1)
})
