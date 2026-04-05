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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`mb-16 ${centered ? 'text-center' : ''}`}
    >
      {label && (
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue">
          {label}
        </p>
      )}
      <h2
        className={`font-display text-3xl font-bold tracking-tight lg:text-5xl ${
          light ? 'text-white' : 'text-brand-dark'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mx-auto mt-5 max-w-2xl text-lg leading-relaxed ${
            light ? 'text-gray-400' : 'text-brand-gray'
          }`}
        >
          {description}
        </p>
      )}
    </motion.div>
  )
}
