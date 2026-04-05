'use client'

import { motion } from 'framer-motion'

const features = [
  {
    num: '01',
    title: 'Extended Autonomy',
    body: 'Sustained cooling from 10 to 15°C for over 60 minutes — the full post-match recovery window.',
    stat: '+60 min',
  },
  {
    num: '02',
    title: 'Precise Stability',
    body: 'PCM microcapsules maintain a stable temperature band, unlike ice which drops below safe thresholds.',
    stat: '±0.5°C',
  },
  {
    num: '03',
    title: 'Eco-Friendly',
    body: 'No disposable ice, no energy consumption. Reusable garments certified with OEKO-TEX Standard 100.',
    stat: '0 kWh',
  },
]

const stagger = { animate: { transition: { staggerChildren: 0.12 } } }
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function FeaturesGrid() {
  return (
    <section className="bg-white py-24">
      <motion.div
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto grid max-w-7xl gap-0 px-6 md:grid-cols-3 lg:px-8"
      >
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            className={`relative py-12 ${
              i < 2 ? 'md:border-r md:border-brand-border' : ''
            } ${i === 1 ? 'md:px-12' : i === 0 ? 'md:pr-12' : 'md:pl-12'}`}
          >
            {/* Decorative number */}
            <span className="font-heading text-[80px] font-light leading-none text-brand-gold/[0.15]">
              {f.num}
            </span>
            {/* Gold accent line */}
            <div className="mt-4 h-[2px] w-8 bg-brand-gold" />
            <h3 className="mt-5 font-heading text-[22px] font-normal text-brand-navy">
              {f.title}
            </h3>
            <p className="mt-3 font-body text-[16px] text-brand-text-mid">{f.body}</p>
            <span className="mt-6 inline-block rounded-full border border-brand-gold px-4 py-1.5 font-body text-[13px] font-medium text-brand-gold">
              {f.stat}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
