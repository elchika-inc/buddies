#!/usr/bin/env tsx

/**
 * 画像変換手動トリガースクリプト
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

const DEFAULT_MODE = 'all'
const DEFAULT_LIMIT = 50

type ConversionMode = 'all' | 'missing-webp' | 'missing-jpeg'

async function main() {
  const mode = (process.argv[2] || DEFAULT_MODE) as ConversionMode
  const limit = parseInt(process.argv[3] || String(DEFAULT_LIMIT), 10)

  // モードの検証
  if (!['all', 'missing-webp', 'missing-jpeg'].includes(mode)) {
    console.log(`${colors.red}❌ エラー: 無効なモードです${colors.reset}`)
    console.log('使用可能なモード: all, missing-webp, missing-jpeg')
    process.exit(1)
  }

  // limitの検証
  if (isNaN(limit) || limit <= 0) {
    console.log(`${colors.red}❌ エラー: limitは正の数値である必要があります${colors.reset}`)
    console.log('使用方法: npm run images:convert [モード] [件数]')
    process.exit(1)
  }

  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log(`${colors.blue}  画像変換トリガー${colors.reset}`)
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log()
  console.log(`${colors.blue}モード: ${colors.green}${mode}${colors.reset}`)
  console.log(`${colors.blue}件数: ${colors.green}${limit}${colors.reset}`)
  console.log()

  // GitHub Actionsワークフローをトリガー
  console.log(`${colors.yellow}🚀 画像変換ワークフローをトリガー中...${colors.reset}`)

  try {
    execSync('gh --version', { stdio: 'ignore' })

    execSync(
      `gh workflow run image-conversion.yml -f conversion_mode="${mode}" -f limit="${limit}" -f source=manual`,
      { stdio: 'inherit' }
    )

    console.log(`${colors.green}✅ 画像変換ワークフローがトリガーされました！${colors.reset}`)
    console.log()

    // 少し待つ
    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
    console.log(`${colors.blue}  最近のワークフロー実行${colors.reset}`)
    console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)

    try {
      const runs = execSync('gh run list --workflow=image-conversion.yml --limit 3', {
        encoding: 'utf-8',
      })
      console.log(runs)
    } catch {
      console.log('ワークフロー情報の取得に失敗しました')
    }

    // 最新のRUN_IDを取得
    try {
      const latestRunId = execSync(
        'gh run list --workflow=image-conversion.yml --limit 1 --json databaseId --jq ".[0].databaseId"',
        { encoding: 'utf-8' }
      ).trim()

      if (latestRunId) {
        console.log()
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
    console.log(`${colors.red}❌ エラー: GitHub CLIがインストールされていません${colors.reset}`)
    console.log('GitHub CLIをインストールしてください: https://cli.github.com/')
    process.exit(1)
  }

  console.log()
  console.log(`${colors.green}✅ 完了しました！${colors.reset}`)
  console.log()
}

main().catch((error) => {
  console.error(`${colors.red}エラー:${colors.reset}`, error)
  process.exit(1)
})
