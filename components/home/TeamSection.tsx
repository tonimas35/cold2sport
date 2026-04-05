'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import SectionHeader from '@/components/ui/SectionHeader'
import { team } from '@/lib/team'

const stagger = { animate: { transition: { staggerChildren: 0.1 } } }
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function TeamSection() {
  return (
    <section id="team" className="section-contained bg-brand-darker py-24">
      <div className="absolute left-0 bottom-0 h-[300px] w-[300px] blob-blue opacity-20" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader label="Our Team" title="The people behind the cold" light />
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-6 md:grid-cols-3"
        >
          {team.map((member) => (
            <motion.div
              key={member.name}
              variants={fadeUp}
              className="glass-card group rounded-3xl p-8"
            >
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Image
                    src={member.image}
                    alt={`Portrait of ${member.name}, ${member.role} at Cold2Sport`}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-2xl object-cover ring-2 ring-white/10 transition-all duration-400 group-hover:ring-brand-blue/30"
                  />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-white">
                    {member.name}
                  </h3>
                  <p className="text-[13px] font-medium text-brand-blue">{member.role}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-gray-400">{member.bio}</p>
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[12px] font-medium text-gray-400 transition-all duration-300 hover:border-brand-blue/30 hover:text-brand-blue"
                aria-label={`View ${member.name} LinkedIn profile`}
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
