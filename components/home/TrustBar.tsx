'use client'

import Image from 'next/image'
import { Marquee } from '@/components/magicui/marquee'

const partners = [
  { name: 'BioFreshTech', logo: 'https://cold2sport.com/wp-content/uploads/2024/11/biofreshtech-14.png' },
  { name: 'FC Barcelona', text: 'FC BARCELONA' },
  { name: 'Premium Marketing', logo: 'https://cold2sport.com/wp-content/uploads/2024/12/Logo-Premium-Marketing-22-BLANC-01.jpg' },
]

function PartnerItem({ partner }: { partner: typeof partners[number] }) {
  return (
    <div className="flex items-center justify-center px-8 md:px-12">
      {partner.logo ? (
        <Image
          src={partner.logo}
          alt={partner.name}
          width={120}
          height={40}
          className="h-8 md:h-10 w-auto object-contain opacity-40 invert hover:opacity-70 transition-opacity duration-300"
        />
      ) : (
        <span className="text-lg md:text-xl font-heading font-semibold tracking-tight text-brand-blue/70 hover:text-brand-blue transition-colors whitespace-nowrap">
          {partner.text}
        </span>
      )}
    </div>
  )
}

export default function TrustBar() {
  return (
    <section className="py-8 bg-brand-navy border-t border-white/5">
      <Marquee pauseOnHover className="[--duration:30s] [--gap:2rem]">
        {partners.map((p) => (
          <PartnerItem key={p.name} partner={p} />
        ))}
      </Marquee>
    </section>
  )
}
