'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { NumberTicker } from '@/components/magicui/number-ticker'

const stats = [
  { value: '10–15°C', label: 'Thermal precision' },
  { num: 60, suffix: '+', label: 'Min autonomy' },
  { num: 3000, suffix: '+', label: 'Pro athletes' },
]

export default function Hero() {
  return (
    <section className="relative min-h-[100vh] bg-brand-navy overflow-hidden">
      {/* === FULL BACKGROUND IMAGE === */}
      <div className="absolute inset-0">
        <Image
          src="https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic5-Baja.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/85 to-brand-navy/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-transparent to-brand-navy/60" />
      </div>

      {/* Subtle blue accent glow */}
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-brand-blue/10 rounded-full blur-[100px]" />

      {/* === CONTENT === */}
      <div className="relative z-10 min-h-[100vh] flex items-center">
        <div className="container-wide w-full pt-24 pb-20 md:pt-28 md:pb-24">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6">
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                <span className="text-white/80 text-xs font-heading font-medium tracking-wider uppercase">
                  Elite Recovery Technology
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-heading font-light text-white leading-[1.05] tracking-tighter mb-6"
            >
              The future of
              <br />
              <span className="font-serif italic text-brand-blue">muscle</span>{' '}
              recovery
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-white/60 max-w-lg mb-8 leading-relaxed"
            >
              Phase-change cooling garments that maintain precise temperature without ice.
              Used by FC Barcelona and 3,000+ professional athletes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3 mb-12"
            >
              <Link
                href="/cold2sport/shop"
                className="group inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-heading font-medium text-sm px-7 py-3.5 rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,155,219,0.3)]"
              >
                Shop Now
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="#technology"
                className="inline-flex items-center gap-2 bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 text-white font-heading font-medium text-sm px-7 py-3.5 rounded-lg transition-all duration-300 backdrop-blur-sm"
              >
                Our Technology
              </Link>
            </motion.div>

            {/* Stats bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex gap-8 md:gap-12 border-t border-white/10 pt-6"
            >
              {stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl md:text-3xl font-heading font-medium text-white tracking-tight">
                    {stat.num ? (
                      <>
                        <NumberTicker value={stat.num} className="text-white" />
                        <span className="text-brand-blue">{stat.suffix}</span>
                      </>
                    ) : (
                      <span>{stat.value}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5 uppercase tracking-[0.15em]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Floating product card - right side */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hidden lg:block absolute right-8 xl:right-16 bottom-24 w-72"
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 shadow-2xl">
              <div className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-white">
                <Image
                  src="https://cold2sport.com/wp-content/uploads/2024/11/COLD2SPORT25294.jpg"
                  alt="Thermal Short Adult"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-heading font-medium text-white">Thermal Short</div>
                  <div className="text-xs text-white/40">10–15°C · 60+ min</div>
                </div>
                <div className="text-xl font-heading font-semibold text-white">€100</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-20" />
    </section>
  )
}
