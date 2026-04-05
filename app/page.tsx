import type { Metadata } from 'next'
import Hero from '@/components/home/Hero'
import TrustBar from '@/components/home/TrustBar'
import FeaturesGrid from '@/components/home/FeaturesGrid'
import FeaturedProduct from '@/components/home/FeaturedProduct'
import AmbassadorSection from '@/components/home/AmbassadorSection'
import TechnologyPreview from '@/components/home/TechnologyPreview'
import TeamSection from '@/components/home/TeamSection'
import NewsSection from '@/components/home/NewsSection'
import CTABanner from '@/components/home/CTABanner'

export const metadata: Metadata = {
  title: 'Cold2Sport — Elite Recovery Technology',
  description:
    'Phase-change cooling garments trusted by FC Barcelona. Recover faster with BioFresh Tech. Sustained 10–15°C for 60+ minutes.',
  openGraph: {
    title: 'Cold2Sport — Elite Recovery Technology',
    description:
      'Phase-change cooling garments trusted by FC Barcelona. Recover faster with BioFresh Tech.',
    images: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80'],
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Cold2Sport',
  url: 'https://cold2sport.com',
  logo: 'https://cold2sport.com/logo.svg',
  contactPoint: { '@type': 'ContactPoint', email: 'info@cold2sport.com' },
  sameAs: [
    'https://instagram.com/cold2.sport',
    'https://linkedin.com/company/cold2sport',
    'https://youtube.com/@Cold2Sport',
  ],
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Hero />
      <TrustBar />
      <FeaturesGrid />
      <FeaturedProduct />
      <AmbassadorSection />
      <TechnologyPreview />
      <TeamSection />
      <NewsSection />
      <CTABanner />
    </>
  )
}
