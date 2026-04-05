'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

const tabs = [
  {
    id: 'mission',
    label: 'Our Mission',
    icon: '🎯',
    content: 'To provide innovative thermal solutions for sportsmen and women and sport clubs, improving the performance, management and sustainability in the sports cooling.',
  },
  {
    id: 'vision',
    label: 'Our Vision',
    icon: '🔭',
    content: 'Drive disruptive changes in thermal management with new products focused on precision, autonomy, and environmental responsibility. Setting the global standard for athlete recovery.',
  },
  {
    id: 'values',
    label: 'Our Values',
    icon: '💎',
    content: 'The union of professional sports experience with patented thermal technology — innovation born from the field, not the lab. We believe in real-world solutions tested by real athletes.',
  },
]

export default function MissionSection() {
  const [activeTab, setActiveTab] = useState('mission')
  const active = tabs.find((t) => t.id === activeTab)!

  return (
    <section id="about" className="py-16 md:py-24 bg-white">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Images collage */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden">
                  <Image
                    src="https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic5-Baja.jpg"
                    alt="Athlete using Cold2Sport"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-square rounded-xl overflow-hidden">
                  <Image
                    src="https://cold2sport.com/wp-content/uploads/2024/12/C2S-2025-07-09-0121.jpg"
                    alt="Cold2Sport knee pad"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="pt-8 space-y-3">
                <div className="relative aspect-square rounded-xl overflow-hidden">
                  <Image
                    src="https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic23-Baja.jpg"
                    alt="Cold2Sport at sports event"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden">
                  <Image
                    src="https://cold2sport.com/wp-content/uploads/2024/11/COLD2SPORT25294.jpg"
                    alt="Thermal Short"
                    fill
                    className="object-cover"
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-brand-blue/90 flex items-center justify-center shadow-lg hover:bg-brand-blue transition-colors cursor-pointer">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right — Tabs content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
              About Cold2Sport
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 mb-8 tracking-tighter">
              Innovation in Recovery &amp;<br />
              Athletic <span className="font-serif italic">Performance</span>
            </h2>

            {/* Tab buttons */}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-heading font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                      : 'bg-brand-offwhite text-brand-text-mid hover:bg-brand-navy/5'
                  }`}
                >
                  <span className="text-xs">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <p className="text-brand-text-mid leading-relaxed text-base">
                  {active.content}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Isaac Cuenca quote */}
            <div className="bg-brand-navy rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <svg className="w-6 h-6 text-brand-blue/30 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>
              <blockquote className="text-sm md:text-base font-serif italic text-white/80 leading-relaxed mb-4">
                My greatest hope is to help athletes reduce muscle pain after matches with a more effective solution than the models used so far.
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                  <Image
                    src="https://cold2sport.com/wp-content/uploads/2019/04/Diseno-sin-titulo-4.png"
                    alt="Isaac Cuenca"
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                  <div className="font-heading font-medium text-white text-sm">Isaac Cuenca</div>
                  <div className="text-xs text-white/40">Co-Founder &middot; Former FC Barcelona</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
