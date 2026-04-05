import Link from 'next/link'

type ButtonProps = {
  variant?: 'primary' | 'dark' | 'gold' | 'outline-white' | 'outline-gold' | 'outline-dark'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}

const variantStyles = {
  primary: 'bg-brand-gold text-brand-navy hover:bg-[#d4ad80]',
  dark: 'bg-brand-navy text-white hover:bg-brand-navy/90',
  gold: 'bg-brand-gold text-brand-navy hover:bg-[#d4ad80]',
  'outline-white': 'border border-white/30 text-white hover:bg-white/10',
  'outline-gold': 'border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10',
  'outline-dark': 'border border-brand-navy/20 text-brand-navy hover:bg-brand-navy hover:text-white',
}

const sizeStyles = {
  sm: 'px-5 py-2.5 text-[13px]',
  md: 'px-7 py-3 text-[14px]',
  lg: 'px-8 py-4 text-[15px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  children,
  className = '',
  onClick,
  type = 'button',
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-body font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  )
}
