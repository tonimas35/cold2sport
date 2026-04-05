import Link from 'next/link'

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'outline-white' | 'outline-dark' | 'gold' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}

const variantStyles = {
  primary:
    'bg-brand-blue text-white hover:bg-[#00c8ff] shadow-[0_0_20px_rgba(0,180,255,0.2)] hover:shadow-[0_0_30px_rgba(0,180,255,0.35)] btn-glow',
  secondary:
    'bg-brand-gold text-white hover:bg-[#e0b080] shadow-[0_0_20px_rgba(212,165,116,0.15)] hover:shadow-[0_0_30px_rgba(212,165,116,0.3)]',
  'outline-white':
    'border border-white/20 text-white hover:bg-white/10 hover:border-white/40',
  'outline-dark':
    'border border-brand-dark/20 text-brand-dark hover:bg-brand-dark hover:text-white',
  gold: 'bg-brand-gold text-white hover:bg-[#e0b080] shadow-[0_0_20px_rgba(212,165,116,0.15)]',
  ghost: 'text-brand-gray hover:text-white hover:bg-white/5',
}

const sizeStyles = {
  sm: 'px-5 py-2.5 text-sm',
  md: 'px-7 py-3 text-[15px]',
  lg: 'px-9 py-4 text-base',
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
  const classes = `relative inline-flex items-center justify-center gap-2 rounded-full font-body font-semibold tracking-wide transition-all duration-400 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

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
