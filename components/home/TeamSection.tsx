'use client'

import Image from 'next/image'
import { team } from '@/lib/team'
import { BlurFade } from '@/components/magicui/blur-fade'

export default function TeamSection() {
  return (
    <section id="team" className="section-padding bg-white">
      <div className="container-wide">
        <BlurFade className="text-center mb-14">
          <span className="text-brand-blue text-sm font-heading font-medium tracking-wider uppercase">
            Our Team
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-light text-brand-navy mt-3 tracking-tighter">
            The people behind <span className="font-serif italic">the tech</span>
          </h2>
        </BlurFade>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-4xl mx-auto">
          {team.map((member, i) => (
            <BlurFade key={member.name} delay={i * 0.1}>
              <div className="text-center group">
                <div className="relative w-40 h-40 mx-auto mb-5 rounded-full overflow-hidden bg-brand-offwhite">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <h3 className="text-lg font-heading font-medium text-brand-navy">{member.name}</h3>
                <p className="text-sm text-brand-blue font-heading mt-0.5">{member.role}</p>
                <p className="text-sm text-brand-text-mid mt-3 leading-relaxed">{member.bio}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
