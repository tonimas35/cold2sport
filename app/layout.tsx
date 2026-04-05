import type { Metadata } from 'next'
import { Lexend, Manrope, DM_Serif_Display } from 'next/font/google'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import './globals.css'

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['400', '500', '600'],
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
  weight: ['400'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Cold2Sport — Elite Recovery Technology',
  description: 'Revolutionary thermal recovery technology for professional athletes. Phase-change cooling garments maintaining 10-15°C for 60+ minutes without ice.',
  metadataBase: new URL('https://cold2sport.com'),
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Cold2Sport — Elite Recovery Technology',
    description: 'Revolutionary thermal recovery for athletes. No ice needed.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lexend.variable} ${manrope.variable} ${dmSerif.variable}`}>
      <body className="min-h-screen">
        <Navbar />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
