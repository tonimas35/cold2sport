'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

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
  { title: 'Innovation', body: 'We question every assumption in sports recovery. If it can be improved with science, we will improve it.' },
  { title: 'Sustainability', body: 'Every Cold2Sport garment replaces hundreds of single-use ice bags. Reusable, washable, durable.' },
  { title: 'Performance', body: 'We design for elite athletes, which means the science is uncompromising. Good enough is never good enough.' },
]

export default function AboutContent() {
  return (
    <>
      {/* Hero — navy */}
      <section className="bg-brand-navy pt-36 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl px-6 text-center lg:px-8"
        >
          <p className="mb-4 font-body text-[11px] font-medium tracking-[0.1em] text-brand-gold">Our story</p>
          <h1 className="font-heading text-[48px] font-light leading-tight text-white lg:text-[64px]">
            Recovery technology born from experience
          </h1>
          <p className="mt-6 font-body text-[18px] leading-relaxed text-brand-text-light">
            Cold2Sport was founded in Tarragona, Spain in 2022 by Isaac Cuenca — because elite
            recovery shouldn&apos;t only be available to the elite.
          </p>
        </motion.div>
      </section>

      {/* Founder — white */}
      <section className="bg-white py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex-1"
          >
            <Image
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80"
              alt="Isaac Cuenca, Founder and CEO of Cold2Sport"
              width={500}
              height={600}
              className="w-full object-cover shadow-md"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="flex-1"
          >
            <p className="mb-3 font-body text-[11px] font-medium tracking-[0.1em] text-brand-gold">
              Isaac Cuenca &middot; Founder &amp; CEO
            </p>
            <h2 className="font-heading text-[48px] font-normal leading-tight text-brand-navy">
              From the pitch to the lab
            </h2>
            <div className="mt-6 space-y-5 font-body text-[16px] leading-relaxed text-brand-text-mid">
              <p>Isaac Cuenca spent 8 years in professional football, with stints at FC Barcelona B, Ajax, Deportivo de La Coruña and Valencia CF. In 2019, a recurring hamstring injury forced him to confront the limitations of traditional ice-bath recovery.</p>
              <p>Frustrated that the PCM technology used in aerospace and pharmaceutical cold chains had never been adapted for athletic garments, Isaac partnered with materials engineer Jordi Mas and sports scientist Dr. Marta Solà to found Cold2Sport.</p>
              <p>The result was BioFresh Tech — a patented phase-change microencapsulation system that delivers sustained, precise, portable cooling. <span className="font-medium text-brand-navy">No ice. No electricity. No compromise.</span></p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline — cream */}
      <section className="bg-brand-cream py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="font-heading text-[48px] font-normal text-brand-navy">Company milestones</h2>
          </div>
          <div className="relative">
            <div className="absolute left-5 top-0 h-full w-px bg-brand-gold/30 md:left-1/2" />
            <div className="space-y-10">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.period}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className={`relative flex items-start gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  <div className="absolute left-5 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full bg-brand-gold md:left-1/2" />
                  <div className={`ml-12 md:ml-0 md:w-[44%] ${i % 2 === 0 ? 'md:text-right md:pr-10' : 'md:text-left md:pl-10'}`}>
                    <p className="font-heading text-[14px] font-semibold text-brand-gold">{m.period}</p>
                    <p className="mt-1 font-body text-[15px] text-brand-navy">{m.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BioFresh Tech — navy */}
      <section className="bg-brand-navy py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex-1"
          >
            <p className="mb-3 font-body text-[11px] font-medium tracking-[0.1em] text-brand-blue">Technology Partner</p>
            <h2 className="font-heading text-[48px] font-normal leading-tight text-white">
              BioFresh Tech — the science inside
            </h2>
            <p className="mt-5 font-body text-[17px] leading-relaxed text-brand-text-light">
              BioFresh Tech is a Barcelona-based materials science company specialising in phase-change microencapsulation. Cold2Sport is their exclusive licensee in the sports recovery segment.
            </p>
            <div className="mt-10 flex flex-wrap gap-10">
              {[
                { value: '3', label: 'Patents held' },
                { value: '12', label: 'Years R&D' },
                { value: '98°C', label: 'Activation threshold' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-heading text-[52px] font-light text-brand-gold">{stat.value}</p>
                  <p className="mt-1 font-body text-[11px] font-medium tracking-[0.1em] text-white/50">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1"
          >
            <div className="flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-14">
              <svg viewBox="0 0 200 200" className="h-56 w-56" role="img" aria-label="BioFresh Tech PCM microcapsule structure">
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,155,219,0.1)" strokeWidth="1" />
                <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(0,155,219,0.15)" strokeWidth="1" />
                <circle cx="100" cy="100" r="50" fill="rgba(0,155,219,0.04)" stroke="rgba(0,155,219,0.2)" strokeWidth="1.5" />
                <circle cx="100" cy="100" r="28" fill="rgba(205,162,116,0.06)" stroke="#cda274" strokeWidth="1.5" opacity="0.6" />
                <circle cx="100" cy="100" r="10" fill="rgba(205,162,116,0.3)" />
                <text x="100" y="150" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">PCM Microcapsule</text>
                <text x="100" y="162" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7">Phase-Change Core</text>
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values — white */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className="mb-3 font-body text-[11px] font-medium tracking-[0.1em] text-brand-gold">Our values</p>
            <h2 className="font-heading text-[48px] font-normal text-brand-navy">What drives us</h2>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="h-[2px] w-8 bg-brand-gold" />
                <h3 className="mt-5 font-heading text-[22px] font-normal text-brand-navy">{v.title}</h3>
                <p className="mt-3 font-body text-[15px] leading-relaxed text-brand-text-mid">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact — cream */}
      <section className="bg-brand-cream py-24">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h2 className="font-heading text-[48px] font-normal text-brand-navy">Get in touch</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-brand-border bg-white p-6">
              <p className="font-body text-[11px] font-medium tracking-[0.1em] text-brand-text-light">Email</p>
              <a href="mailto:info@cold2sport.com" className="mt-2 block font-body text-[14px] text-brand-navy hover:text-brand-gold">info@cold2sport.com</a>
            </div>
            <div className="rounded-2xl border border-brand-border bg-white p-6">
              <p className="font-body text-[11px] font-medium tracking-[0.1em] text-brand-text-light">Location</p>
              <p className="mt-2 font-body text-[14px] text-brand-navy">Tarragona, Catalonia</p>
            </div>
            <div className="rounded-2xl border border-brand-border bg-white p-6">
              <p className="font-body text-[11px] font-medium tracking-[0.1em] text-brand-text-light">Social</p>
              <div className="mt-2 flex justify-center gap-4">
                <a href="https://instagram.com/cold2.sport" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-brand-text-mid hover:text-brand-gold">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://linkedin.com/company/cold2sport" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-brand-text-mid hover:text-brand-gold">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
