'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const tabs = [
  {
    id: 'mission',
    label: 'Our Mission',
    content: 'To provide innovative thermal solutions for sportsmen and women and sport clubs, improving the performance, management and sustainability in the sports cooling.',
  },
  {
    id: 'vision',
    label: 'Our Vision',
    content: 'Drive disruptive changes in thermal management with new products focused on precision, autonomy, and environmental responsibility. Setting the global standard for athlete recovery.',
  },
  {
    id: 'values',
    label: 'Our Values',
    content: 'The union of professional sports experience with patented thermal technology — innovation born from the field, not the lab. Real-world solutions tested by real athletes.',
  },
]

export default function MissionSection() {
  const [activeTab, setActiveTab] = useState('mission')
  const active = tabs.find((t) => t.id === activeTab)!

  return (
    <section id="about" className="py-16 md:py-24 bg-brand-navy border-t border-white/5">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Image collage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden">
                <Image src="/cold2sport/images/cold2sport-nautic11-Baja.jpg" alt="Athlete using Cold2Sport" fill className="object-cover" />
              </div>
              <div className="relative aspect-square rounded-lg overflow-hidden">
                <Image src="/cold2sport/images/C2S-2025-07-09-0121-red.png" alt="Knee pad" fill className="object-cover" />
              </div>
            </div>
            <div className="pt-6 space-y-3">
              <div className="relative aspect-square rounded-lg overflow-hidden">
                <Image src="/cold2sport/images/cold2sport-nautic23-Baja-1-800x694.jpg" alt="Sports event" fill className="object-cover" />
              </div>
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden">
                <Image src="/cold2sport/images/Cold2Sport_Keyvisual_komprimiert_web.png" alt="Product" fill className="object-cover bg-brand-navy-deep" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-brand-blue/90 flex items-center justify-center cursor-pointer hover:bg-brand-blue transition-colors">
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Tabs */}
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-light text-white mb-6 tracking-tighter">
              Innovation in Recovery &amp; Athletic{' '}
              <span className="font-serif italic text-brand-blue">Performance</span>
            </h2>

            {/* Tab buttons */}
            <div className="flex gap-2 mb-5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-heading font-semibold transition-all uppercase tracking-wider ${
                    activeTab === tab.id
                      ? 'bg-brand-blue text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-white/40 leading-relaxed mb-8"
              >
                {active.content}
              </motion.p>
            </AnimatePresence>

            {/* Quote */}
            <div className="border-l-2 border-brand-blue/40 pl-5">
              <blockquote className="text-sm font-serif italic text-white/70 leading-relaxed mb-3">
                My greatest hope is to help athletes reduce muscle pain after matches with a more effective solution than the models used so far.
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                  <Image src="/cold2sport/images/isaac-co-founder.png" alt="Isaac Cuenca" width={32} height={32} className="object-cover w-full h-full" />
                </div>
                <div>
                  <div className="text-xs font-heading font-semibold text-white">Isaac Cuenca</div>
                  <div className="text-[10px] text-white/30">Co-Founder · Former FC Barcelona</div>
                </div>
              </div>
            </div>

            <Link href="#about" className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-heading font-semibold px-6 py-3 rounded transition-colors uppercase tracking-wider mt-6">
              About Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
