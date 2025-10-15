/**
 * ペット情報のフォーマット関数
 * 性別、年齢などの表示形式を統一
 */

import { PetGender } from '@/types/pet'

/**
 * 性別の日本語表示
 */
export const GENDER_DISPLAY: Record<PetGender, string> = {
  male: '男の子',
  female: '女の子',
  unknown: '不明',
} as const

/**
 * 性別の絵文字表示
 */
export const GENDER_EMOJI: Record<PetGender, string> = {
  male: '♂️',
  female: '♀️',
  unknown: '❓',
} as const

/**
 * 性別を日本語で表示
 * @param gender - ペットの性別
 * @returns 日本語の性別表示
 */
export function formatGender(gender: PetGender): string {
  return GENDER_DISPLAY[gender] || '不明'
}

/**
 * 性別の絵文字を取得
 * @param gender - ペットの性別
 * @returns 性別を表す絵文字
 */
export function getGenderEmoji(gender: PetGender): string {
  return GENDER_EMOJI[gender] || '❓'
}

/**
 * 年齢を表示形式でフォーマット
 * @param age - 年齢
 * @returns フォーマットされた年齢文字列
 */
export function formatAge(age: number): string {
  return `${age}歳`
}

/**
 * ペット情報のサマリーを生成
 * @param age - 年齢
 * @param gender - 性別
 * @param location - 場所
 * @returns フォーマットされたサマリー文字列
 */
export function formatPetSummary(age: number, gender: PetGender, location: string): string {
  return `${formatAge(age)} • ${formatGender(gender)} • ${location}`
}
