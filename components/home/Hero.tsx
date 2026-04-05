'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { products } from '@/lib/products'

const stagger = { animate: { transition: { staggerChildren: 0.15 } } }
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
}

export default function Hero() {
  const featured = products[0]

  return (
    <section className="section-contained relative min-h-screen bg-brand-darker">
      {/* Atmospheric layers */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="grain absolute inset-0 overflow-hidden" />
      <div className="absolute -left-40 top-1/4 h-[500px] w-[500px] blob-blue animate-pulse-glow" />
      <div className="absolute -right-20 bottom-1/4 h-[400px] w-[400px] blob-gold opacity-50" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-blue/20 to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 pb-24 pt-36 lg:flex-row lg:gap-20 lg:px-8 lg:pt-44">
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="flex-1 text-center lg:text-left"
        >
          <motion.div variants={fadeUp} className="mb-8 inline-flex items-center gap-3 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-4 py-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue/20 text-[9px] font-extrabold text-brand-blue">
              FCB
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-blue">
              Official Recovery Partner of FC Barcelona
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[5.5rem]"
          >
            Recover
            <br />
            <span className="text-gradient-blue">Faster.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mt-7 max-w-md text-lg leading-relaxed text-gray-400 lg:mx-0">
            BioFresh Tech phase-change cooling. Sustained 10–15°C for 60+ minutes.
            <span className="text-white/60"> No ice. No freezer.</span>
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
            <Button href="/shop" size="lg">
              Shop Now
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button href="/#technology" variant="outline-white" size="lg">
              Discover Technology
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={fadeUp}
            className="mt-14 flex flex-wrap justify-center gap-8 lg:justify-start"
          >
            {[
              { value: '10–15°C', label: 'Stable cooling' },
              { value: '60+ min', label: 'Autonomy' },
              { value: '3,000+', label: 'Athletes' },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex-1"
        >
          {/* Glow behind product */}
          <div className="absolute inset-0 -z-10 scale-75 rounded-full bg-brand-blue/8 blur-[100px]" />
          <div className="animate-float">
            <Image
              src={featured.image}
              alt="Cold2Sport Thermal Short — flagship recovery garment for post-training cooling"
              width={600}
              height={600}
              priority
              className="mx-auto w-full max-w-sm rounded-3xl object-cover shadow-glow-strong lg:max-w-md"
            />
          </div>
          {/* Floating spec badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute -left-4 bottom-24 glass-strong rounded-2xl px-5 py-3 shadow-glass lg:left-0"
          >
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Temperature</p>
            <p className="font-display text-xl font-bold text-brand-blue">10–15°C</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="absolute -right-4 top-20 glass-strong rounded-2xl px-5 py-3 shadow-glass lg:right-0"
          >
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Autonomy</p>
            <p className="font-display text-xl font-bold text-brand-gold">+60 min</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-600">Scroll</span>
          <div className="h-8 w-[1px] bg-gradient-to-b from-gray-600 to-transparent" />
        </div>
      </motion.div>
    </section>
  )
}
