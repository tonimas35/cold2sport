'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

const benefits = [
  {
    title: 'Precision',
    description: 'Cold2Sport products are distinguished by their thermal precision in their applications, offering the ideal temperature in a strict range for each product.',
    image: 'https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic5-Baja.jpg',
    stat: '10–15°C',
    statLabel: 'strict range',
  },
  {
    title: 'Stability',
    description: 'Cold2Sport products offer high levels of stability and thermal autonomy, to enjoy the ideal temperature for as long as necessary for each application.',
    image: 'https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic23-Baja.jpg',
    stat: '60+',
    statLabel: 'min autonomy',
  },
  {
    title: 'Health',
    description: 'Products designed to improve the well-being and health of sportsmen and women. Anti-inflammatory benefits that accelerate muscle recovery.',
    image: 'https://cold2sport.com/wp-content/uploads/2024/12/C2S-2025-07-09-0121.jpg',
    stat: '3,000+',
    statLabel: 'athletes trust us',
  },
  {
    title: 'Sustainability',
    description: 'We replace ice in the world of sport, providing improvements in the management of water consumption in sports clubs worldwide.',
    image: 'https://cold2sport.com/wp-content/uploads/2024/12/mosaic-versatil-3.jpg',
    stat: '0',
    statLabel: 'ice needed',
  },
]

export default function BenefitsGrid() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            Why Cold2Sport
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 tracking-tighter">
            Key <span className="font-serif italic">benefits</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer"
            >
              {/* Background photo */}
              <Image
                src={b.image}
                alt={b.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/60 to-brand-navy/20 group-hover:from-brand-navy/90 transition-all duration-500" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
                {/* Stat */}
                <div className="mb-auto pt-4">
                  <div className="text-3xl md:text-4xl font-heading font-medium text-white tracking-tight">
                    {b.stat}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">{b.statLabel}</div>
                </div>

                <h3 className="text-xl font-heading font-semibold text-white mb-2">{b.title}</h3>
                <p className="text-xs text-white/60 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                  {b.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
