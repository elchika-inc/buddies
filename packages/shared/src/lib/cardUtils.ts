/**
 * カードコンポーネント用のユーティリティ関数
 * DogCardとCatCardで共通で使用される機能を提供
 */

import { DOG_SIZE_COLORS, EXERCISE_LEVEL_COLORS, SOCIAL_LEVEL_COLORS, DEFAULT_VALUES } from '../config/constants'

/**
 * 犬のサイズに対応する色クラスを取得
 */
export function getDogSizeColor(size: string): string {
  return DOG_SIZE_COLORS[size as keyof typeof DOG_SIZE_COLORS] || DEFAULT_VALUES.DOG_SIZE_COLOR
}

/**
 * 運動レベルに対応する色クラスを取得
 */
export function getExerciseColor(level: string): string {
  return EXERCISE_LEVEL_COLORS[level as keyof typeof EXERCISE_LEVEL_COLORS] || DEFAULT_VALUES.EXERCISE_LEVEL_COLOR
}

/**
 * 猫の毛の長さに対応する色クラスを取得
 */
export function getCatCoatColor(length: string): string {
  return length === '長毛' 
    ? 'bg-purple-100 text-purple-800' 
    : 'bg-blue-100 text-blue-800'
}

/**
 * 社交レベルに対応する色クラスを取得
 */
export function getSocialColor(level: string): string {
  return SOCIAL_LEVEL_COLORS[level as keyof typeof SOCIAL_LEVEL_COLORS] || DEFAULT_VALUES.SOCIAL_LEVEL_COLOR
}