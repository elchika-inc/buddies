'use client'

import { motion } from 'framer-motion'
import { Heart, ArrowRight } from 'lucide-react'
import { env } from '@/config/env'
import {
  ANIMATION_DURATION,
  ANIMATION_DELAY,
  FADE_IN,
  SCALE_IN,
} from '@/lib/animation-constants'

export function CTASection() {
  return (
    <section className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 text-white relative overflow-hidden py-16 md:py-24">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10 px-8 sm:px-16 md:px-20 lg:px-24">
        {/* アイコン */}
        <motion.div
          {...SCALE_IN}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex justify-center mb-8"
        >
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Heart className="w-12 h-12 text-white fill-white" />
          </div>
        </motion.div>

        {/* メインコピー */}
        <motion.h2
          {...FADE_IN}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: ANIMATION_DURATION.STANDARD, delay: ANIMATION_DELAY.SHORT }}
          className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
        >
          あなたの家族を
          <br className="md:hidden" />
          探しに行こう
        </motion.h2>

        {/* サブコピー */}
        <motion.p
          {...FADE_IN}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: ANIMATION_DURATION.STANDARD, delay: ANIMATION_DELAY.MEDIUM }}
          className="text-xl md:text-2xl mb-12 leading-relaxed opacity-95"
        >
          保護犬・保護猫との出会いは、
          <br className="hidden md:block" />
          あなたの人生をきっと豊かにします
        </motion.p>

        {/* CTAボタン */}
        <motion.div
          {...FADE_IN}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: ANIMATION_DURATION.STANDARD, delay: ANIMATION_DELAY.LONG }}
          className="flex flex-row flex-wrap gap-6 justify-center items-center"
        >
          <a
            href={env.APP.DOG}
            className="group inline-flex items-center justify-center px-10 py-5 text-lg font-semibold bg-white text-orange-500 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105"
            aria-label="保護犬を探す"
          >
            <Heart className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
            保護犬を探す
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href={env.APP.CAT}
            className="group inline-flex items-center justify-center px-10 py-5 text-lg font-semibold bg-white text-purple-500 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105"
            aria-label="保護猫を探す"
          >
            <Heart className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
            保護猫を探す
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>

        {/* 補足情報 */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: ANIMATION_DURATION.STANDARD, delay: 0.8 }}
          className="mt-12 text-sm opacity-80"
        >
          ✓ 完全無料　✓ 登録不要　✓ 今すぐ始められます
        </motion.p>
      </div>
    </section>
  )
}
