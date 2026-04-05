'use client'

import { BlurFade } from '@/components/magicui/blur-fade'

const benefits = [
  {
    number: '01',
    title: 'Thermal Precision',
    description: 'Strict temperature control between 10-15°C for every product, ensuring optimal recovery conditions for muscle tissue.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M18.364 5.636l-1.06 1.06M21 12h-1.5M18.364 18.364l-1.06-1.06M12 19.5V21M5.636 18.364l1.06-1.06M3 12h1.5M5.636 5.636l1.06 1.06M12 9a3 3 0 100 6 3 3 0 000-6z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Extended Autonomy',
    description: 'Over 60 minutes of sustained cooling for recovery garments. Up to 10 hours for beverage solutions. No ice needed.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Eco-Sustainable',
    description: 'Eliminates ice dependency in sport. Promotes responsible water use and reduces energy consumption in cooling.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 01-5.276 3.67" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Athlete Health',
    description: 'Designed for athlete well-being with anti-inflammatory benefits. Reduces swelling and accelerates muscle recovery.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
]

export default function BenefitsGrid() {
  return (
    <section className="section-padding bg-white">
      <div className="container-wide">
        <BlurFade delay={0.1} className="text-center mb-14">
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            Why Cold2Sport
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 tracking-tighter">
            Recovery, <span className="font-serif italic">redefined</span>
          </h2>
        </BlurFade>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {benefits.map((b, i) => (
            <BlurFade key={b.number} delay={0.2 + i * 0.1}>
              <div className="group p-6 lg:p-8 rounded-2xl border border-brand-border hover:border-brand-blue/30 hover:bg-brand-offwhite transition-all duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-brand-navy/5 flex items-center justify-center text-brand-navy group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
                    {b.icon}
                  </div>
                  <span className="text-xs font-heading text-brand-text-light tracking-wider">{b.number}</span>
                </div>
                <h3 className="text-lg font-heading font-medium text-brand-navy mb-3">{b.title}</h3>
                <p className="text-sm text-brand-text-mid leading-relaxed">{b.description}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
