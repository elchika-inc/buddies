'use client'

import { motion } from 'framer-motion'
import { Smartphone, MapPin, Shield } from 'lucide-react'
import { FADE_IN, staggerTransition } from '@/lib/animation-constants'

const features = [
  {
    icon: Smartphone,
    title: '直感的な操作',
    description: '指先ひとつで簡単操作。右にタッチで「いいね」、左で「次へ」。誰でも迷わず使えます。',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
  },
  {
    icon: MapPin,
    title: '全国の保護団体と連携',
    description: '日本全国300以上の保護団体と連携。お住まいの地域で絞り込んで、近くのペットを見つけられます。',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Shield,
    title: '安心・安全なマッチング',
    description: '保護団体が管理する正確な情報のみを掲載。引き取りまでしっかりサポートします。',
    color: 'text-green-500',
    bgColor: 'bg-green-100',
  },
]

export function FeaturesSection() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-8 sm:px-16 md:px-20 lg:px-24">
        {/* セクションヘッダー */}
        <motion.div
          {...FADE_IN}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-orange">3つの特徴</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Buddiesなら、保護犬・保護猫との出会いがもっと身近に
          </p>
        </motion.div>

        {/* 特徴カード */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={staggerTransition(index)}
              className="group relative bg-white rounded-2xl p-8 transition-all duration-300"
            >
              {/* アイコン */}
              <div
                className={`${feature.bgColor} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>

              {/* タイトル */}
              <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-orange-500 transition-colors">
                {feature.title}
              </h3>

              {/* 説明 */}
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>

              {/* ホバーアクセント */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-2xl" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
