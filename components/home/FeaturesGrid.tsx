'use client'

import { motion } from 'framer-motion'

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
    title: 'Extended Autonomy',
    body: 'Sustained cooling from 10 to 15°C for over 60 minutes — the full post-match recovery window.',
    stat: '+60 min',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Precise Stability',
    body: 'PCM microcapsules maintain a stable temperature band, unlike ice which drops below safe thresholds.',
    stat: '±0.5°C',
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036" />
      </svg>
    ),
    title: 'Eco-Friendly',
    body: 'No disposable ice, no energy consumption. Reusable garments certified with OEKO-TEX Standard 100.',
    stat: '0 kWh',
  },
]

const stagger = { animate: { transition: { staggerChildren: 0.12 } } }
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function FeaturesGrid() {
  return (
    <section className="section-contained bg-brand-darker py-24">
      <div className="absolute right-0 top-0 h-[300px] w-[300px] blob-blue opacity-30" />
      <motion.div
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-80px' }}
        className="relative z-10 mx-auto grid max-w-7xl gap-6 px-6 md:grid-cols-3 lg:px-8"
      >
        {features.map((f) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            className="glass-card group rounded-3xl p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue transition-all duration-400 group-hover:bg-brand-blue/20 group-hover:shadow-glow">
              {f.icon}
            </div>
            <h3 className="font-display text-xl font-bold tracking-tight text-white">{f.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">{f.body}</p>
            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <span className="font-display text-2xl font-bold text-brand-blue">{f.stat}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
