type BadgeProps = {
  children: React.ReactNode
  variant?: 'gold' | 'blue' | 'gray' | 'glass'
  className?: string
}

const variantStyles = {
  gold: 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30',
  blue: 'bg-brand-blue/15 text-brand-blue border border-brand-blue/25',
  gray: 'bg-white/5 text-brand-gray border border-white/10',
  glass: 'glass text-white/70',
}

export default function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
