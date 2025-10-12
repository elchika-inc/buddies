'use client'

import { motion } from 'framer-motion'
import { Heart, Sparkles } from 'lucide-react'

const APP_URL_DOG = process.env['NEXT_PUBLIC_APP_URL_DOG'] || 'https://buddies-dogs.elchika.app'
const APP_URL_CAT = process.env['NEXT_PUBLIC_APP_URL_CAT'] || 'https://buddies-cats.elchika.app'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-bg-orange">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>
      </div>

      {/* コンテンツ */}
      <div className="section-container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* バッジ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-8"
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">完全無料で使えます</span>
          </motion.div>

          {/* メインコピー */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-gradient-orange">運命の出会いは、</span>
            <br className="sm:hidden" />
            <span className="text-gray-900">スワイプから始まる</span>
          </motion.h1>

          {/* サブコピー */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed"
          >
            保護犬・保護猫との新しい出会い方。
            <br className="hidden md:block" />
            スワイプで簡単マッチング、あなたにぴったりの家族を見つけます。
          </motion.p>

          {/* CTA ボタン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <a
              href={APP_URL_DOG}
              className="btn-primary group"
              aria-label="保護犬を探す"
            >
              <Heart className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
              保護犬を探す
            </a>
            <a
              href={APP_URL_CAT}
              className="btn-secondary group"
              aria-label="保護猫を探す"
            >
              <Heart className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
              保護猫を探す
            </a>
          </motion.div>

          {/* 統計情報 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            <div>
              <p className="text-3xl md:text-4xl font-bold text-orange-500">1,200+</p>
              <p className="text-sm md:text-base text-gray-600 mt-1">掲載ペット数</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-orange-500">300+</p>
              <p className="text-sm md:text-base text-gray-600 mt-1">連携保護団体</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-orange-500">500+</p>
              <p className="text-sm md:text-base text-gray-600 mt-1">マッチング成功</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* スクロールインジケーター */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-gray-500">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-gray-400 rounded-full flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 bg-gray-400 rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
