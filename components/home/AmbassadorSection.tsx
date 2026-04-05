'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'

export default function AmbassadorSection() {
  return (
    <section className="section-contained bg-brand-darker py-24">
      <div className="grain absolute inset-0 overflow-hidden" />
      <div className="absolute right-0 top-0 h-[500px] w-[500px] blob-gold opacity-30" />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="relative flex-1"
        >
          <Image
            src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=80"
            alt="Football on a pitch — representing Cold2Sport ambassador Andrés Iniesta"
            width={600}
            height={400}
            className="w-full rounded-3xl object-cover grayscale transition-all duration-700 hover:grayscale-0 hover:shadow-glow-gold"
          />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-brand-darker/60 to-transparent" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1"
        >
          <svg className="mb-6 h-12 w-12 text-brand-gold/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <blockquote className="font-display text-2xl font-bold leading-snug tracking-tight text-white lg:text-3xl">
            &ldquo;Cold2Sport technology gave my muscles the recovery they deserved after every match. I wish I had this during my peak years at Barça.&rdquo;
          </blockquote>
          <div className="mt-8">
            <p className="font-display text-lg font-bold text-gradient-gold">Andrés Iniesta</p>
            <p className="mt-2 text-[13px] tracking-wide text-gray-500">
              World Cup Winner &middot; FC Barcelona Legend &middot; Cold2Sport Ambassador
            </p>
          </div>
          <div className="mt-8">
            <Button href="/about" variant="gold" size="md">
              Read his story
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
