'use client'

import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'

export default function AmbassadorSection() {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="container-wide">
        <AnimatedSection className="text-center mb-10">
          <span className="text-brand-blue text-xs font-heading font-semibold tracking-wider uppercase">
            Ambassador
          </span>
          <h2 className="text-3xl md:text-4xl font-heading font-light text-brand-navy mt-2 tracking-tighter">
            Cold2Sport <span className="font-serif italic">Ambassadors</span>
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <div className="grid lg:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
            <div className="relative aspect-[3/4] max-w-sm mx-auto lg:mx-0 w-full rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="https://cold2sport.com/wp-content/uploads/2025/01/IG-Iniesta.jpg"
                alt="Andres Iniesta — Cold2Sport Ambassador"
                fill
                className="object-cover"
              />
            </div>

            <div>
              <a
                href="https://instagram.com/andresiniesta8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue text-sm font-heading font-semibold hover:underline"
              >
                Andres Iniesta
              </a>
              <p className="text-xs text-brand-text-light mt-0.5 mb-4">
                Former Professional Football Player
              </p>
              <p className="text-sm text-brand-text-mid leading-relaxed">
                Considered one of the greatest midfielders of his generation. World Cup and European
                Championship winner. He spent most of his career at FC Barcelona, where he became a
                legend. Now he partners with Cold2Sport to bring elite recovery technology to athletes
                at every level.
              </p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
