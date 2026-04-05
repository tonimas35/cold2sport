'use client'

import Image from 'next/image'
import Link from 'next/link'
import AnimatedSection from '@/components/ui/AnimatedSection'

const team = [
  {
    name: 'Rafael Matamoros',
    role: 'Co-Founder',
    image: '/cold2sport/images/rafa-cofounder.png',
  },
  {
    name: 'Isaac Cuenca',
    role: 'Co-Founder',
    image: '/cold2sport/images/isaac-co-founder.png',
  },
  {
    name: 'Eduard M. Segu',
    role: 'Director of Operations',
    image: '/cold2sport/images/eduard-director.operations.png',
  },
]

export default function TeamSection() {
  return (
    <section id="team" className="py-16 md:py-24 bg-brand-navy border-t border-white/5">
      <div className="container-wide">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-light text-white tracking-tighter">
            Meet Our Team
          </h2>
          <p className="text-white/30 text-sm mt-2">We Create Powerful Work</p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-10">
          {team.map((member, i) => (
            <AnimatedSection key={member.name} delay={i * 0.1}>
              <div className="text-center group">
                <div className="relative w-40 h-40 mx-auto mb-4 rounded-full overflow-hidden bg-white/5">
                  <Image src={member.image} alt={member.name} fill className="object-cover" />
                </div>
                <h3 className="text-base font-heading font-semibold text-white">{member.name}</h3>
                <p className="text-xs text-brand-blue mt-0.5">{member.role}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <div className="text-center">
          <Link href="#team" className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-heading font-semibold px-6 py-3 rounded transition-colors uppercase tracking-wider">
            Our Team
          </Link>
        </div>
      </div>
    </section>
  )
}
