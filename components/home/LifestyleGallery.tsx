'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

const images = [
  {
    src: 'https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic5-Baja.jpg',
    alt: 'Athlete recovering poolside with Cold2Sport',
    span: 'col-span-2 row-span-2',
    aspect: 'aspect-[4/3]',
  },
  {
    src: 'https://cold2sport.com/wp-content/uploads/2024/11/cold2sport-nautic23-Baja.jpg',
    alt: 'Cold2Sport products at sports venue',
    span: 'col-span-1 row-span-1',
    aspect: 'aspect-square',
  },
  {
    src: 'https://cold2sport.com/wp-content/uploads/2024/12/C2S-2025-07-09-0121.jpg',
    alt: 'Thermal Knee Pad in action',
    span: 'col-span-1 row-span-1',
    aspect: 'aspect-square',
  },
  {
    src: 'https://cold2sport.com/wp-content/uploads/2024/12/mosaic-versatil-3.jpg',
    alt: 'Versatil ColdPack for targeted recovery',
    span: 'col-span-1 row-span-1',
    aspect: 'aspect-[3/4]',
  },
  {
    src: 'https://cold2sport.com/wp-content/uploads/2024/12/turmellera-quadrat-1.jpg',
    alt: 'Cold Ankle Brace for joint recovery',
    span: 'col-span-1 row-span-1',
    aspect: 'aspect-[3/4]',
  },
]

export default function LifestyleGallery() {
  return (
    <section className="py-12 md:py-20 bg-white overflow-hidden">
      <div className="container-wide mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            Innovation in Recovery
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 tracking-tighter">
            Athletic <span className="font-serif italic">performance</span>
          </h2>
        </motion.div>
      </div>

      {/* Masonry-style gallery */}
      <div className="container-wide">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`${img.span} relative overflow-hidden rounded-xl group cursor-pointer`}
            >
              <div className={`relative ${img.aspect} w-full`}>
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
