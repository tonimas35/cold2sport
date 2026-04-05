'use client'

import Image from 'next/image'
import { BlurFade } from '@/components/magicui/blur-fade'

export default function AmbassadorSection() {
  return (
    <section className="section-padding bg-brand-cream">
      <div className="container-wide">
        <BlurFade className="text-center mb-14">
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            Ambassador
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 tracking-tighter">
            Endorsed by <span className="font-serif italic">legends</span>
          </h2>
        </BlurFade>

        <BlurFade>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[4/5] max-w-md mx-auto lg:mx-0 w-full">
              <Image
                src="https://cold2sport.com/wp-content/uploads/2025/01/IG-Iniesta.jpg"
                alt="Andres Iniesta — Cold2Sport Ambassador"
                fill
                className="object-cover rounded-2xl grayscale contrast-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/60 via-transparent to-transparent rounded-2xl" />
            </div>

            <div>
              <div className="mb-6">
                <span className="text-sm font-heading text-brand-blue uppercase tracking-wider">
                  Andres Iniesta
                </span>
                <p className="text-xs text-brand-text-light mt-1">
                  Former Professional Footballer &middot; World Cup Champion
                </p>
              </div>
              <blockquote className="text-2xl md:text-3xl font-serif italic text-brand-navy leading-snug mb-8 tracking-tight">
                &ldquo;Recovery is not an option — it is the foundation of performance.&rdquo;
              </blockquote>
              <p className="text-brand-text-mid leading-relaxed max-w-md">
                Considered one of the greatest midfielders of his generation, Iniesta
                partners with Cold2Sport to bring elite recovery technology to athletes
                at every level.
              </p>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
