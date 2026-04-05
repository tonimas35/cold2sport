'use client'

import { motion } from 'framer-motion'

export default function CTABanner() {
  return (
    <section id="contact" className="bg-brand-gold py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7 }}
        className="mx-auto max-w-3xl px-6 text-center lg:px-8"
      >
        <h2 className="font-heading text-[48px] font-light leading-tight text-brand-navy">
          Ready to recover like a professional?
        </h2>
        <p className="mt-5 font-body text-[18px] text-brand-navy/65">
          Join FC Barcelona, LaLiga athletes, and over 3,000 sports professionals already using Cold2Sport.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="/shop"
            className="rounded-full bg-brand-navy px-8 py-4 text-[15px] font-medium text-white transition-all duration-300 hover:bg-brand-navy/90"
          >
            Shop Now
          </a>
          <a
            href="mailto:info@cold2sport.com"
            className="rounded-full border border-brand-navy/40 px-8 py-4 text-[15px] font-medium text-brand-navy transition-all duration-300 hover:bg-brand-navy/10"
          >
            Contact Us
          </a>
        </div>
        <p className="mt-8 font-body text-[13px] text-brand-navy/40">info@cold2sport.com</p>
      </motion.div>
    </section>
  )
}
