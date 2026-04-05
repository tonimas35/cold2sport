'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { news } from '@/lib/news'

const categoryStyle: Record<string, string> = {
  Partnership: 'bg-brand-navy text-white',
  Ambassador: 'bg-brand-blue text-white',
  Technology: 'border border-brand-blue text-brand-blue bg-transparent',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const stagger = { animate: { transition: { staggerChildren: 0.1 } } }
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function NewsSection() {
  return (
    <section id="news" className="bg-brand-offwhite py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-body text-[11px] font-medium tracking-[0.1em] text-brand-blue">Latest news</p>
          <h2 className="font-heading text-[48px] font-normal text-brand-navy">Stay updated</h2>
        </div>
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-8 md:grid-cols-3"
        >
          {news.map((item) => (
            <motion.article
              key={item.slug}
              variants={fadeUp}
              className="group overflow-hidden rounded-2xl border border-brand-border bg-white transition-all duration-300 hover:border-brand-blue hover:-translate-y-1"
            >
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${categoryStyle[item.category] || 'bg-gray-100 text-gray-600'}`}>
                    {item.category}
                  </span>
                  <time className="font-body text-[12px] text-brand-text-light" dateTime={item.date}>
                    {formatDate(item.date)}
                  </time>
                </div>
                <h3 className="line-clamp-2 font-heading text-[18px] font-normal text-brand-navy">
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-2 font-body text-[14px] text-brand-text-mid">
                  {item.excerpt}
                </p>
                <p className="mt-4 font-body text-[14px] font-medium text-brand-blue">
                  Read more →
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
