/**
 * コマンドライン引数解析のヘルパー
 */

import minimist from 'minimist'

export interface ParsedArgs {
  [key: string]: string | boolean | number | undefined
}

/**
 * コマンドライン引数を解析
 */
export function parseArgs(): ParsedArgs {
  return minimist(process.argv.slice(2))
}

/**
 * ヘルプメッセージを表示して終了
 */
export function showHelp(helpText: string): never {
  console.log(helpText)
  process.exit(0)
}

/**
 * 確認プロンプトを表示
 */
export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    const defaultText = defaultValue ? '[Y/n]' : '[y/N]'
    rl.question(`${message} ${defaultText}: `, (answer) => {
      rl.close()
      const normalized = answer.toLowerCase().trim()

      if (normalized === '') {
        resolve(defaultValue)
      } else {
        resolve(normalized === 'y' || normalized === 'yes')
      }
    })
  })
}

/**
 * スピナーアニメーション
 */
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  private interval: NodeJS.Timeout | null = null
  private currentFrame = 0

  start(message: string): void {
    process.stdout.write(`\r${this.frames[0]} ${message}`)
    this.interval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length
      process.stdout.write(`\r${this.frames[this.currentFrame]} ${message}`)
    }, 80)
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    if (finalMessage) {
      process.stdout.write(`\r${finalMessage}\n`)
    } else {
      process.stdout.write('\r')
    }
  }
}
