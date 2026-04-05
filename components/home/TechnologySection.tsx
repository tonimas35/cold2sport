'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export default function TechnologySection() {
  return (
    <section id="technology" className="relative py-20 md:py-32 bg-brand-navy text-white overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <Image
          src="https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic5-Baja.jpg"
          alt=""
          fill
          className="object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy via-brand-navy/95 to-brand-navy" />
      </div>

      <div className="container-wide relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            BioFresh Tech &middot; Patented Technology
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-white mt-3 tracking-tighter">
            Two therapies, <span className="font-serif italic text-brand-blue">one</span> product
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left — Visual temperature chart */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative bg-white/5 rounded-2xl border border-white/10 p-6 md:p-8">
              <h3 className="text-sm font-heading font-medium text-white/60 uppercase tracking-wider mb-6">
                PCM Temperature Behavior on Quadriceps &amp; Hamstrings
              </h3>

              {/* Chart */}
              <div className="relative h-52 md:h-64">
                {/* Y axis */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-white/25 w-8 text-right pr-2">
                  <span>20°C</span>
                  <span>15°C</span>
                  <span>10°C</span>
                  <span>5°C</span>
                  <span>0°C</span>
                </div>

                {/* Grid */}
                <div className="absolute left-10 right-0 top-0 bottom-8">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="absolute left-0 right-0 border-t border-white/5" style={{ top: `${i * 25}%` }} />
                  ))}

                  {/* Phase 1 zone */}
                  <div className="absolute left-0 bg-cyan-400/8 border-l-2 border-cyan-400/40" style={{ top: '50%', bottom: '0%', width: '25%' }}>
                    <span className="absolute bottom-full mb-1 left-1 text-[9px] text-cyan-400/60 font-heading uppercase tracking-wider whitespace-nowrap">
                      Phase 1: 3-10°C
                    </span>
                  </div>

                  {/* Phase 2 zone */}
                  <div className="absolute bg-brand-blue/10 border-l-2 border-brand-blue/40" style={{ top: '25%', bottom: '25%', left: '25%', right: '10%' }}>
                    <span className="absolute bottom-full mb-1 left-1 text-[9px] text-brand-blue/60 font-heading uppercase tracking-wider whitespace-nowrap">
                      Phase 2: 10-15°C
                    </span>
                  </div>

                  {/* Curve */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#009bdb" />
                        <stop offset="100%" stopColor="#009bdb" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,15 C30,15 50,70 80,100 C110,130 130,125 180,115 C230,108 280,112 330,115 C370,117 390,118 400,120"
                      fill="none" stroke="#009bdb" strokeWidth="3" opacity="0.9"
                    />
                    <path
                      d="M0,15 C30,15 50,70 80,100 C110,130 130,125 180,115 C230,108 280,112 330,115 C370,117 390,118 400,120 L400,200 L0,200 Z"
                      fill="url(#curveGrad)" opacity="0.12"
                    />
                    {/* Second curve for hamstrings */}
                    <path
                      d="M0,10 C40,10 60,65 90,90 C120,115 150,118 200,112 C250,106 300,108 350,112 C380,114 395,115 400,116"
                      fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.5" strokeDasharray="4,4"
                    />
                  </svg>
                </div>

                {/* X axis */}
                <div className="absolute left-10 right-0 bottom-0 flex justify-between text-[10px] text-white/25">
                  <span>0 min</span>
                  <span>15</span>
                  <span>30</span>
                  <span>45</span>
                  <span>60 min</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-brand-blue rounded" />
                  <span className="text-[10px] text-white/40">Quadriceps</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-cyan-400/50 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(34,211,238,0.5) 2px, rgba(34,211,238,0.5) 4px)' }} />
                  <span className="text-[10px] text-white/40">Hamstrings</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right — Phase descriptions */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Phase 1 */}
            <div className="relative pl-6 border-l-2 border-cyan-400/40">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-heading font-medium text-cyan-400 uppercase tracking-wider">Phase 1</span>
                <span className="text-xs text-white/30">0–25 min</span>
              </div>
              <h3 className="text-xl font-heading font-medium text-white mb-1">Post-Traumatic Therapy</h3>
              <div className="text-2xl font-heading font-light text-cyan-400 mb-2">3–10°C</div>
              <p className="text-sm text-white/40 leading-relaxed">
                Immediate cold application for acute injury management. Reduces inflammation and swelling at the cellular level. Ideal for sprains, strains, and post-surgery recovery.
              </p>
            </div>

            {/* Phase 2 */}
            <div className="relative pl-6 border-l-2 border-brand-blue/60">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-heading font-medium text-brand-blue uppercase tracking-wider">Phase 2</span>
                <span className="text-xs text-white/30">10–65 min</span>
              </div>
              <h3 className="text-xl font-heading font-medium text-white mb-1">Muscle Recovery</h3>
              <div className="text-2xl font-heading font-light text-brand-blue mb-2">10–15°C</div>
              <p className="text-sm text-white/40 leading-relaxed">
                Sustained cooling at optimal temperature for muscle tissue recovery. Accelerates metabolic waste removal and reduces post-exercise inflammation.
              </p>
            </div>

            {/* BioFresh Tech logo */}
            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
              <Image
                src="https://cold2sport.com/wp-content/uploads/2024/11/biofreshtech-14.png"
                alt="BioFreshTech"
                width={100}
                height={30}
                className="h-8 w-auto object-contain opacity-50"
              />
              <p className="text-xs text-white/30">
                Patented Phase Change Material technology
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
