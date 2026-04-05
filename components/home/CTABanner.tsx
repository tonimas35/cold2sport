'use client'

import Link from 'next/link'
import { BlurFade } from '@/components/magicui/blur-fade'

export default function CTABanner() {
  return (
    <section className="py-20 md:py-28 bg-brand-blue relative overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="container-wide relative z-10">
        <BlurFade className="text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-white tracking-tighter mb-4">
            Ready to recover like a <span className="font-serif italic">pro</span>?
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
            Join 3,000+ professional athletes who trust Cold2Sport for their recovery.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/cold2sport/shop"
              className="inline-flex items-center gap-2 bg-white text-brand-navy font-heading font-medium text-sm px-8 py-4 rounded-lg hover:bg-white/90 transition-colors"
            >
              Shop Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="#contact"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-heading font-medium text-sm px-8 py-4 rounded-lg hover:bg-white/10 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
