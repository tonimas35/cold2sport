'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const slides = [
  {
    label: 'New Product',
    heading: 'The Knee Recovery Revolution',
    description: 'Thermal knee pad with precise cooling between 5-15°C. Targeted cold point positioning for optimal joint recovery.',
    cta: { label: 'Learn More', href: '#products' },
    image: '/cold2sport/images/C2S-2025-07-09-0121-red.png',
    imageAlt: 'Cold2Sport Thermal Knee Pad',
  },
  {
    label: 'BioFresh Tech',
    heading: 'The Future of Muscle Recovery',
    description: 'Phase-change cooling garments maintaining 10-15°C for 60+ minutes. No ice needed. Used by FC Barcelona.',
    cta: { label: 'Our Technology', href: '#technology' },
    image: '/cold2sport/images/Cold2Sport_Keyvisual_komprimiert_web.png',
    imageAlt: 'Cold2Sport Thermal Short Technology',
  },
  {
    label: 'Shop Now',
    heading: 'Thermal Garments for Performance & Recovery',
    description: 'Professional-grade recovery technology for athletes at every level. From thermal shorts to cold packs.',
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

  return (
    <section className="relative h-[85vh] min-h-[550px] max-h-[800px] bg-brand-navy overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 flex items-center"
        >
          <div className="container-wide w-full">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left — Text */}
              <div className="relative z-10">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="inline-block text-brand-blue text-xs font-heading font-semibold tracking-wider uppercase mb-4"
                >
                  {slide.label}
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-5"
                >
                  {slide.heading}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="text-sm md:text-base text-white/50 max-w-md mb-7 leading-relaxed"
                >
                  {slide.description}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <Link
                    href={slide.cta.href}
                    className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-heading font-semibold px-6 py-3 rounded transition-colors uppercase tracking-wider"
                  >
                    {slide.cta.label}
                  </Link>
                </motion.div>
              </div>

              {/* Right — Product image */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="relative flex justify-center lg:justify-end"
              >
                <div className="relative w-full max-w-md lg:max-w-lg">
                  <Image
                    src={slide.image}
                    alt={slide.imageAlt}
                    width={600}
                    height={600}
                    className="w-full h-auto object-contain drop-shadow-[0_20px_60px_rgba(0,155,219,0.15)]"
                    priority={current === 0}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      <div className="absolute top-6 right-6 flex gap-2 z-20">
        <button
          onClick={prev}
          className="w-10 h-10 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          aria-label="Previous slide"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={next}
          className="w-10 h-10 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          aria-label="Next slide"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === current ? 'w-8 bg-brand-blue' : 'w-4 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
