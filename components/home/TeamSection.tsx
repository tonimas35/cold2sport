'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { team } from '@/lib/team'

const stagger = { animate: { transition: { staggerChildren: 0.1 } } }
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function TeamSection() {
  return (
    <section id="team" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-body text-[11px] font-medium tracking-[0.1em] text-brand-gold">Our team</p>
          <h2 className="font-heading text-[48px] font-normal text-brand-navy">The people behind the cold</h2>
        </div>
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-12 md:grid-cols-3"
        >
          {team.map((member) => (
            <motion.div key={member.name} variants={fadeUp} className="text-center">
              <Image
                src={member.image}
                alt={`Portrait of ${member.name}, ${member.role} at Cold2Sport`}
                width={88}
                height={88}
                className="mx-auto h-[88px] w-[88px] rounded-full object-cover outline outline-2 outline-offset-[3px] outline-brand-gold"
              />
              <h3 className="mt-5 font-heading text-[20px] font-normal text-brand-navy">
                {member.name}
              </h3>
              <p className="mt-1 font-body text-[12px] font-medium tracking-[0.08em] text-brand-blue">
                {member.role}
              </p>
              <p className="mt-3 font-body text-[14px] leading-relaxed text-brand-text-mid">
                {member.bio}
              </p>
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-brand-gold transition-colors hover:text-[#b8894f]"
                aria-label={`View ${member.name} LinkedIn profile`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
