'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export default function AmbassadorSection() {
  return (
    <section className="overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Left: Iniesta photo — full bleed, no border-radius */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative aspect-square lg:aspect-auto lg:w-1/2"
        >
          <Image
            src="https://cold2sport.com/wp-content/uploads/2025/01/IG-Iniesta.jpg"
            alt="Andres Iniesta wearing Cold2Sport recovery garments"
            fill
            className="object-cover"
            style={{ filter: 'grayscale(20%) contrast(1.05)' }}
          />
        </motion.div>

        {/* Right: Quote on cream */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex flex-1 flex-col justify-center bg-brand-offwhite px-8 py-16 sm:px-12 lg:px-20 lg:py-24"
        >
          {/* Blue accent line */}
          <div className="h-[2px] w-10 bg-brand-blue" />

          <blockquote className="mt-8 font-serif text-[32px] italic leading-[1.4] text-brand-navy sm:text-[38px]">
            &ldquo;My greatest hope is to help athletes to reduce muscle pain after matches with a more effective solution than the thermal models used so far.&rdquo;
          </blockquote>

          <div className="mt-8">
            <p className="font-heading text-[16px] font-semibold tracking-[0.05em] text-brand-blue">
              Andres Iniesta
            </p>
            <p className="mt-1 font-body text-[13px] text-brand-text-light">
              World Cup Winner &middot; FC Barcelona Legend &middot; Cold2Sport Ambassador
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
