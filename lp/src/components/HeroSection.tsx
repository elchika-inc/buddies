'use client'

import { motion } from 'framer-motion'
import { Heart, Sparkles } from 'lucide-react'
import { env } from '@/config/env'
import {
  ANIMATION_DURATION,
  ANIMATION_DELAY,
  FADE_IN_FROM_TOP,
  FADE_IN,
  SCROLL_INDICATOR_ANIMATION,
} from '@/lib/animation-constants'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-bg-orange">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>
      </div>

      {/* コンテンツ */}
      <div className="relative z-10 py-16 md:py-24 px-8 sm:px-16 md:px-20 lg:px-24 w-full">
        <div className="max-w-4xl mx-auto text-center">
          {/* バッジ */}
          <motion.div
            {...FADE_IN_FROM_TOP}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-8"
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">完全無料で使えます</span>
          </motion.div>

          {/* メインコピー */}
          <motion.h1
            {...FADE_IN}
            transition={{ duration: ANIMATION_DURATION.STANDARD, delay: ANIMATION_DELAY.SHORT }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-gradient-orange">運命の家族との</span>
            <br className="sm:hidden" />
            <span className="text-gray-900">新しい出会い</span>
          </motion.h1>

          {/* サブコピー */}
          <motion.p
            {...FADE_IN}
            transition={{ duration: ANIMATION_DURATION.STANDARD, delay: ANIMATION_DELAY.MEDIUM }}
            className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed"
          >
            保護犬・保護猫との新しい出会い方。
            <br className="hidden md:block" />
            直感的な操作で、あなたにぴったりの家族を見つけます。
          </motion.p>

          {/* CTA ボタン */}
          <motion.div
            {...FADE_IN}
            transition={{ duration: ANIMATION_DURATION.STANDARD, delay: ANIMATION_DELAY.LONG }}
            className="flex flex-row flex-wrap gap-4 justify-center items-center"
          >
            <a href={env.APP.DOG} className="btn-primary group" aria-label="保護犬を探す">
              <Heart className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
              保護犬を探す
            </a>
            <a href={env.APP.CAT} className="btn-secondary group" aria-label="保護猫を探す">
              <Heart className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
              保護猫を探す
            </a>
          </motion.div>
        </div>
      </div>

      {/* スクロールインジケーター */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: ANIMATION_DURATION.SLOW, delay: ANIMATION_DELAY.EXTRA_LONG }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-gray-500">Scroll</span>
          <motion.div
            {...SCROLL_INDICATOR_ANIMATION}
            className="w-6 h-10 border-2 border-gray-400 rounded-full flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-gray-400 rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
