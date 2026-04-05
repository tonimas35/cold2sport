'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { products } from '@/lib/products'

const stagger = { animate: { transition: { staggerChildren: 0.15 } } }
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export default function Hero() {
  const featured = products[0]

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-brand-navy"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 70% 50%, rgba(0,155,219,0.08) 0%, transparent 60%),
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '100% 100%, 60px 60px, 60px 60px',
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 pb-24 pt-36 lg:flex-row lg:gap-12 lg:px-8 lg:pt-44">
        {/* Text — 55% */}
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="flex-[1.2] text-center lg:text-left"
        >
          {/* Eyebrow badge — blue border */}
          <motion.div variants={fadeUp} className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-blue/40 bg-brand-blue/[0.08] px-4 py-2">
            <span className="text-[11px] font-medium tracking-[0.1em] text-brand-blue">
              Official Recovery Partner of FC Barcelona
            </span>
          </motion.div>

          {/* H1 — light weight, blue accent */}
          <motion.h1 variants={fadeUp} className="font-heading leading-[1.05]">
            <span className="block text-[56px] font-light text-white sm:text-[72px] lg:text-[88px]">
              Recover
            </span>
            <span className="block text-[56px] font-semibold text-brand-blue sm:text-[72px] lg:text-[88px]">
              Faster.
            </span>
          </motion.h1>

          {/* Subheading — muted */}
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-md font-body text-[18px] font-normal leading-relaxed text-brand-text-light lg:mx-0">
            BioFresh Tech phase-change cooling. Sustained 10–15°C for 60+ minutes. No ice. No freezer.
          </motion.p>

          {/* CTAs — blue primary, outline secondary */}
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
            <a
              href="/shop"
              className="rounded-full bg-brand-blue px-8 py-4 text-[15px] font-medium text-white transition-all duration-300 hover:bg-[#007bb0]"
            >
              Shop Now
            </a>
            <a
              href="/#technology"
              className="rounded-full border border-white/30 px-8 py-4 text-[15px] font-medium text-white transition-all duration-300 hover:bg-white/10"
            >
              Discover Technology
            </a>
          </motion.div>

          {/* Stats row — divided by vertical lines */}
          <motion.div
            variants={fadeUp}
            className="mt-16 flex justify-center gap-0 lg:justify-start"
          >
            {[
              { value: '10–15°C', label: 'Stable cooling' },
              { value: '60+ min', label: 'Autonomy' },
              { value: '3,000+', label: 'Athletes' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`px-6 text-center lg:text-left ${
                  i < 2 ? 'border-r border-white/10' : ''
                } ${i === 0 ? 'pl-0' : ''}`}
              >
                <p className="font-heading text-[36px] font-light text-white">{stat.value}</p>
                <p className="mt-1 font-body text-[11px] font-medium tracking-[0.1em] text-brand-text-light">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Product image — 45% */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex-1"
        >
          <Image
            src={featured.image}
            alt="Cold2Sport Thermal Short — flagship recovery garment for post-training cooling"
            width={600}
            height={600}
            priority
            className="mx-auto w-full max-w-sm rounded-2xl object-cover lg:max-w-md"
            style={{ mixBlendMode: 'normal' }}
          />
          {/* Floating spec cards — blue tinted borders */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="absolute -left-4 bottom-20 rounded-xl border border-brand-blue/30 bg-brand-navy/85 px-5 py-3 backdrop-blur-sm lg:left-0"
          >
            <p className="font-body text-[11px] font-medium tracking-[0.1em] text-brand-text-light">Temperature</p>
            <p className="font-heading text-xl font-light text-brand-blue">10–15°C</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="absolute -right-4 top-16 rounded-xl border border-brand-blue/30 bg-brand-navy/85 px-5 py-3 backdrop-blur-sm lg:right-0"
          >
            <p className="font-body text-[11px] font-medium tracking-[0.1em] text-brand-text-light">Autonomy</p>
            <p className="font-heading text-xl font-light text-brand-blue">+60 min</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
