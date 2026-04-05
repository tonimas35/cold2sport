'use client'

import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'

const benefits = [
  {
    title: 'Precision',
    description: 'Cold2Sport products are distinguished by their thermal precision, offering the ideal temperature in a strict range for each product.',
    image: '/cold2sport/images/cold2sport-nautic3-Baja-800x694.jpg',
  },
  {
    title: 'Stability',
    description: 'Cold2Sport products offer high levels of stability and thermal autonomy, to enjoy the ideal temperature for as long as necessary.',
    image: '/cold2sport/images/cold2sport-nautic23-Baja-1-800x694.jpg',
  },
  {
    title: 'Health',
    description: 'Products designed to improve the well-being and health of sportsmen and women. Anti-inflammatory benefits for recovery.',
    image: '/cold2sport/images/cold2sport-Carolina-Cambrils-baja-16.jpg',
  },
  {
    title: 'Sustainability',
    description: 'We replace ice in the world of sport, providing improvements in the management of water consumption in sports clubs.',
    image: '/cold2sport/images/IMG_0164-2-scaled-e1750174088649.jpg',
  },
]

export default function BenefitsGrid() {
  return (
    <section className="py-16 md:py-24 bg-brand-navy border-t border-white/5">
      <div className="container-wide">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-light text-white tracking-tighter">
            Key Benefits of
          </h2>
          <p className="text-brand-blue font-serif italic text-xl mt-1">Cold2Sport Technology</p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {benefits.map((b, i) => (
            <AnimatedSection key={b.title} delay={i * 0.08}>
              <div className="group relative aspect-[3/4] rounded-xl overflow-hidden">
                <Image src={b.image} alt={b.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <h3 className="text-lg font-heading font-semibold text-white mb-1">{b.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{b.description}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
