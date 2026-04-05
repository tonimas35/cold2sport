type BadgeProps = {
  children: React.ReactNode
  variant?: 'blue' | 'outline-blue' | 'gray' | 'dark'
  className?: string
}

const variantStyles = {
  blue: 'bg-brand-blue text-white',
  'outline-blue': 'border border-brand-blue text-brand-blue bg-transparent',
  gray: 'bg-brand-offwhite text-brand-text-mid',
  dark: 'bg-brand-navy text-white',
}

export default function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[11px] font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
