import Hero from '@/components/home/Hero'
import TrustBar from '@/components/home/TrustBar'
import BenefitsGrid from '@/components/home/BenefitsGrid'
import ProductSpotlight from '@/components/home/ProductSpotlight'
import MissionSection from '@/components/home/MissionSection'
import AmbassadorSection from '@/components/home/AmbassadorSection'
import TechnologySection from '@/components/home/TechnologySection'
import TeamSection from '@/components/home/TeamSection'
import NewsSection from '@/components/home/NewsSection'
import CTABanner from '@/components/home/CTABanner'

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <BenefitsGrid />
      <ProductSpotlight />
      <MissionSection />
      <AmbassadorSection />
      <TechnologySection />
      <TeamSection />
      <NewsSection />
      <CTABanner />
    </>
  )
}
