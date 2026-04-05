import type { Metadata } from 'next'
import AboutContent from '@/components/about/AboutContent'

export const metadata: Metadata = {
  title: 'About Cold2Sport — Founded by Isaac Cuenca',
  description:
    'Cold2Sport was founded by ex-FC Barcelona player Isaac Cuenca after a career-defining injury showed him the gap between elite recovery tech and what was available to athletes.',
  openGraph: {
    title: 'About Cold2Sport — Founded by Isaac Cuenca',
    description:
      'Cold2Sport was founded by ex-FC Barcelona player Isaac Cuenca after a career-defining injury.',
    images: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&q=80'],
  },
}

export default function AboutPage() {
  return <AboutContent />
}
