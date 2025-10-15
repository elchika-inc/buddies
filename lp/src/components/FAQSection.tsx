'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { faqData } from './StructuredData'
import { ANIMATION_DURATION, ANIMATION_DELAY, FADE_IN, staggerTransition } from '@/lib/animation-constants'

// FAQ質問をfaqDataから取得
const faqs = faqData.mainEntity.map((entity) => ({
  question: entity.name,
  answer: entity.acceptedAnswer.text,
}))

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="gradient-bg-orange py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-8 sm:px-16 md:px-20 lg:px-24">
        {/* セクションヘッダー */}
        <motion.div
          {...FADE_IN}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-orange">よくある質問</span>
          </h2>
          <p className="text-xl text-gray-600">
            Buddiesについて知りたいことをまとめました
          </p>
        </motion.div>

        {/* FAQアコーディオン */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={staggerTransition(index)}
            >
              <div className="bg-white rounded-2xl overflow-hidden">
                {/* 質問 */}
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 md:px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200"
                  aria-expanded={openIndex === index}
                >
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: ANIMATION_DURATION.FAST }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-6 h-6 text-orange-500" />
                  </motion.div>
                </button>

                {/* 回答 */}
                <motion.div
                  initial={false}
                  animate={{
                    height: openIndex === index ? 'auto' : 0,
                    opacity: openIndex === index ? 1 : 0,
                  }}
                  transition={{ duration: ANIMATION_DURATION.FAST }}
                  className="overflow-hidden"
                >
                  <div className="px-6 md:px-8 pb-6 pt-2">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 追加の問い合わせ */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: ANIMATION_DURATION.STANDARD, delay: ANIMATION_DELAY.MEDIUM }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600">
            その他のご質問は、アプリ内のお問い合わせフォームからお気軽にご連絡ください。
          </p>
        </motion.div>
      </div>
    </section>
  )
}
