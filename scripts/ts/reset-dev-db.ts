#!/usr/bin/env tsx

/**
 * Buddies API 開発環境DBリセットスクリプト
 * 開発用データベースを完全にリセット
 *
 * Usage:
 *   npm run db:reset        - 簡易リセット（SQLiteファイル削除 + push）
 *   npm run db:reset:full   - 完全リセット（テーブル削除 + キャッシュクリア + マイグレーション）
 */

import { parseArgs, confirm, showHelp } from './utils/cli.js'
import {
  colors,
  success,
  error,
  warning,
  info,
  header,
  colorize,
} from './utils/colors.js'
import {
  getAllTables,
  dropTable,
  deleteLocalD1Files,
  clearWranglerCache,
  runMigration,
  execWranglerD1,
} from './utils/db.js'
import { runParallelWithProgress } from './utils/parallel.js'

const HELP_TEXT = `
使用方法: tsx reset-dev-db.ts [OPTIONS]

オプション:
  --quick       簡易リセット（SQLiteファイル削除のみ、高速）
  --full        完全リセット（テーブル削除 + キャッシュクリア + マイグレーション）
  --yes, -y     確認プロンプトをスキップ
  -h, --help    ヘルプを表示

デフォルト: --full

例:
  npm run db:reset        # 簡易リセット（--quick）
  npm run db:reset:full   # 完全リセット
`

interface ResetOptions {
  quick: boolean
  full: boolean
  skipConfirm: boolean
}

/**
 * 簡易リセット: SQLiteファイルを削除
 */
async function quickReset(): Promise<void> {
  info('SQLiteファイルを削除中...')
  deleteLocalD1Files()
  success('SQLiteファイルを削除しました')
  console.log()
  info('次のコマンドでスキーマを再作成してください:')
  console.log(`  ${colorize('npm run db:push', 'cyan')}`)
}

/**
 * 完全リセット: テーブル削除 + キャッシュクリア + マイグレーション
 */
async function fullReset(): Promise<void> {
  // ステップ1: 全テーブル削除
  console.log(`${colors.yellow}🧹 全テーブルを削除中...${colors.reset}`)
  const tables = getAllTables()

  if (tables.length > 0) {
    console.log(`  削除対象: ${tables.length}テーブル\n`)

    const tasks = tables.map((table) => ({
      name: table,
      task: async () => {
        return new Promise<void>((resolve, reject) => {
          try {
            dropTable(table)
            resolve()
          } catch (err) {
            reject(err)
          }
        })
      },
    }))

    // 並列削除
    const results = await runParallelWithProgress(tasks, (completed, total, name) => {
      console.log(`  ${colorize(`[${completed}/${total}]`, 'green')} ${name}`)
    })

    const failures = results.filter((r) => !r.success)
    if (failures.length > 0) {
      warning(`${failures.length}個のテーブル削除に失敗しました`)
    } else {
      success('全テーブル削除完了')
    }
  } else {
    warning('削除するテーブルがありません')
  }
  console.log()

  // ステップ2: Wranglerキャッシュクリア
  info('Wranglerキャッシュをクリア中...')
  clearWranglerCache()
  success('キャッシュクリア完了')
  console.log()

  // ステップ3: マイグレーション実行
  info('マイグレーションを実行中...')
  try {
    runMigration()
    success('マイグレーション完了')
  } catch (err) {
    error('マイグレーション実行に失敗しました')
    throw err
  }
  console.log()

  // ステップ4: 結果確認
  info('テーブル一覧を確認中...')
  try {
    const result = execWranglerD1(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    )
    console.log(result)
  } catch (err) {
    warning('テーブル一覧の取得に失敗しました')
  }
}

/**
 * メイン処理
 */
async function main() {
  const args = parseArgs()

  if (args.h || args.help) {
    showHelp(HELP_TEXT)
  }

  const options: ResetOptions = {
    quick: Boolean(args.quick),
    full: Boolean(args.full),
    skipConfirm: Boolean(args.yes || args.y),
  }

  // オプション未指定の場合は --full
  if (!options.quick && !options.full) {
    options.full = true
  }

  header('開発用データベースリセット', 'red')

  // 確認プロンプト
  if (!options.skipConfirm) {
    const confirmed = await confirm(
      `${colorize('本当にデータベースをリセットしますか?', 'red')}`,
      false
    )
    if (!confirmed) {
      warning('キャンセルしました')
      process.exit(0)
    }
    console.log()
  }

  try {
    if (options.quick) {
      await quickReset()
    } else {
      await fullReset()
    }

    console.log()
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    success('データベースリセット完了！')
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log()
    info('APIを再起動して動作確認してください')
    console.log(`  ${colorize('npm run dev:api', 'cyan')}`)
  } catch (err) {
    console.log()
    error('データベースリセットに失敗しました')
    if (err instanceof Error) {
      console.error(err.message)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`${colors.red}エラーが発生しました:${colors.reset}`, err)
  process.exit(1)
})
