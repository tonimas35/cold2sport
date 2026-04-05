'use client'

import { motion } from 'framer-motion'

const stats = [
  { value: '10–15°C', label: 'Stable range' },
  { value: '+60 min', label: 'Sustained cooling' },
  { value: '0 kWh', label: 'Energy used' },
]

export default function TechnologyPreview() {
  return (
    <section id="technology" className="bg-brand-navy py-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="flex-1"
        >
          <p className="mb-3 font-body text-[11px] font-medium tracking-[0.1em] text-brand-blue">
            BioFresh Tech
          </p>
          <h2 className="font-heading text-[48px] font-normal leading-tight text-white">
            The science of sustainable cold
          </h2>
          <p className="mt-5 font-body text-[17px] leading-relaxed text-brand-text-light">
            Unlike ice baths that drop temperature uncontrollably, BioFresh Tech PCM microcapsules
            absorb body heat at a precise threshold, maintaining a stable 10–15°C for the entire
            recovery window.
          </p>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-heading text-[52px] font-light text-brand-blue">{s.value}</p>
                <p className="mt-1 font-body text-[11px] font-medium tracking-[0.1em] text-white/50">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <a
              href="/#technology"
              className="rounded-full border border-brand-blue/40 px-7 py-3 text-[14px] font-medium text-brand-blue transition-all duration-300 hover:bg-brand-blue/10"
            >
              Full Technology Page
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10">
            <p className="mb-6 text-center font-body text-[11px] font-medium tracking-[0.15em] text-white/30">
              Thermal Phase Diagram
            </p>
            <svg viewBox="0 0 400 220" className="w-full" role="img" aria-label="BioFresh Tech thermal phase diagram showing three cooling phases">
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="50" y1={y} x2="380" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              ))}
              <line x1="50" y1="175" x2="380" y2="175" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <line x1="50" y1="30" x2="50" y2="175" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x="215" y="198" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10">Time →</text>
              <text x="18" y="100" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" transform="rotate(-90 18 100)">Temp</text>

              <rect x="60" y="35" width="90" height="135" rx="4" fill="rgba(0,155,219,0.06)" />
              <rect x="155" y="35" width="115" height="135" rx="4" fill="rgba(0,155,219,0.12)" stroke="rgba(0,155,219,0.4)" strokeWidth="1" />
              <rect x="275" y="35" width="100" height="135" rx="4" fill="rgba(255,255,255,0.02)" />

              <text x="105" y="110" textAnchor="middle" fill="rgba(0,155,219,0.4)" fontSize="10" fontWeight="500">Solid</text>
              <text x="212" y="105" textAnchor="middle" fill="#009bdb" fontSize="10" fontWeight="600">Phase Change</text>
              <text x="212" y="122" textAnchor="middle" fill="rgba(0,155,219,0.5)" fontSize="8">BioFresh Window</text>
              <text x="325" y="110" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="10">Liquid</text>

              <path
                d="M 60 150 C 90 130, 120 100, 155 85 L 270 85 C 300 65, 340 45, 375 35"
                fill="none"
                stroke="#009bdb"
                strokeWidth="2"
                strokeLinecap="round"
              />

              <line x1="155" y1="85" x2="270" y2="85" stroke="#009bdb" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
              <circle cx="155" cy="85" r="3.5" fill="#009bdb" />
              <circle cx="270" cy="85" r="3.5" fill="#009bdb" />
              <text x="148" y="78" textAnchor="end" fill="#009bdb" fontSize="9" fontWeight="500">10°C</text>
              <text x="278" y="78" fill="#009bdb" fontSize="9" fontWeight="500">15°C</text>
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
