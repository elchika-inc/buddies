'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

const screenshots = {
  dog: [
    { src: '/screenshots/dog/hero.png', alt: '保護犬をスワイプして探す', title: 'スワイプで探す' },
    { src: '/screenshots/dog/detail.png', alt: '保護犬の詳細情報', title: '詳細情報' },
    { src: '/screenshots/dog/favorites.png', alt: 'お気に入りの保護犬一覧', title: 'お気に入り' },
  ],
  cat: [
    { src: '/screenshots/cat/hero.png', alt: '保護猫をスワイプして探す', title: 'スワイプで探す' },
    { src: '/screenshots/cat/detail.png', alt: '保護猫の詳細情報', title: '詳細情報' },
    { src: '/screenshots/cat/favorites.png', alt: 'お気に入りの保護猫一覧', title: 'お気に入り' },
  ],
}

export function ScreenshotsSection() {
  const [activeTab, setActiveTab] = useState<'dog' | 'cat'>('dog')

  return (
    <section className="section-container bg-white">
      <div className="max-w-7xl mx-auto">
        {/* セクションヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-orange">アプリの画面</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            シンプルで使いやすいデザイン
          </p>
        </motion.div>

        {/* タブ */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setActiveTab('dog')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === 'dog'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              保護犬
            </button>
            <button
              onClick={() => setActiveTab('cat')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === 'cat'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              保護猫
            </button>
          </div>
        </div>

        {/* スクリーンショットグリッド */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {screenshots[activeTab].map((screenshot, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group relative"
            >
              {/* スマホフレーム */}
              <div className="relative bg-gray-900 rounded-3xl p-3 shadow-2xl group-hover:shadow-3xl transition-all duration-300 transform group-hover:-translate-y-2">
                {/* ノッチ */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-2xl z-10" />

                {/* スクリーンショット */}
                <div className="relative bg-white rounded-2xl overflow-hidden aspect-[9/19.5]">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              </div>

              {/* タイトル */}
              <p className="text-center mt-4 text-sm font-semibold text-gray-700">
                {screenshot.title}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
