'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const slides = [
  {
    heading: 'Cold2Sport',
    subheading: 'Elite Recovery Technology',
    description: 'Phase-change cooling garments maintaining 10-15°C for 60+ minutes. No ice. Used by FC Barcelona and 3,000+ pro athletes.',
    cta: { label: 'Discover', href: '#products' },
    image: '/cold2sport/images/Cold2Sport_Keyvisual_komprimiert_web.png',
    imageAlt: 'Cold2Sport Thermal Short — flagship product',
  },
  {
    heading: 'The Knee Recovery Revolution',
    subheading: 'New Product',
    description: 'Thermal knee pad with precise cooling between 5-15°C. Targeted cold point positioning for optimal joint recovery.',
    cta: { label: 'Learn More', href: '#products' },
    image: '/cold2sport/images/C2S-2025-07-09-0121-red.png',
    imageAlt: 'Cold2Sport Thermal Knee Pad',
  },
  {
    heading: 'Recovery Without Ice',
    subheading: 'Shop Now',
    description: 'Professional-grade thermal recovery for athletes at every level. From shorts to knee pads to cold packs.',
    cta: { label: 'Shop', href: '/cold2sport/shop' },
    image: '/cold2sport/images/COLD2SPORT25237-removebg-preview.png',
    imageAlt: 'Cold2Sport Product Range',
  },
]

export default function Hero() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [])

  useEffect(() => {
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [next])

  const slide = slides[current]
  const isFirst = current === 0

  return (
    <section className="relative h-[90vh] min-h-[600px] max-h-[850px] bg-brand-navy overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 flex items-center"
        >
          <div className="container-wide w-full">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left — Text */}
              <div className="relative z-10">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="inline-block text-brand-blue text-xs font-heading font-semibold tracking-[0.2em] uppercase mb-4"
                >
                  {slide.subheading}
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className={`font-serif text-white leading-[1.05] mb-5 ${
                    isFirst
                      ? 'text-6xl sm:text-7xl lg:text-8xl xl:text-9xl tracking-tight'
                      : 'text-4xl sm:text-5xl lg:text-6xl'
                  }`}
                >
                  {isFirst ? (
                    <>Cold<span className="text-brand-blue">2</span>Sport</>
                  ) : (
                    slide.heading
                  )}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="text-sm md:text-base text-white/40 max-w-md mb-7 leading-relaxed"
                >
                  {slide.description}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.4 }}
                >
                  <Link
                    href={slide.cta.href}
                    className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-heading font-semibold px-7 py-3.5 rounded transition-colors uppercase tracking-wider"
                  >
                    {slide.cta.label}
                  </Link>
                </motion.div>
              </div>

              {/* Right — Product image */}
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex justify-center lg:justify-end"
              >
                <div className="relative w-full max-w-sm lg:max-w-md xl:max-w-lg">
                  <Image
                    src={slide.image}
                    alt={slide.imageAlt}
                    width={600}
                    height={600}
                    className="w-full h-auto object-contain drop-shadow-[0_20px_60px_rgba(0,155,219,0.12)]"
                    priority={current === 0}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows — top right */}
      <div className="absolute top-20 right-6 md:right-10 flex gap-2 z-20">
        <button
          onClick={prev}
          className="w-10 h-10 rounded bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          aria-label="Previous slide"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={next}
          className="w-10 h-10 rounded bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          aria-label="Next slide"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-400 ${
              i === current ? 'w-8 bg-brand-blue' : 'w-4 bg-white/15 hover:bg-white/30'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
