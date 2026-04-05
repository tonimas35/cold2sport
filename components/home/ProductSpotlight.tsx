'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const specs = [
  { label: 'Temperature', value: '10–15°C', icon: '🌡️' },
  { label: 'Autonomy', value: '+60 min', icon: '⏱️' },
  { label: 'Material', value: '80% Polyester / 20% Elastane', icon: '🧵' },
  { label: 'Technology', value: 'BioFresh Tech PCM', icon: '❄️' },
]

export default function ProductSpotlight() {
  return (
    <section id="products" className="relative py-16 md:py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-offwhite via-white to-brand-offwhite" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-blue/3 to-transparent" />

      <div className="container-wide relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Image with effects */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute -inset-6 bg-brand-blue/5 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-brand-navy/10">
                <Image
                  src="https://cold2sport.com/wp-content/uploads/2024/11/COLD2SPORT25294.jpg"
                  alt="Thermal Short Adult by Cold2Sport — flagship recovery garment"
                  width={700}
                  height={700}
                  className="w-full h-auto object-cover"
                />
                {/* Overlay badge */}
                <div className="absolute top-4 left-4 bg-brand-navy/80 backdrop-blur-sm text-white text-xs font-heading font-medium px-3 py-1.5 rounded-lg uppercase tracking-wider">
                  Flagship Product
                </div>
                {/* Price badge */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg">
                  <div className="text-[10px] text-brand-text-light uppercase tracking-wider">From</div>
                  <div className="text-2xl font-heading font-semibold text-brand-navy">€100</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block text-brand-blue text-xs font-heading font-medium tracking-wider uppercase mb-2 bg-brand-blue/5 px-3 py-1 rounded-full">
              Dream It, Own It
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 mb-4 tracking-tighter">
              Explore the <span className="font-serif italic">Possible</span>
            </h2>
            <p className="text-brand-text-mid leading-relaxed mb-6">
              The Cold2Sport shorts are an innovative solution for sports recovery,
              providing precise cooling between 10°C and 15°C. With a thermal autonomy
              of more than 1 hour, they are perfect for reducing inflammation and
              improving muscle recovery.
            </p>

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {specs.map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-4 border border-brand-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-[10px] text-brand-text-light uppercase tracking-wider">{s.label}</span>
                  </div>
                  <div className="text-sm font-heading font-semibold text-brand-navy">{s.value}</div>
                </div>
              ))}
            </div>

            <Link
              href="/cold2sport/shop"
              className="group inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy-deep text-white font-heading font-medium text-sm px-7 py-3.5 rounded-lg transition-all duration-300 hover:shadow-lg"
            >
              Our Products
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
