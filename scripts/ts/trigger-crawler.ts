#!/usr/bin/env tsx

/**
 * Crawler Trigger Script for Buddies
 * クローラーAPIをトリガーして実行
 *
 * Usage:
 *   npm run crawler:trigger [env] [type] [limit] [source]
 *   tsx trigger-crawler.ts dev both 10 pet-home
 */

import { parseArgs, showHelp } from './utils/cli.js'
import { colors, success, error, warning, info, header, colorize } from './utils/colors.js'

const HELP_TEXT = `
使用方法: tsx trigger-crawler.ts [ENV] [TYPE] [LIMIT] [SOURCE]

引数:
  ENV           環境 (dev | prod) - デフォルト: dev
  TYPE          ペットタイプ (dog | cat | both) - デフォルト: both
  LIMIT         取得件数 - デフォルト: 10
  SOURCE        データソース - デフォルト: pet-home

オプション:
  -h, --help    ヘルプを表示

環境変数:
  ADMIN_SECRET  本番環境で使用する管理者シークレット

例:
  npm run crawler:trigger
  npm run crawler:trigger dev dog 20
  ADMIN_SECRET=xxx tsx trigger-crawler.ts prod both 50
`

interface CrawlerConfig {
  env: 'dev' | 'prod'
  petType: 'dog' | 'cat' | 'both'
  limit: number
  source: string
  apiUrl: string
  apiKey: string
}

/**
 * 環境設定を取得
 */
function getConfig(args: ReturnType<typeof parseArgs>): CrawlerConfig {
  const env = (args._[0] as string) || 'dev'
  const petType = (args._[1] as string) || 'both'
  const limit = parseInt(args._[2] as string, 10) || 10
  const source = (args._[3] as string) || 'pet-home'

  if (env !== 'dev' && env !== 'prod') {
    throw new Error(`無効な環境: ${env} (dev または prod を指定してください)`)
  }

  if (!['dog', 'cat', 'both'].includes(petType)) {
    throw new Error(`無効なペットタイプ: ${petType} (dog, cat, both のいずれかを指定してください)`)
  }

  let apiUrl: string
  let apiKey: string

  if (env === 'prod') {
    apiUrl = 'https://buddies-api.elchika.app'
    apiKey = process.env.ADMIN_SECRET || ''

    if (!apiKey) {
      throw new Error(
        '本番環境では ADMIN_SECRET 環境変数を設定してください\n' +
          '例: export ADMIN_SECRET=your_admin_secret_key'
      )
    }
  } else {
    apiUrl = 'http://localhost:9789'
    apiKey = '' // 開発環境ではAPIキー不要
  }

  return {
    env,
    petType: petType as 'dog' | 'cat' | 'both',
    limit,
    source,
    apiUrl,
    apiKey,
  }
}

/**
 * クローラーAPIをトリガー
 */
async function triggerCrawler(config: CrawlerConfig): Promise<void> {
  const { env, petType, limit, source, apiUrl, apiKey } = config

  header('Crawler Trigger Script', 'yellow')

  console.log(`環境: ${colorize(env, 'cyan')}`)
  console.log(`API URL: ${colorize(apiUrl, 'cyan')}`)
  console.log(`ペットタイプ: ${colorize(petType, 'cyan')}`)
  console.log(`取得件数: ${colorize(String(limit), 'cyan')}`)
  console.log(`ソース: ${colorize(source, 'cyan')}`)
  console.log()

  info('クローラーをトリガー中...')

  try {
    let response: Response

    if (env === 'prod') {
      // 本番環境: 認証ヘッダー付き
      response = await fetch(`${apiUrl}/api/admin/trigger-crawler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': apiKey,
        },
        body: JSON.stringify({
          type: petType,
          limit,
          source,
        }),
      })
    } else {
      // 開発環境: 認証ヘッダーなし
      response = await fetch(`${apiUrl}/api/crawler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petType,
          limit,
        }),
      })
    }

    const body = await response.json()

    if (response.ok) {
      success('クローラーが正常にトリガーされました！')
      console.log()
      console.log('レスポンス:')
      console.log(JSON.stringify(body, null, 2))
    } else {
      error(`クローラーのトリガーに失敗しました (HTTP ${response.status})`)
      console.log()
      console.log('レスポンス:')
      console.log(JSON.stringify(body, null, 2))
      process.exit(1)
    }
  } catch (err) {
    error('APIリクエストに失敗しました')
    if (err instanceof Error) {
      console.error(err.message)
    }
    process.exit(1)
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

  try {
    const config = getConfig(args)
    await triggerCrawler(config)
  } catch (err) {
    console.log()
    error('エラーが発生しました')
    if (err instanceof Error) {
      console.error(err.message)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`${colors.red}予期しないエラーが発生しました:${colors.reset}`, err)
  process.exit(1)
})
