/**
 * カラー出力用の定数とヘルパー関数
 */

export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  magenta: '\x1b[0;35m',
  cyan: '\x1b[0;36m',
} as const

export type Color = keyof typeof colors

/**
 * テキストに色を付ける
 */
export function colorize(text: string, color: Color): string {
  return `${colors[color]}${text}${colors.reset}`
}

/**
 * 成功メッセージを表示
 */
export function success(message: string): void {
  console.log(`${colors.green}✅ ${message}${colors.reset}`)
}

/**
 * エラーメッセージを表示
 */
export function error(message: string): void {
  console.log(`${colors.red}❌ ${message}${colors.reset}`)
}

/**
 * 警告メッセージを表示
 */
export function warning(message: string): void {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`)
}

/**
 * 情報メッセージを表示
 */
export function info(message: string): void {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`)
}

/**
 * セクションヘッダーを表示
 */
export function header(title: string, color: Color = 'blue'): void {
  const line = '━'.repeat(44)
  console.log(`${colors[color]}${line}${colors.reset}`)
  console.log(`${colors[color]}  ${title}${colors.reset}`)
  console.log(`${colors[color]}${line}${colors.reset}`)
  console.log()
}
