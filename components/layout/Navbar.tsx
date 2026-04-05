'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'

const navLinks = [
  { label: 'About', href: '/about' },
  { label: 'Technology', href: '/#technology' },
  { label: 'Shop', href: '/shop' },
  { label: 'News', href: '/#news' },
  { label: 'Contact', href: '/#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-blue focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'glass-strong shadow-glass py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8"
        >
          <Link href="/" className="group flex items-center" aria-label="Cold2Sport home">
            <span className="font-display text-xl font-extrabold tracking-tight text-white transition-all duration-300 group-hover:text-brand-blue">
              COLD<span className="text-gradient-blue">2</span>SPORT
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`relative rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition-all duration-300 ${
                  pathname === link.href
                    ? 'text-brand-blue'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute -bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-brand-blue"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <span className="text-[11px] font-medium tracking-wider text-gray-500">ES | EN | CA</span>
            <Button href="/shop" size="sm">
              Shop Now
            </Button>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <div className="flex h-4 w-5 flex-col justify-between">
              <span className={`block h-[1.5px] w-full bg-white transition-all duration-300 ${mobileOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
              <span className={`block h-[1.5px] w-full bg-white transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-[1.5px] w-full bg-white transition-all duration-300 ${mobileOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
            </div>
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
            animate={{ opacity: 1, clipPath: 'circle(150% at calc(100% - 40px) 40px)' }}
            exit={{ opacity: 0, clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-brand-darker lg:hidden"
          >
            <div className="absolute inset-0 bg-grid opacity-50" />
            <div className="absolute right-20 top-20 h-64 w-64 blob-blue animate-pulse-glow" />
            <nav className="relative flex h-full flex-col items-center justify-center gap-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="font-display text-3xl font-bold tracking-tight text-white transition-colors hover:text-brand-blue"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4"
              >
                <Button href="/shop" size="lg">
                  Shop Now
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
