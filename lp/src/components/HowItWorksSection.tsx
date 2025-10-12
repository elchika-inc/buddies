'use client'

import { motion } from 'framer-motion'
import { MapPin, Heart, MessageCircle } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: MapPin,
    title: '地域を選択',
    description: 'お住まいの都道府県や市区町村を選択して、近くのペットを絞り込みます。',
    color: 'from-orange-400 to-orange-600',
  },
  {
    number: '02',
    icon: Heart,
    title: 'スワイプで探す',
    description: 'ペットのプロフィールを見ながら、右スワイプで「いいね」、左スワイプで「次へ」。',
    color: 'from-pink-400 to-pink-600',
  },
  {
    number: '03',
    icon: MessageCircle,
    title: '保護団体に連絡',
    description: '気になる子を見つけたら、お気に入りに保存して保護団体に直接お問い合わせ。',
    color: 'from-purple-400 to-purple-600',
  },
]

export function HowItWorksSection() {
  return (
    <section className="section-container gradient-bg-purple">
      <div className="max-w-7xl mx-auto">
        {/* セクションヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-purple">使い方はとても簡単</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            3ステップで家族に出会えます
          </p>
        </motion.div>

        {/* ステップカード */}
        <div className="relative">
          {/* 接続線（PC表示のみ） */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-orange-200 via-pink-200 to-purple-200 transform -translate-y-1/2 z-0" />

          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  {/* ステップ番号 */}
                  <div
                    className={`absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                  >
                    <span className="text-white font-bold text-xl">{step.number}</span>
                  </div>

                  {/* アイコン */}
                  <div className="mt-8 mb-6 flex justify-center">
                    <div
                      className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center`}
                    >
                      <step.icon className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  {/* タイトル */}
                  <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">
                    {step.title}
                  </h3>

                  {/* 説明 */}
                  <p className="text-gray-600 text-center leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <p className="text-lg text-gray-600 mb-4">今すぐ始めて、新しい家族を見つけましょう</p>
        </motion.div>
      </div>
    </section>
  )
}
