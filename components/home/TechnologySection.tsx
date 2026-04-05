'use client'

import { BlurFade } from '@/components/magicui/blur-fade'

const phases = [
  {
    phase: 'Phase 1',
    title: 'Post-Traumatic Therapy',
    time: '0–25 min',
    temp: '3–10°C',
    description: 'Immediate cold application for acute injury management. Reduces inflammation and swelling at the cellular level.',
    color: 'from-blue-400 to-cyan-300',
  },
  {
    phase: 'Phase 2',
    title: 'Muscle Recovery',
    time: '10–65 min',
    temp: '10–15°C',
    description: 'Sustained cooling at optimal temperature for muscle tissue recovery. Accelerates metabolic waste removal.',
    color: 'from-brand-blue to-blue-400',
  },
]

export default function TechnologySection() {
  return (
    <section id="technology" className="section-padding bg-brand-navy text-white">
      <div className="container-wide">
        <BlurFade className="text-center mb-14">
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            BioFresh Tech
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-white mt-3 tracking-tighter">
            Two therapies, <span className="font-serif italic text-brand-blue">one</span> product
          </h2>
          <p className="text-white/50 mt-4 max-w-2xl mx-auto">
            Our patented Phase Change Material technology adapts to deliver two distinct thermal
            therapies in a single garment — from acute injury to muscle recovery.
          </p>
        </BlurFade>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-16">
          {phases.map((p, i) => (
            <BlurFade key={p.phase} delay={i * 0.15}>
              <div className="relative p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden group hover:border-brand-blue/30 transition-colors">
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${p.color}`} />
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-heading font-medium text-brand-blue uppercase tracking-wider">
                    {p.phase}
                  </span>
                  <span className="text-xs text-white/30">|</span>
                  <span className="text-xs text-white/50">{p.time}</span>
                </div>
                <h3 className="text-xl font-heading font-medium text-white mb-2">{p.title}</h3>
                <div className="text-3xl font-heading font-light text-brand-blue mb-4 tracking-tight">
                  {p.temp}
                </div>
                <p className="text-sm text-white/50 leading-relaxed">{p.description}</p>
              </div>
            </BlurFade>
          ))}
        </div>

        {/* Temperature curve visualization */}
        <BlurFade>
          <div className="relative bg-white/5 rounded-2xl border border-white/10 p-8 md:p-12">
            <h3 className="text-lg font-heading font-medium text-white mb-8 text-center">
              PCM Temperature Behavior
            </h3>
            <div className="relative h-48 md:h-64">
              {/* Y axis labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-white/30 pr-4">
                <span>20°C</span>
                <span>15°C</span>
                <span>10°C</span>
                <span>5°C</span>
                <span>0°C</span>
              </div>
              {/* Grid lines */}
              <div className="absolute left-10 right-0 top-0 bottom-0">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-white/5"
                    style={{ top: `${i * 25}%` }}
                  />
                ))}
                {/* Recovery zone */}
                <div className="absolute left-0 right-0 bg-brand-blue/10 border-y border-brand-blue/20" style={{ top: '25%', bottom: '50%' }}>
                  <span className="absolute right-2 top-1 text-[10px] text-brand-blue/60 uppercase tracking-wider">
                    Recovery Zone
                  </span>
                </div>
                {/* Curve SVG */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                  <path
                    d="M0,20 C40,20 60,80 100,100 C140,120 160,120 200,115 C240,110 280,112 320,115 C360,118 380,120 400,122"
                    fill="none"
                    stroke="#009bdb"
                    strokeWidth="2.5"
                    opacity="0.8"
                  />
                  <path
                    d="M0,20 C40,20 60,80 100,100 C140,120 160,120 200,115 C240,110 280,112 320,115 C360,118 380,120 400,122 L400,200 L0,200 Z"
                    fill="url(#blueGrad)"
                    opacity="0.15"
                  />
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#009bdb" />
                      <stop offset="100%" stopColor="#009bdb" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              {/* X axis */}
              <div className="absolute left-10 right-0 -bottom-6 flex justify-between text-xs text-white/30">
                <span>0 min</span>
                <span>15 min</span>
                <span>30 min</span>
                <span>45 min</span>
                <span>60 min</span>
              </div>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
