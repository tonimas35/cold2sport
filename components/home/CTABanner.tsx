'use client'

import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'

export default function CTABanner() {
  return (
    <section id="contact" className="section-contained bg-brand-darker py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-blue/5 to-transparent" />
      <div className="absolute left-1/2 top-0 h-[1px] w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 blob-blue opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7 }}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center lg:px-8"
      >
        <h2 className="font-display text-4xl font-bold tracking-tight text-white lg:text-5xl">
          Ready to recover like<br />
          <span className="text-gradient-blue">a professional?</span>
        </h2>
        <p className="mt-5 text-lg text-gray-400">
          Join FC Barcelona, LaLiga athletes, and over 3,000 sports professionals already using Cold2Sport.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button href="/shop" size="lg">
            Shop Now
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
          <Button href="mailto:info@cold2sport.com" variant="outline-white" size="lg">
            Contact Us
          </Button>
        </div>
        <p className="mt-8 text-[12px] tracking-wider text-gray-600">info@cold2sport.com</p>
      </motion.div>
    </section>
  )
}
