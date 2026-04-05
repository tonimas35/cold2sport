'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import SectionHeader from '@/components/ui/SectionHeader'
import Button from '@/components/ui/Button'

const milestones = [
  { period: '2022 Q1', title: 'Cold2Sport incorporated in Tarragona, Spain' },
  { period: '2022 Q3', title: 'BioFresh Tech PCM patent filed (ES202230145)' },
  { period: '2023 Q1', title: 'First 200 Thermal Shorts sold via D2C' },
  { period: '2023 Q4', title: 'Partnership with Spanish Athletics Federation' },
  { period: '2024 Q2', title: 'Andrés Iniesta named global brand ambassador' },
  { period: '2024 Q4', title: 'Official Recovery Partner of FC Barcelona' },
  { period: '2025 Q1', title: 'European distribution: France, Germany, Italy' },
]

const values = [
  {
    title: 'Innovation',
    body: 'We question every assumption in sports recovery. If it can be improved with science, we will improve it.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  {
    title: 'Sustainability',
    body: 'Every Cold2Sport garment replaces hundreds of single-use ice bags. Reusable, washable, durable.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75" />
      </svg>
    ),
  },
  {
    title: 'Performance',
    body: 'We design for elite athletes, which means the science is uncompromising. Good enough is never good enough.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
]

export default function AboutContent() {
  return (
    <>
      {/* Hero */}
      <section className="section-contained bg-brand-darker pt-36 pb-24">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="grain absolute inset-0 overflow-hidden" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 blob-blue opacity-15" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 mx-auto max-w-3xl px-6 text-center lg:px-8"
        >
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue">Our Story</p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white lg:text-6xl">
            Recovery technology<br />born from experience
          </h1>
          <p className="mt-6 text-xl leading-relaxed text-gray-400">
            Cold2Sport was founded in Tarragona, Spain in 2022 by Isaac Cuenca — because elite
            recovery shouldn&apos;t only be available to the elite.
          </p>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mt-10 text-gray-600"
          >
            <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* Founder Story */}
      <section className="section-contained bg-brand-dark py-24">
        <div className="absolute right-0 top-0 h-[300px] w-[300px] blob-gold opacity-20" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="flex-1"
          >
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80"
                alt="Isaac Cuenca, Founder and CEO of Cold2Sport, former FC Barcelona player"
                width={500}
                height={600}
                className="w-full rounded-3xl object-cover"
              />
              <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1"
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue">
              Isaac Cuenca &middot; Founder &amp; CEO
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white lg:text-4xl">
              From the pitch<br />to the lab
            </h2>
            <div className="mt-6 space-y-5 text-gray-400 leading-relaxed">
              <p>
                Isaac Cuenca spent 8 years in professional football, with stints at FC Barcelona B,
                Ajax, Deportivo de La Coruña and Valencia CF. In 2019, a recurring hamstring injury
                forced him to confront the limitations of traditional ice-bath recovery.
              </p>
              <p>
                Frustrated that the PCM technology used in aerospace and pharmaceutical cold chains
                had never been adapted for athletic garments, Isaac partnered with materials engineer
                Jordi Mas and sports scientist Dr. Marta Solà to found Cold2Sport.
              </p>
              <p>
                The result was BioFresh Tech — a patented phase-change microencapsulation system that
                delivers sustained, precise, portable cooling.
                <span className="font-semibold text-white"> No ice. No electricity. No compromise.</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-contained bg-brand-darker py-24">
        <div className="absolute left-0 top-1/2 h-[300px] w-[300px] -translate-y-1/2 blob-blue opacity-10" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8">
          <SectionHeader title="Company milestones" light />
          <div className="relative">
            <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-brand-blue/30 via-brand-gold/30 to-transparent md:left-1/2" />

            <div className="space-y-10">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.period}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className={`relative flex items-start gap-8 ${
                    i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Glowing dot */}
                  <div className="absolute left-5 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full bg-brand-gold shadow-[0_0_10px_rgba(212,165,116,0.4)] md:left-1/2" />

                  <div
                    className={`ml-12 md:ml-0 md:w-[44%] ${
                      i % 2 === 0 ? 'md:text-right md:pr-10' : 'md:text-left md:pl-10'
                    }`}
                  >
                    <p className="font-display text-sm font-bold text-brand-gold">{m.period}</p>
                    <p className="mt-1 text-white/80">{m.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BioFresh Tech */}
      <section className="section-contained bg-brand-dark py-24">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="flex-1"
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue">Technology Partner</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white lg:text-4xl">
              BioFresh Tech —<br />the science inside
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-400">
              BioFresh Tech is a Barcelona-based materials science company specialising in
              phase-change microencapsulation for industrial and consumer applications. Cold2Sport is
              their exclusive licensee in the sports recovery segment.
            </p>
            <div className="mt-10 flex flex-wrap gap-8">
              {[
                { value: '3', label: 'Patents held' },
                { value: '12', label: 'Years R&D' },
                { value: '98°C', label: 'Activation threshold' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-3xl font-bold text-brand-blue">{stat.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Button href="/#technology" variant="outline-white" size="md">
                Learn about the technology →
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1"
          >
            <div className="glass-card flex items-center justify-center rounded-3xl p-14">
              <svg viewBox="0 0 200 200" className="h-56 w-56" role="img" aria-label="BioFresh Tech PCM microcapsule structure">
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,180,255,0.08)" strokeWidth="1" />
                <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(0,180,255,0.12)" strokeWidth="1.5" />
                <circle cx="100" cy="100" r="50" fill="rgba(0,180,255,0.04)" stroke="rgba(0,180,255,0.2)" strokeWidth="2" />
                <circle cx="100" cy="100" r="28" fill="rgba(212,165,116,0.06)" stroke="#d4a574" strokeWidth="1.5" opacity="0.6" />
                <circle cx="100" cy="100" r="10" fill="rgba(212,165,116,0.3)" />
                <text x="100" y="150" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontWeight="600">PCM Microcapsule</text>
                <text x="100" y="162" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7">Phase-Change Core</text>
                <line x1="130" y1="72" x2="160" y2="50" stroke="rgba(0,180,255,0.3)" strokeWidth="0.5" />
                <text x="162" y="50" fill="rgba(0,180,255,0.5)" fontSize="6">Shell</text>
                <line x1="118" y1="100" x2="155" y2="100" stroke="rgba(212,165,116,0.3)" strokeWidth="0.5" />
                <text x="157" y="100" fill="rgba(212,165,116,0.5)" fontSize="6">PCM</text>
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="section-contained bg-brand-darker py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHeader label="Our Values" title="What drives us" light />
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card rounded-3xl p-8"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                  {v.icon}
                </div>
                <h3 className="font-display text-xl font-bold tracking-tight text-white">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section-contained bg-brand-dark py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-blue/3 to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">Get in touch</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div className="glass-card rounded-2xl p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Email</p>
              <a href="mailto:info@cold2sport.com" className="mt-2 block text-sm text-white transition-colors hover:text-brand-blue">
                info@cold2sport.com
              </a>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Location</p>
              <p className="mt-2 text-sm text-white">Tarragona, Catalonia</p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Social</p>
              <div className="mt-2 flex justify-center gap-3">
                <a href="https://instagram.com/cold2.sport" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white/60 hover:text-brand-blue">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://linkedin.com/company/cold2sport" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-white/60 hover:text-brand-blue">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://tiktok.com/@cold2sport" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-white/60 hover:text-brand-blue">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
