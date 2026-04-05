'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BlurFade } from '@/components/magicui/blur-fade'

const specs = [
  { label: 'Temperature', value: '10–15°C' },
  { label: 'Autonomy', value: '+60 min' },
  { label: 'Material', value: '80% Polyester / 20% Elastane' },
  { label: 'Technology', value: 'BioFresh Tech PCM' },
]

export default function ProductSpotlight() {
  return (
    <section id="products" className="section-padding bg-brand-cream">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <BlurFade>
            <div className="relative">
              <Image
                src="https://cold2sport.com/wp-content/uploads/2024/11/COLD2SPORT25294.jpg"
                alt="Thermal Short Adult by Cold2Sport"
                width={700}
                height={700}
                className="rounded-2xl w-full h-auto object-cover"
              />
              <div className="absolute top-4 left-4 bg-brand-navy/80 backdrop-blur-sm text-white text-xs font-heading font-medium px-3 py-1.5 rounded-lg uppercase tracking-wider">
                Flagship
              </div>
            </div>
          </BlurFade>

          {/* Content */}
          <BlurFade delay={0.2}>
            <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
              Featured Product
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 mb-5 tracking-tighter">
              Thermal Short <span className="font-serif italic">Adult</span>
            </h2>
            <p className="text-brand-text-mid leading-relaxed mb-8 max-w-lg">
              Cooling pants designed for post-exercise muscle recovery. High compression
              and comfort with precise cooling transfer, maintaining optimal temperature
              for over one hour. No ice needed.
            </p>

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {specs.map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-4 border border-brand-border">
                  <div className="text-xs text-brand-text-light uppercase tracking-wider mb-1">{s.label}</div>
                  <div className="text-sm font-heading font-medium text-brand-navy">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-6">
              <Link
                href="/cold2sport/shop/thermal-short-adult"
                className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy-deep text-white font-heading font-medium text-sm px-7 py-3.5 rounded-lg transition-colors"
              >
                View Product
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <span className="text-2xl font-heading font-light text-brand-navy">€100</span>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}
