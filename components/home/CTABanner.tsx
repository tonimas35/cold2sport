'use client'

import Link from 'next/link'
import AnimatedSection from '@/components/ui/AnimatedSection'

export default function CTABanner() {
  return (
    <section className="py-16 md:py-20 bg-brand-blue">
      <div className="container-wide">
        <AnimatedSection className="text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-light text-white tracking-tighter mb-3">
            Ready to recover like a <span className="font-serif italic">pro</span>?
          </h2>
          <p className="text-sm text-white/70 mb-6 max-w-md mx-auto">
            Join 3,000+ professional athletes who trust Cold2Sport for their recovery.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/cold2sport/shop" className="bg-white text-brand-navy text-xs font-heading font-semibold px-6 py-3 rounded hover:bg-white/90 transition-colors uppercase tracking-wider">
              Shop Now
            </Link>
            <Link href="#contact" className="border border-white/30 text-white text-xs font-heading font-semibold px-6 py-3 rounded hover:bg-white/10 transition-colors uppercase tracking-wider">
              Contact Us
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
