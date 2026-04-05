'use client'

const partners = ['FC Barcelona', 'BioFresh Tech', 'Spanish Football Federation', 'LaLiga', 'UEFA Pro License']
const doubled = [...partners, ...partners]

export default function TrustBar() {
  return (
    <section className="bg-brand-navy-deep py-6">
      <p className="mb-4 text-center font-body text-[11px] font-medium tracking-[0.1em] text-white/30">
        Trusted by elite sport
      </p>
      <div className="marquee-container">
        <div className="flex animate-marquee items-center gap-16 whitespace-nowrap">
          {doubled.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className={`font-heading text-[14px] font-normal tracking-wide transition-opacity duration-300 hover:text-white/90 ${
                name === 'FC Barcelona' ? 'text-brand-blue' : 'text-white/40'
              }`}
            >
              {name}
              {i < doubled.length - 1 && (
                <span className="ml-16 font-serif text-white/20">&mdash;</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
