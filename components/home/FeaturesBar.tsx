'use client'

import AnimatedSection from '@/components/ui/AnimatedSection'

const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Extended Autonomy',
    description: 'Over 1 hour for recovery garments. Up to 10 hours for beverage covers. No ice needed at any point.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M18.364 5.636l-1.06 1.06M21 12h-1.5M18.364 18.364l-1.06-1.06M12 19.5V21M5.636 18.364l1.06-1.06M3 12h1.5M5.636 5.636l1.06 1.06M12 9a3 3 0 100 6 3 3 0 000-6z" />
      </svg>
    ),
    title: 'Precise Stability',
    description: 'Strict temperature control between 10-15°C across all products, ensuring consistent and reliable cooling.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036" />
      </svg>
    ),
    title: 'Eco-Friendly',
    description: 'Eliminates ice dependency in sport. Promotes responsible water use and reduces energy consumption.',
  },
]

export default function FeaturesBar() {
  return (
    <section className="py-16 md:py-20 bg-brand-navy border-t border-white/5">
      <div className="container-wide">
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 0.1}>
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-blue/10 text-brand-blue mb-4 group-hover:bg-brand-blue/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-heading font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">{f.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}
