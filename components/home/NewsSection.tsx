'use client'

import Image from 'next/image'
import { news } from '@/lib/news'
import { BlurFade } from '@/components/magicui/blur-fade'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function NewsSection() {
  return (
    <section id="news" className="section-padding bg-brand-offwhite">
      <div className="container-wide">
        <BlurFade className="text-center mb-14">
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            Latest News
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 tracking-tighter">
            What&apos;s <span className="font-serif italic">happening</span>
          </h2>
        </BlurFade>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {news.map((item, i) => (
            <BlurFade key={item.slug} delay={i * 0.1}>
              <article className="group bg-white rounded-2xl overflow-hidden border border-brand-border hover:shadow-lg transition-shadow duration-300">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-brand-navy/80 backdrop-blur-sm text-white text-xs font-heading px-3 py-1 rounded-md uppercase tracking-wider">
                      {item.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3 text-xs text-brand-text-light">
                    <time dateTime={item.date}>{formatDate(item.date)}</time>
                    <span>&middot;</span>
                    <span>{item.readTime} read</span>
                  </div>
                  <h3 className="text-base font-heading font-medium text-brand-navy leading-snug mb-2 line-clamp-2 group-hover:text-brand-blue transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-brand-text-mid line-clamp-2">{item.excerpt}</p>
                </div>
              </article>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
