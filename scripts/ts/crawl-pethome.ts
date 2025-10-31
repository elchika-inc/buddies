#!/usr/bin/env tsx

/**
 * PetHome Crawler Script
 * PetHomeサイトからペット情報をクローリング
 *
 * Usage:
 *   npm run crawler:pethome
 *   npm run crawler:pethome -- --type=dog --limit=20
 */

import { parseArgs, showHelp } from './utils/cli.js'
import { colors, success, error, warning, info, header, colorize } from './utils/colors.js'
import { runParallel } from './utils/parallel.js'

const HELP_TEXT = `
使用方法: tsx crawl-pethome.ts [OPTIONS]

オプション:
  -t, --type TYPE     ペットタイプ: dog, cat, both (デフォルト: both)
  -l, --limit LIMIT   取得件数 (デフォルト: 10)
  -h, --help          ヘルプを表示

環境変数:
  CRAWLER_URL         クローラーサーバーのURL (デフォルト: http://localhost:9787)

例:
  npm run crawler:pethome
  npm run crawler:pethome -- --type=cat --limit=20
  npm run crawler:pethome -- -t dog -l 15
`

interface CrawlOptions {
  type: 'dog' | 'cat' | 'both'
  limit: number
  baseUrl: string
}

interface CrawlResult {
  type: string
  success: boolean
  count?: number
  error?: string
}

/**
 * クローラーサーバーの疎通確認
 */
async function checkServer(baseUrl: string): Promise<boolean> {
  info('クローラーサーバーを確認中...')

  try {
    const response = await fetch(baseUrl)
    if (response.ok) {
      success('クローラーサーバーが稼働しています')
      return true
    } else {
      error('クローラーサーバーが応答していません')
      return false
    }
  } catch (err) {
    error('クローラーサーバーに接続できません')
    console.log()
    warning('次のコマンドでサーバーを起動してください:')
    console.log(`  ${colorize('npm run dev', 'cyan')}`)
    return false
  }
}

/**
 * ペットをクロール
 */
async function crawlPets(
  baseUrl: string,
  petType: 'dog' | 'cat',
  limit: number
): Promise<CrawlResult> {
  info(`${petType === 'dog' ? '犬' : '猫'}をクロール中 (limit: ${limit})...`)

  try {
    const response = await fetch(`${baseUrl}/crawl/pet-home/${petType}?limit=${limit}`, {
      method: 'POST',
    })

    const body = await response.json()

    if (body.error) {
      error(`${petType}のクロールに失敗しました`)
      console.log(JSON.stringify(body, null, 2))
      return {
        type: petType,
        success: false,
        error: body.error,
      }
    } else {
      success(`${petType}のクロールが完了しました`)
      console.log('結果:')
      if (body.result) {
        console.log(JSON.stringify(body.result, null, 2))
      }
      return {
        type: petType,
        success: true,
        count: body.result?.count || 0,
      }
    }
  } catch (err) {
    error(`${petType}のクロール中にエラーが発生しました`)
    return {
      type: petType,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * 統計情報を表示
 */
async function showStats(baseUrl: string): Promise<void> {
  console.log()
  info('クロール統計を取得中...')

  try {
    const statusResponse = await fetch(`${baseUrl}/crawl/status`)
    const statusData = await statusResponse.json()

    console.log('統計情報:')
    console.log(JSON.stringify(statusData, null, 2))
    console.log()

    info('最近のペット情報を取得中...')
    const petsResponse = await fetch(`${baseUrl}/pets?limit=5`)
    const petsData = await petsResponse.json()

    console.log('最近のペット:')
    if (petsData.pets && Array.isArray(petsData.pets)) {
      petsData.pets.forEach((pet: any) => {
        console.log(
          `  - [${pet.id}] ${pet.type} ${pet.name} (${pet.prefecture || '場所不明'})`
        )
      })
    }
  } catch (err) {
    warning('統計情報の取得に失敗しました')
  }
}

/**
 * クロール実行
 */
async function runCrawl(options: CrawlOptions): Promise<void> {
  const { type, limit, baseUrl } = options

  header('PetHome Crawler', 'green')

  console.log(`ペットタイプ: ${colorize(type, 'cyan')}`)
  console.log(`取得件数: ${colorize(String(limit), 'cyan')}`)
  console.log(`サーバーURL: ${colorize(baseUrl, 'cyan')}`)
  console.log()

  // サーバー確認
  const isServerRunning = await checkServer(baseUrl)
  if (!isServerRunning) {
    process.exit(1)
  }
  console.log()

  // クロール実行
  let results: CrawlResult[]

  if (type === 'both') {
    // 並列実行
    info('犬と猫を並列でクロールします...')
    console.log()

    const parallelResults = await runParallel([
      () => crawlPets(baseUrl, 'cat', limit),
      () => crawlPets(baseUrl, 'dog', limit),
    ])

    results = parallelResults.map((r) => (r.success ? r.value! : { type: 'unknown', success: false }))
  } else {
    // 単一タイプ
    const result = await crawlPets(baseUrl, type, limit)
    results = [result]
  }

  console.log()

  // 結果サマリー
  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length
  const totalCount = results.reduce((sum, r) => sum + (r.count || 0), 0)

  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.blue}  クロール完了${colors.reset}`)
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log()
  console.log(`成功: ${colorize(String(successCount), 'green')}`)
  console.log(`失敗: ${colorize(String(failureCount), failureCount > 0 ? 'red' : 'green')}`)
  console.log(`取得件数: ${colorize(String(totalCount), 'cyan')}`)

  // 統計表示
  await showStats(baseUrl)

  console.log()
  success('クローリングが完了しました！')

  if (failureCount > 0) {
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

  const type = (args.type || args.t || 'both') as string
  const limit = parseInt(String(args.limit || args.l || '10'), 10)
  const baseUrl = process.env.CRAWLER_URL || 'http://localhost:9787'

  if (!['dog', 'cat', 'both'].includes(type)) {
    error(`無効なペットタイプ: ${type}`)
    console.log('dog, cat, both のいずれかを指定してください')
    process.exit(1)
  }

  if (isNaN(limit) || limit <= 0) {
    error(`無効な件数: ${limit}`)
    console.log('正の整数を指定してください')
    process.exit(1)
  }

  const options: CrawlOptions = {
    type: type as 'dog' | 'cat' | 'both',
    limit,
    baseUrl,
  }

  await runCrawl(options)
}

main().catch((err) => {
  console.error(`${colors.red}予期しないエラーが発生しました:${colors.reset}`, err)
  process.exit(1)
})
