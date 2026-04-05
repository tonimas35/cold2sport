'use client'

import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'

export default function TechnologySection() {
  return (
    <section id="technology" className="py-20 md:py-28 bg-brand-navy text-white">
      <div className="container-wide">
        <AnimatedSection className="text-center mb-14">
          <span className="text-brand-blue text-xs font-heading font-semibold tracking-wider uppercase">
            BioFresh Tech · Patented Technology
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-white mt-3 tracking-tighter">
            Two therapies, <span className="font-serif italic text-brand-blue">one</span> product
          </h2>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Chart */}
          <AnimatedSection>
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 md:p-8">
              <h3 className="text-xs font-heading font-medium text-white/50 uppercase tracking-wider mb-6">
                PCM Temperature on Quadriceps &amp; Hamstrings
              </h3>
              <div className="relative h-48 md:h-56">
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-white/25 w-8 text-right pr-2">
                  <span>20°C</span><span>15°C</span><span>10°C</span><span>5°C</span><span>0°C</span>
                </div>
                <div className="absolute left-10 right-0 top-0 bottom-8">
                  {[0,1,2,3,4].map(i => <div key={i} className="absolute left-0 right-0 border-t border-white/5" style={{top:`${i*25}%`}} />)}
                  <div className="absolute left-0 bg-cyan-400/5 border-l-2 border-cyan-400/30" style={{top:'50%',bottom:'0%',width:'25%'}}>
                    <span className="absolute bottom-full mb-1 left-1 text-[8px] text-cyan-400/50 font-heading uppercase tracking-wider whitespace-nowrap">Phase 1: 3-10°C</span>
                  </div>
                  <div className="absolute bg-brand-blue/8 border-l-2 border-brand-blue/30" style={{top:'25%',bottom:'25%',left:'25%',right:'10%'}}>
                    <span className="absolute bottom-full mb-1 left-1 text-[8px] text-brand-blue/50 font-heading uppercase tracking-wider whitespace-nowrap">Phase 2: 10-15°C</span>
                  </div>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#009bdb"/><stop offset="100%" stopColor="#009bdb" stopOpacity="0"/></linearGradient></defs>
                    <path d="M0,15 C30,15 50,70 80,100 C110,130 130,125 180,115 C230,108 280,112 330,115 C370,117 390,118 400,120" fill="none" stroke="#009bdb" strokeWidth="3" opacity="0.9"/>
                    <path d="M0,15 C30,15 50,70 80,100 C110,130 130,125 180,115 C230,108 280,112 330,115 C370,117 390,118 400,120 L400,200 L0,200 Z" fill="url(#cg)" opacity="0.1"/>
                    <path d="M0,10 C40,10 60,65 90,90 C120,115 150,118 200,112 C250,106 300,108 350,112 C380,114 395,115 400,116" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.4" strokeDasharray="4,4"/>
                  </svg>
                </div>
                <div className="absolute left-10 right-0 bottom-0 flex justify-between text-[10px] text-white/25">
                  <span>0 min</span><span>15</span><span>30</span><span>45</span><span>60 min</span>
                </div>
              </div>
              <div className="flex gap-6 mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-brand-blue rounded"/><span className="text-[10px] text-white/30">Quadriceps</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-cyan-400/50 rounded"/><span className="text-[10px] text-white/30">Hamstrings</span></div>
              </div>
            </div>
          </AnimatedSection>

          {/* Phases */}
          <AnimatedSection delay={0.15}>
            <div className="space-y-6">
              <div className="pl-5 border-l-2 border-cyan-400/40">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-heading font-medium text-cyan-400 uppercase tracking-wider">Phase 1</span>
                  <span className="text-xs text-white/20">0–25 min</span>
                </div>
                <h3 className="text-lg font-heading font-medium text-white mb-1">Post-Traumatic Therapy</h3>
                <div className="text-2xl font-heading font-light text-cyan-400 mb-2">3–10°C</div>
                <p className="text-xs text-white/35 leading-relaxed">Immediate cold for acute injury. Reduces inflammation and swelling at the cellular level.</p>
              </div>
              <div className="pl-5 border-l-2 border-brand-blue/50">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-heading font-medium text-brand-blue uppercase tracking-wider">Phase 2</span>
                  <span className="text-xs text-white/20">10–65 min</span>
                </div>
                <h3 className="text-lg font-heading font-medium text-white mb-1">Muscle Recovery</h3>
                <div className="text-2xl font-heading font-light text-brand-blue mb-2">10–15°C</div>
                <p className="text-xs text-white/35 leading-relaxed">Sustained cooling at optimal temperature. Accelerates metabolic waste removal.</p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <Image src="https://cold2sport.com/wp-content/uploads/2024/11/biofreshtech-14.png" alt="BioFreshTech" width={80} height={24} className="h-6 w-auto object-contain opacity-40 invert" />
                <p className="text-[10px] text-white/25">Patented Phase Change Material technology</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
