'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'
import { news } from '@/lib/news'

const categoryVariant: Record<string, 'blue' | 'gold' | 'gray'> = {
  Partnership: 'blue',
  Ambassador: 'gold',
  Technology: 'gray',
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
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function NewsSection() {
  return (
    <section id="news" className="section-contained bg-brand-dark py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader label="Latest News" title="Stay updated" light />
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-6 md:grid-cols-3"
        >
          {news.map((item) => (
            <motion.article
              key={item.slug}
              variants={fadeUp}
              className="glass-card group overflow-hidden rounded-3xl"
            >
              <div className="relative h-52 w-full overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-darker/80 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <Badge variant={categoryVariant[item.category] || 'gray'}>
                    {item.category}
                  </Badge>
                </div>
              </div>
              <div className="p-6">
                <time className="text-[11px] uppercase tracking-wider text-gray-500" dateTime={item.date}>
                  {formatDate(item.date)}
                </time>
                <h3 className="mt-3 line-clamp-2 font-display text-lg font-bold tracking-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-400">{item.excerpt}</p>
                <div className="mt-5 flex items-center justify-between text-[12px]">
                  <span className="text-gray-500">{item.readTime} read</span>
                  <span className="font-semibold text-brand-blue transition-all duration-300 group-hover:translate-x-1">
                    Read more →
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
