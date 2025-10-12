'use client'

import { motion } from 'framer-motion'
import { Smartphone, MapPin, Shield } from 'lucide-react'

const features = [
  {
    icon: Smartphone,
    title: '簡単スワイプ操作',
    description: 'Tinderのように直感的なスワイプ操作。右にスワイプで「いいね」、左で「次へ」。誰でも簡単に使えます。',
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
}

export function FeaturesSection() {
  return (
    <section className="section-container bg-white">
      <div className="max-w-7xl mx-auto">
        {/* セクションヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
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
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
            >
              {/* アイコン */}
              <div
                className={`${feature.bgColor} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
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
        </motion.div>
      </div>
    </section>
  )
}
