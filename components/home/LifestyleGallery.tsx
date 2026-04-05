'use client'

import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'

const images = [
  { src: '/cold2sport/images/cold2sport-nautic11-Baja.jpg', alt: 'Cold2Sport at sports event', span: 'col-span-2 row-span-2' },
  { src: '/cold2sport/images/cold2sport-nautic23-Baja-1-800x694.jpg', alt: 'Athlete recovery', span: 'col-span-1' },
  { src: '/cold2sport/images/cold2sport-nautic3-Baja-800x694.jpg', alt: 'Cold2Sport products in use', span: 'col-span-1' },
  { src: '/cold2sport/images/cold2sport-Carolina-Cambrils-baja-16.jpg', alt: 'Athlete using Cold2Sport', span: 'col-span-1' },
  { src: '/cold2sport/images/C2S-2025-07-09-0121-red.png', alt: 'Thermal Knee Pad', span: 'col-span-1' },
]

export default function LifestyleGallery() {
  return (
    <section className="py-12 md:py-16 bg-brand-navy border-t border-white/5">
      <div className="container-wide">
        <AnimatedSection className="text-center mb-10">
          <span className="text-brand-blue text-xs font-heading font-semibold tracking-wider uppercase">
            Innovation in Recovery
          </span>
          <h2 className="text-3xl md:text-4xl font-heading font-light text-white mt-2 tracking-tighter">
            Athletic <span className="font-serif italic">Performance</span>
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {images.map((img, i) => (
            <AnimatedSection key={i} delay={i * 0.05} className={`${img.span} relative overflow-hidden rounded-lg group cursor-pointer`}>
              <div className="relative aspect-square w-full">
                <Image src={img.src} alt={img.alt} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-brand-navy/20 group-hover:bg-transparent transition-colors duration-300" />
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
