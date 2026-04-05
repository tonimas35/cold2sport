'use client'

import Image from 'next/image'
import { BlurFade } from '@/components/magicui/blur-fade'

const pillars = [
  {
    title: 'Mission',
    text: 'Deliver innovative thermal solutions that elevate athlete performance, simplify recovery management, and promote sustainability in sport.',
  },
  {
    title: 'Vision',
    text: 'Drive disruptive changes in thermal management with new products focused on precision, autonomy, and environmental responsibility.',
  },
  {
    title: 'Values',
    text: 'The union of professional sports experience with patented thermal technology — innovation born from the field, not the lab.',
  },
]

export default function MissionSection() {
  return (
    <section id="about" className="section-padding bg-white">
      <div className="container-wide">
        <BlurFade className="text-center mb-14">
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            About Cold2Sport
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 tracking-tighter">
            Born from the <span className="font-serif italic">pitch</span>
          </h2>
        </BlurFade>

        {/* Pillars */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {pillars.map((p, i) => (
            <BlurFade key={p.title} delay={i * 0.1}>
              <div className="text-center">
                <h3 className="text-lg font-heading font-semibold text-brand-navy mb-3">{p.title}</h3>
                <p className="text-sm text-brand-text-mid leading-relaxed">{p.text}</p>
              </div>
            </BlurFade>
          ))}
        </div>

        {/* Isaac Cuenca quote */}
        <BlurFade>
          <div className="relative bg-brand-navy rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/95 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
              <Image
                src="https://cold2sport.com/wp-content/uploads/2019/04/Diseno-sin-titulo-4.png"
                alt="Isaac Cuenca"
                fill
                className="object-cover object-top opacity-30"
              />
            </div>
            <div className="relative z-20 p-8 md:p-12 lg:p-16 max-w-2xl">
              <svg className="w-8 h-8 text-brand-blue/40 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151C7.563 6.068 6 8.789 6 11h4v10H0z" />
              </svg>
              <blockquote className="text-xl md:text-2xl font-serif italic text-white/90 leading-relaxed mb-6">
                My greatest hope is to help athletes reduce muscle pain after matches with a more effective solution than the models used so far.
              </blockquote>
              <div>
                <div className="font-heading font-medium text-white">Isaac Cuenca</div>
                <div className="text-sm text-white/50">Co-Founder &middot; Former FC Barcelona</div>
              </div>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
