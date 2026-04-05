'use client'

import { motion } from 'framer-motion'

type SectionHeaderProps = {
  label?: string
  title: string
  description?: string
  centered?: boolean
  light?: boolean
}

export default function SectionHeader({
  label,
  title,
  description,
  centered = true,
  light = false,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`mb-16 ${centered ? 'text-center' : ''}`}
    >
      {label && (
        <p className="mb-3 font-body text-[11px] font-medium tracking-[0.1em] text-brand-blue">
          {label}
        </p>
      )}
      <h2
        className={`font-heading text-[48px] font-normal ${
          light ? 'text-white' : 'text-brand-navy'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mx-auto mt-4 max-w-2xl font-body text-[17px] leading-relaxed ${
            light ? 'text-brand-text-light' : 'text-brand-text-mid'
          }`}
        >
          {description}
        </p>
      )}
    </motion.div>
  )
}
