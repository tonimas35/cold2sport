'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BlurFade } from '@/components/magicui/blur-fade'
import { NumberTicker } from '@/components/magicui/number-ticker'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-brand-navy overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-navy" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/5 rounded-full blur-[120px]" />
      </div>

      <div className="container-wide relative z-10 pt-28 pb-16 md:pt-32 md:pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text */}
          <div>
            <BlurFade delay={0.1} direction="up">
              <span className="inline-block text-brand-blue text-sm font-heading font-medium tracking-wider uppercase mb-5">
                Elite Recovery Technology
              </span>
            </BlurFade>

            <BlurFade delay={0.2} direction="up">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-heading font-light text-white leading-[1.1] tracking-tighter mb-6">
                The future of{' '}
                <span className="font-serif italic text-brand-blue">muscle</span>{' '}
                recovery
              </h1>
            </BlurFade>

            <BlurFade delay={0.3} direction="up">
              <p className="text-lg text-white/60 max-w-lg mb-8 leading-relaxed">
                Phase-change cooling garments that maintain precise temperature without ice.
                Trusted by elite athletes and professional clubs worldwide.
              </p>
            </BlurFade>

            <BlurFade delay={0.4} direction="up">
              <div className="flex flex-wrap gap-4 mb-12">
                <Link
                  href="/cold2sport/shop"
                  className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-heading font-medium text-sm px-7 py-3.5 rounded-lg transition-colors duration-200"
                >
                  Shop Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="#technology"
                  className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white font-heading font-medium text-sm px-7 py-3.5 rounded-lg transition-colors duration-200"
                >
                  Our Technology
                </Link>
              </div>
            </BlurFade>

            {/* Stats with NumberTicker */}
            <BlurFade delay={0.5} direction="up">
              <div className="flex gap-8 md:gap-12">
                <div>
                  <div className="text-2xl md:text-3xl font-heading font-light text-white tracking-tight">
                    10–15°C
                  </div>
                  <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">
                    Precise cooling
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-heading font-light text-white tracking-tight">
                    <NumberTicker value={60} className="text-white" />
                    <span className="text-white/60">+</span>
                  </div>
                  <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">
                    Minutes autonomy
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-heading font-light text-white tracking-tight">
                    <NumberTicker value={3000} className="text-white" />
                    <span className="text-white/60">+</span>
                  </div>
                  <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">
                    Athletes worldwide
                  </div>
                </div>
              </div>
            </BlurFade>
          </div>

          {/* Product image */}
          <BlurFade delay={0.3} direction="right">
            <div className="relative flex justify-center">
              <div className="relative w-full max-w-md lg:max-w-lg">
                <div className="absolute -inset-4 bg-gradient-to-tr from-brand-blue/10 to-transparent rounded-3xl blur-2xl" />
                <Image
                  src="https://cold2sport.com/wp-content/uploads/2024/11/COLD2SPORT25294.jpg"
                  alt="Cold2Sport Thermal Short — flagship recovery garment"
                  width={600}
                  height={600}
                  className="relative rounded-2xl shadow-2xl w-full h-auto object-cover"
                  priority
                />
                {/* Float badge */}
                <div className="absolute -bottom-3 -right-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3">
                  <div className="text-xs text-white/60 uppercase tracking-wider">From</div>
                  <div className="text-xl font-heading font-medium text-white">€100</div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}
