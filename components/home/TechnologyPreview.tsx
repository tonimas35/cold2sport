'use client'

import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'

const stats = [
  { value: '10–15°C', label: 'Stable range' },
  { value: '+60 min', label: 'Sustained cooling' },
  { value: '0 kWh', label: 'Energy used' },
]

export default function TechnologyPreview() {
  return (
    <section id="technology" className="section-contained bg-brand-dark py-24">
      <div className="absolute left-1/4 top-0 h-[300px] w-[300px] blob-blue opacity-20" />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:gap-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="flex-1"
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue">
            BioFresh Tech
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white lg:text-4xl">
            The science of<br />sustainable cold
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-400">
            Unlike ice baths that drop temperature uncontrollably, BioFresh Tech PCM microcapsules
            absorb body heat at a precise threshold, maintaining a stable 10–15°C for the entire
            recovery window.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            {stats.map((s) => (
              <div key={s.label} className="glass-card rounded-2xl px-6 py-4 text-center">
                <p className="font-display text-2xl font-bold text-brand-blue">{s.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Button href="/#technology" variant="outline-white" size="md">
              Full Technology Page
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
          <div className="glass-card rounded-3xl p-10">
            <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
              Thermal Phase Diagram
            </p>
            <svg viewBox="0 0 400 220" className="w-full" role="img" aria-label="BioFresh Tech thermal phase diagram showing three cooling phases">
              {/* Grid lines */}
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="50" y1={y} x2="380" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}

              {/* Axes */}
              <line x1="50" y1="175" x2="380" y2="175" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="50" y1="30" x2="50" y2="175" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <text x="215" y="198" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="system-ui">Time →</text>
              <text x="18" y="100" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="system-ui" transform="rotate(-90 18 100)">Temp</text>

              {/* Phase zones */}
              <rect x="60" y="35" width="90" height="135" rx="6" fill="rgba(0,180,255,0.06)" />
              <rect x="155" y="35" width="115" height="135" rx="6" fill="rgba(212,165,116,0.08)" stroke="rgba(212,165,116,0.2)" strokeWidth="1" />
              <rect x="275" y="35" width="100" height="135" rx="6" fill="rgba(255,255,255,0.02)" />

              {/* Phase labels */}
              <text x="105" y="110" textAnchor="middle" fill="rgba(0,180,255,0.5)" fontSize="9" fontWeight="600">Solid</text>
              <text x="212" y="105" textAnchor="middle" fill="#d4a574" fontSize="9" fontWeight="700">Phase Change</text>
              <text x="212" y="120" textAnchor="middle" fill="rgba(212,165,116,0.6)" fontSize="7">BioFresh Window</text>
              <text x="325" y="110" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="9">Liquid</text>

              {/* Temperature curve */}
              <path
                d="M 60 150 C 90 130, 120 100, 155 85 L 270 85 C 300 65, 340 45, 375 35"
                fill="none"
                stroke="url(#curveGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="curveGrad" x1="0" x2="1">
                  <stop offset="0%" stopColor="#009bdb" />
                  <stop offset="40%" stopColor="#d4a574" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Stable zone line */}
              <line x1="155" y1="85" x2="270" y2="85" stroke="#d4a574" strokeWidth="2" strokeDasharray="4 3" opacity="0.6" />

              {/* Dots on curve */}
              <circle cx="155" cy="85" r="4" fill="#d4a574" />
              <circle cx="270" cy="85" r="4" fill="#d4a574" />

              {/* Temperature annotations */}
              <text x="147" y="78" textAnchor="end" fill="#d4a574" fontSize="8" fontWeight="600">10°C</text>
              <text x="278" y="78" fill="#d4a574" fontSize="8" fontWeight="600">15°C</text>
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
