'use client'

import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'

const news = [
  {
    title: 'Cold2Sport expands its recovery product range with two new launches',
    date: '2025-12-22',
    image: '/cold2sport/images/C2S-2025-07-09-0121-red.png',
    href: '#',
  },
  {
    title: 'Cold2Sport expands in Argentina with Sport78 and DigitalSport',
    date: '2025-10-06',
    image: '/cold2sport/images/cold2sport-nautic23-Baja-1-800x694.jpg',
    href: '#',
  },
  {
    title: 'Discover the Cold2Sport thermal knee pad: stable and long-lasting',
    date: '2025-07-11',
    image: '/cold2sport/images/cold2sport-nautic3-Baja-800x694.jpg',
    href: '#',
  },
  {
    title: 'Sports Technology Company of the Year at the 2025 European Technology Awards',
    date: '2025-06-09',
    image: '/cold2sport/images/856c68c5-74ab-4e11-b476-fcf2f10ed7b2.png',
    href: '#',
  },
  {
    title: 'Sports Physiotherapy Congress in Barcelona, May 9th',
    date: '2025-05-05',
    image: '/cold2sport/images/Bihub-placeholder-1200-800.jpg',
    href: '#',
  },
  {
    title: 'Prevention, immediate treatment and active recovery with Cold2Sport',
    date: '2025-05-02',
    image: '/cold2sport/images/WhatsApp-Image-2025-02-17-at-15.10.52-e1740763214940.jpeg',
    href: '#',
  },
]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NewsSection() {
  return (
    <section id="news" className="py-16 md:py-24 bg-brand-navy border-t border-white/5">
      <div className="container-wide">
        <AnimatedSection className="text-center mb-12">
          <span className="text-brand-blue text-xs font-heading font-semibold tracking-wider uppercase">Latest</span>
          <h2 className="text-3xl md:text-4xl font-heading font-light text-white mt-2 tracking-tighter">News</h2>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((item, i) => (
            <AnimatedSection key={i} delay={i * 0.05}>
              <a href={item.href} className="group block rounded-xl overflow-hidden bg-white/5 hover:bg-white/8 transition-colors">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <time className="text-[10px] text-white/20 uppercase tracking-wider">{formatDate(item.date)}</time>
                  <h3 className="text-sm font-heading font-medium text-white/80 mt-1 leading-snug line-clamp-2 group-hover:text-brand-blue transition-colors">
                    {item.title}
                  </h3>
                </div>
              </a>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
