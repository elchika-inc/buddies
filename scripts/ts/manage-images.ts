#!/usr/bin/env tsx

/**
 * 画像管理統合スクリプト
 * 対話的に画像処理タスクを実行します。
 */

import { execSync } from 'child_process'
import * as readline from 'readline'

// カラー定義
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
  magenta: '\x1b[0;35m',
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

function showBanner() {
  console.log(`${colors.magenta}`)
  console.log('╔════════════════════════════════════════════╗')
  console.log('║                                            ║')
  console.log('║       Buddies 画像管理ツール              ║')
  console.log('║                                            ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log(`${colors.reset}`)
}

function showMenu() {
  console.log()
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log(`${colors.blue}  メインメニュー${colors.reset}`)
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log()
  console.log(`  ${colors.green}1${colors.reset}) 画像ステータスを確認`)
  console.log(`  ${colors.green}2${colors.reset}) スクリーンショットを取得`)
  console.log(`  ${colors.green}3${colors.reset}) 画像を変換（WebP）`)
  console.log(`  ${colors.green}4${colors.reset}) GitHub Actions の状況を確認`)
  console.log(`  ${colors.green}5${colors.reset}) ヘルプ・ドキュメント`)
  console.log(`  ${colors.red}0${colors.reset}) 終了`)
  console.log()
  console.log(`${colors.blue}${'━'.repeat(44)}${colors.reset}`)
  console.log()
}

async function checkStatus() {
  console.log()
  try {
    execSync('tsx scripts/ts/check-image-status.ts', { stdio: 'inherit' })
  } catch (error) {
    console.log(`${colors.red}❌ ステータス確認に失敗しました${colors.reset}`)
  }
  await question('\nEnterキーを押して続行...')
}

async function triggerScreenshot() {
  console.log()
  console.log(`${colors.yellow}スクリーンショット取得${colors.reset}`)
  console.log()
  const limit = await question('取得するペット数を入力してください [デフォルト: 50]: ')
  const limitValue = limit.trim() || '50'

  console.log()
  try {
    execSync(`tsx scripts/ts/trigger-screenshot.ts ${limitValue}`, { stdio: 'inherit' })
  } catch (error) {
    console.log(`${colors.red}❌ スクリーンショットのトリガーに失敗しました${colors.reset}`)
  }
  await question('\nEnterキーを押して続行...')
}

async function triggerConversion() {
  console.log()
  console.log(`${colors.yellow}画像変換モード選択${colors.reset}`)
  console.log()
  console.log(`  ${colors.green}1${colors.reset}) 全ての画像を変換`)
  console.log(`  ${colors.green}2${colors.reset}) WebPがない画像のみ変換`)
  console.log(`  ${colors.green}3${colors.reset}) JPEGがない画像のみ変換`)
  console.log()

  const modeChoice = await question('モードを選択してください [1-3]: ')

  let mode: string
  switch (modeChoice.trim()) {
    case '1':
      mode = 'all'
      break
    case '2':
      mode = 'missing-webp'
      break
    case '3':
      mode = 'missing-jpeg'
      break
    default:
      console.log(`${colors.red}無効な選択です${colors.reset}`)
      await question('\nEnterキーを押して続行...')
      return
  }

  console.log()
  const limit = await question('変換するペット数を入力してください [デフォルト: 50]: ')
  const limitValue = limit.trim() || '50'

  console.log()
  try {
    execSync(`tsx scripts/ts/trigger-conversion.ts ${mode} ${limitValue}`, {
      stdio: 'inherit',
    })
  } catch (error) {
    console.log(`${colors.red}❌ 画像変換のトリガーに失敗しました${colors.reset}`)
  }
  await question('\nEnterキーを押して続行...')
}

async function checkGitHubActions() {
  console.log()
  console.log(`${colors.yellow}GitHub Actions 実行状況${colors.reset}`)
  console.log()

  try {
    execSync('gh --version', { stdio: 'ignore' })

    console.log(`${colors.cyan}${'━'.repeat(44)}${colors.reset}`)
    console.log(`${colors.cyan}  スクリーンショット取得ワークフロー${colors.reset}`)
    console.log(`${colors.cyan}${'━'.repeat(44)}${colors.reset}`)
    execSync('gh run list --workflow=screenshot-capture.yml --limit 5', {
      stdio: 'inherit',
    })

    console.log()
    console.log(`${colors.cyan}${'━'.repeat(44)}${colors.reset}`)
    console.log(`${colors.cyan}  画像変換ワークフロー${colors.reset}`)
    console.log(`${colors.cyan}${'━'.repeat(44)}${colors.reset}`)
    execSync('gh run list --workflow=image-conversion.yml --limit 5', { stdio: 'inherit' })

    console.log()
    console.log(`${colors.yellow}💡 ヒント:${colors.reset}`)
    console.log(
      `  ワークフローの詳細を確認: ${colors.green}gh run view <RUN_ID>${colors.reset}`
    )
    console.log(`  リアルタイムログ監視: ${colors.green}gh run watch <RUN_ID>${colors.reset}`)
  } catch {
    console.log(`${colors.red}❌ GitHub CLIがインストールされていません${colors.reset}`)
    console.log('インストール: https://cli.github.com/')
  }

  await question('\nEnterキーを押して続行...')
}

function showHelp() {
  console.log()
  console.log(`${colors.cyan}${'━'.repeat(44)}${colors.reset}`)
  console.log(`${colors.cyan}  ヘルプ・ドキュメント${colors.reset}`)
  console.log(`${colors.cyan}${'━'.repeat(44)}${colors.reset}`)
  console.log()
  console.log(`${colors.yellow}利用可能なnpmコマンド:${colors.reset}`)
  console.log()
  console.log(`  ${colors.green}npm run images${colors.reset}`)
  console.log(`    対話型UI（このツール）`)
  console.log()
  console.log(`  ${colors.green}npm run images:status${colors.reset}`)
  console.log(`    画像ステータスを確認`)
  console.log()
  console.log(`  ${colors.green}npm run images:screenshot [件数]${colors.reset}`)
  console.log(`    スクリーンショット取得をトリガー`)
  console.log(`    例: npm run images:screenshot 50`)
  console.log()
  console.log(`  ${colors.green}npm run images:convert [モード] [件数]${colors.reset}`)
  console.log(`    画像変換をトリガー`)
  console.log(`    モード: all, missing-webp, missing-jpeg`)
  console.log(`    例: npm run images:convert missing-webp 30`)
  console.log()
  console.log(`${colors.yellow}ドキュメント:${colors.reset}`)
  console.log(`  ${colors.blue}__docs__/MANUAL_TRIGGER_GUIDE.md${colors.reset} - 詳細な手順ガイド`)
  console.log(
    `  ${colors.blue}__docs__/API_ENDPOINTS.md${colors.reset} - APIエンドポイント一覧`
  )
  console.log()
}

async function main() {
  showBanner()

  while (true) {
    showMenu()
    const choice = await question('選択してください [0-5]: ')

    switch (choice.trim()) {
      case '1':
        await checkStatus()
        break
      case '2':
        await triggerScreenshot()
        break
      case '3':
        await triggerConversion()
        break
      case '4':
        await checkGitHubActions()
        break
      case '5':
        showHelp()
        await question('\nEnterキーを押して続行...')
        break
      case '0':
        console.log()
        console.log(`${colors.green}終了します${colors.reset}`)
        console.log()
        rl.close()
        process.exit(0)
      default:
        console.log()
        console.log(`${colors.red}無効な選択です。もう一度選んでください。${colors.reset}`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        break
    }
  }
}

main().catch((error) => {
  console.error(`${colors.red}エラー:${colors.reset}`, error)
  rl.close()
  process.exit(1)
})
