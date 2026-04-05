'use client'

const partners = ['FC Barcelona', 'BioFresh Tech', 'Spanish Football Federation', 'LaLiga', 'UEFA Pro License']
const doubled = [...partners, ...partners]

export default function TrustBar() {
  return (
    <section className="relative border-y border-white/[0.04] bg-brand-darker py-8">
      <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-gray-600">
        Trusted by elite sport
      </p>
      <div className="marquee-container">
        <div className="flex animate-marquee items-center gap-16 whitespace-nowrap">
          {doubled.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className={`font-display text-sm font-bold tracking-wider ${
                name === 'FC Barcelona' ? 'text-brand-blue/60' : 'text-white/15'
              }`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
