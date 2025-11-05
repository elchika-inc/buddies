#!/usr/bin/env tsx
/**
 * Setup script with server startup
 *
 * このスクリプトは以下の順序で実行します：
 * 0. 既存プロセスのクリーンアップ（ポート競合を防ぐ）
 * 1. データベースリセット
 * 2. APIサーバーをバックグラウンドで起動
 * 3. サーバー起動を待機
 * 4. データベースシード
 * 5. フロントエンドサーバーを起動
 */

import { spawn, ChildProcess } from 'child_process'
import { parseArgs } from './utils/cli.js'
import { colors, success, error, info, warning } from './utils/colors.js'

interface SetupOptions {
  clean: boolean
  dogs: number
  cats: number
}

let apiProcess: ChildProcess | null = null

// クリーンアップハンドラー
function cleanup() {
  if (apiProcess) {
    info('APIサーバーを停止中...')
    apiProcess.kill('SIGTERM')
    apiProcess = null
  }
}

process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})

/**
 * APIサーバーが起動するまで待機
 */
async function waitForApiServer(maxRetries = 30, interval = 1000): Promise<boolean> {
  info('APIサーバーの起動を待機中...')

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:9789/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      })

      if (response.ok) {
        success('APIサーバーが起動しました')
        return true
      }
    } catch (err) {
      // サーバーがまだ起動していない場合はエラーになる
    }

    // 待機
    await new Promise(resolve => setTimeout(resolve, interval))
    process.stdout.write('.')
  }

  console.log('')
  return false
}

/**
 * コマンドを実行して完了を待つ
 */
function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * APIサーバーをバックグラウンドで起動
 */
function startApiServer(): ChildProcess {
  info('APIサーバーをバックグラウンドで起動中...')

  const proc = spawn('npm', ['run', 'dev:api'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    shell: true,
  })

  // エラーハンドリング
  proc.on('error', (err) => {
    error(`APIサーバーの起動に失敗: ${err.message}`)
  })

  return proc
}

/**
 * 既存のプロセスをクリーンアップ
 */
async function cleanupExistingProcesses(): Promise<void> {
  info('既存のプロセスをクリーンアップ中...')

  try {
    // 既存のnext dev, wrangler dev, npm devプロセスをkill
    await runCommand('bash', [
      '-c',
      "pkill -f 'next dev' 2>/dev/null || true; pkill -f 'wrangler dev' 2>/dev/null || true",
    ]).catch(() => {
      /* エラーは無視 */
    })

    // ポート3004と9789を使っているプロセスをkill
    await runCommand('bash', [
      '-c',
      "lsof -ti:3004,9789 2>/dev/null | xargs kill -9 2>/dev/null || true",
    ]).catch(() => {
      /* エラーは無視 */
    })

    // クリーンアップ完了待機
    await new Promise((resolve) => setTimeout(resolve, 1000))
    success('既存プロセスのクリーンアップ完了')
    console.log('')
  } catch (error) {
    // クリーンアップ失敗は警告のみ
    warning('一部のプロセスのクリーンアップに失敗しました（続行します）')
    console.log('')
  }
}

/**
 * メイン処理
 */
async function main() {
  const args = parseArgs()

  const options: SetupOptions = {
    clean: Boolean(args.clean),
    dogs: parseInt(args.dogs as string, 10) || 10,
    cats: parseInt(args.cats as string, 10) || 10,
  }

  console.log('')
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.cyan}  Buddies セットアップ${colors.reset}`)
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log('')

  try {
    // ステップ0: 既存プロセスのクリーンアップ
    await cleanupExistingProcesses()

    // ステップ1: データベースリセット
    info('ステップ1: データベースをリセット中...')
    await runCommand('npm', ['run', 'db:reset'])
    success('データベースリセット完了')
    console.log('')

    // データベースファイルの準備完了を待機
    info('データベースの準備を待機中...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    success('データベース準備完了')
    console.log('')

    // ステップ2: APIサーバー起動
    info('ステップ2: APIサーバーを起動中...')
    apiProcess = startApiServer()
    console.log('')

    // ステップ3: APIサーバー起動待機
    info('ステップ3: APIサーバーの起動を待機中...')
    const apiReady = await waitForApiServer()

    if (!apiReady) {
      error('APIサーバーの起動がタイムアウトしました')
      throw new Error('API server startup timeout')
    }
    console.log('')

    // 認証サービスの初期化を待機
    info('認証サービスの初期化を待機中...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    success('認証サービスの準備完了')
    console.log('')

    // ステップ4: データベースシード
    info('ステップ4: データベースにシード中...')
    await runCommand('npm', ['run', 'db:seed', '--', `--dogs=${options.dogs}`, `--cats=${options.cats}`, '--clear'])
    success('データベースシード完了')
    console.log('')

    // ステップ5: フロントエンドサーバー起動
    info('ステップ5: フロントエンドサーバーを起動中...')
    console.log('')
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    success('セットアップ完了！')
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log('')
    info('サーバー情報:')
    console.log(`  - API: ${colors.cyan}http://localhost:9789${colors.reset}`)
    console.log(`  - Frontend: ${colors.cyan}http://localhost:3004${colors.reset} (起動中...)`)
    console.log('')
    info('フロントエンドサーバーを起動しています...')
    console.log('')

    // フロントエンドサーバーを起動（フォアグラウンド）
    const frontendProc = spawn('npm', ['run', 'dev:app'], {
      stdio: 'inherit',
      shell: true,
    })

    // フロントエンドが終了したらAPIサーバーも停止
    frontendProc.on('close', () => {
      cleanup()
      process.exit(0)
    })

  } catch (err) {
    console.log('')
    error('セットアップに失敗しました')
    if (err instanceof Error) {
      console.error(err.message)
    }
    cleanup()
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`${colors.red}エラーが発生しました:${colors.reset}`, err)
  cleanup()
  process.exit(1)
})
