'use client'

import Image from 'next/image'
import Link from 'next/link'
import AnimatedSection from '@/components/ui/AnimatedSection'

export default function ProductSpotlight() {
  return (
    <section id="products" className="py-16 md:py-24 bg-brand-navy">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Large product image */}
          <AnimatedSection>
            <div className="relative">
              <Image
                src="/cold2sport/images/Cold2Sport_Keyvisual_komprimiert_web.png"
                alt="Cold2Sport Thermal Short — flagship cooling garment"
                width={685}
                height={773}
                className="w-full h-auto object-contain"
              />
            </div>
          </AnimatedSection>

          {/* Right — Text */}
          <AnimatedSection delay={0.15}>
            <span className="text-brand-blue text-xs font-heading font-semibold tracking-wider uppercase mb-3 block">
              Dream It, Own It
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-white tracking-tighter mb-3">
              Explore the <span className="font-serif italic">Possible</span>
            </h2>
            <p className="text-sm md:text-base text-white/40 leading-relaxed mb-8 max-w-lg">
              The Cold2Sport shorts are an innovative solution for sports recovery,
              providing precise cooling between 10°C and 15°C thanks to their
              homogeneous liquid refrigerant design. With a thermal autonomy of
              more than 1 hour, they are perfect for reducing inflammation and
              improving muscle recovery.
            </p>
            <Link
              href="/cold2sport/shop"
              className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-heading font-semibold px-6 py-3 rounded transition-colors uppercase tracking-wider"
            >
              Our Products
            </Link>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
