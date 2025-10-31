#!/usr/bin/env tsx

/**
 * プロジェクトのクリーンアップスクリプト
 * 各種ビルド成果物、キャッシュ、依存関係を削除
 *
 * Usage:
 *   npm run clean:wrangler   - Wranglerの一時ファイルを削除
 *   npm run clean:dist       - ビルド成果物を削除
 *   npm run clean:cache      - キャッシュファイルを削除
 *   npm run clean:deps       - node_modulesを削除
 *   npm run clean:all        - 上記すべてを並列削除
 */

import * as fs from 'fs'
import * as path from 'path'
import { parseArgs, showHelp } from './utils/cli.js'
import { colors, success, info, warning, header } from './utils/colors.js'
import { runParallelWithProgress } from './utils/parallel.js'

const HELP_TEXT = `
使用方法: npm run clean [OPTIONS]

オプション:
  --wrangler    .wranglerディレクトリを削除
  --dist        distディレクトリを削除
  --cache       .next, coverageディレクトリを削除
  --deps        node_modulesディレクトリを削除
  --all         上記すべてを並列削除（デフォルト）
  -h, --help    ヘルプを表示

例:
  npm run clean:wrangler
  npm run clean:all
`

interface CleanOptions {
  wrangler: boolean
  dist: boolean
  cache: boolean
  deps: boolean
  all: boolean
}

/**
 * 指定パターンのディレクトリを検索して削除
 */
async function deleteDirectories(
  patterns: string[],
  excludePatterns: string[] = ['node_modules']
): Promise<{ deleted: number; size: number }> {
  const rootDir = process.cwd()
  let deleted = 0
  let totalSize = 0

  function findAndDelete(dir: string): void {
    if (!fs.existsSync(dir)) {
      return
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      // 除外パターンに該当する場合はスキップ
      if (excludePatterns.some((pattern) => fullPath.includes(pattern))) {
        continue
      }

      if (entry.isDirectory()) {
        // パターンに該当する場合は削除
        if (patterns.includes(entry.name)) {
          const size = getDirectorySize(fullPath)
          fs.rmSync(fullPath, { recursive: true, force: true })
          deleted++
          totalSize += size
        } else {
          // 再帰的に探索
          findAndDelete(fullPath)
        }
      }
    }
  }

  findAndDelete(rootDir)
  return { deleted, size: totalSize }
}

/**
 * ディレクトリのサイズを取得（バイト）
 */
function getDirectorySize(dir: string): number {
  let size = 0

  if (!fs.existsSync(dir)) {
    return 0
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      size += getDirectorySize(fullPath)
    } else {
      const stats = fs.statSync(fullPath)
      size += stats.size
    }
  }

  return size
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}

/**
 * クリーンアップ実行
 */
async function runCleanup(options: CleanOptions): Promise<void> {
  header('プロジェクトクリーンアップ', 'yellow')

  const tasks = []

  if (options.all || options.wrangler) {
    tasks.push({
      name: 'Wrangler一時ファイル',
      task: async () => deleteDirectories(['.wrangler']),
    })
  }

  if (options.all || options.dist) {
    tasks.push({
      name: 'ビルド成果物',
      task: async () => deleteDirectories(['dist']),
    })
  }

  if (options.all || options.cache) {
    tasks.push({
      name: 'キャッシュファイル',
      task: async () => deleteDirectories(['.next', 'coverage']),
    })
  }

  if (options.all || options.deps) {
    tasks.push({
      name: '依存関係',
      task: async () => {
        // node_modulesは特別扱い（除外パターンを空にする）
        const rootNodeModules = path.join(process.cwd(), 'node_modules')
        let totalSize = 0
        let deleted = 0

        if (fs.existsSync(rootNodeModules)) {
          totalSize = getDirectorySize(rootNodeModules)
          fs.rmSync(rootNodeModules, { recursive: true, force: true })
          deleted++
        }

        // ワークスペース内のnode_modulesも削除
        const workspaces = ['frontend', 'api', 'crawler', 'dispatcher', 'admin', 'shared', 'lp']
        for (const workspace of workspaces) {
          const nodeModules = path.join(process.cwd(), workspace, 'node_modules')
          if (fs.existsSync(nodeModules)) {
            totalSize += getDirectorySize(nodeModules)
            fs.rmSync(nodeModules, { recursive: true, force: true })
            deleted++
          }
        }

        return { deleted, size: totalSize }
      },
    })
  }

  if (tasks.length === 0) {
    warning('クリーンアップ対象が指定されていません')
    console.log(HELP_TEXT)
    process.exit(1)
  }

  info(`${tasks.length}個のクリーンアップタスクを並列実行します...\n`)

  // 並列実行
  const results = await runParallelWithProgress(tasks, (completed, total, name) => {
    const progress = `[${completed}/${total}]`
    console.log(`${colors.green}${progress}${colors.reset} ${name} - 完了`)
  })

  console.log()

  // 結果集計
  let totalDeleted = 0
  let totalSize = 0
  let hasError = false

  results.forEach((result, index) => {
    if (result.success && result.value) {
      totalDeleted += result.value.deleted
      totalSize += result.value.size
    } else {
      hasError = true
      warning(`${tasks[index].name}の削除に失敗しました`)
      if (result.error) {
        console.error(result.error)
      }
    }
  })

  // サマリー表示
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.blue}  クリーンアップ完了${colors.reset}`)
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log()
  console.log(`削除したディレクトリ数: ${colors.green}${totalDeleted}${colors.reset}`)
  console.log(`解放したディスク容量: ${colors.green}${formatFileSize(totalSize)}${colors.reset}`)

  if (hasError) {
    console.log()
    warning('一部のクリーンアップが失敗しました')
    process.exit(1)
  } else {
    console.log()
    success('すべてのクリーンアップが完了しました')
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

  const options: CleanOptions = {
    wrangler: Boolean(args.wrangler),
    dist: Boolean(args.dist),
    cache: Boolean(args.cache),
    deps: Boolean(args.deps),
    all: Boolean(args.all),
  }

  // オプションが何も指定されていない場合は --all とみなす
  if (!options.wrangler && !options.dist && !options.cache && !options.deps && !options.all) {
    options.all = true
  }

  await runCleanup(options)
}

main().catch((error) => {
  console.error(`${colors.red}エラーが発生しました:${colors.reset}`, error)
  process.exit(1)
})
