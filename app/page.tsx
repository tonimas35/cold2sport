import Hero from '@/components/home/Hero'
import FeaturesBar from '@/components/home/FeaturesBar'
import ProductSpotlight from '@/components/home/ProductSpotlight'
import LifestyleGallery from '@/components/home/LifestyleGallery'
import MissionSection from '@/components/home/MissionSection'
import BenefitsGrid from '@/components/home/BenefitsGrid'
import AmbassadorSection from '@/components/home/AmbassadorSection'
import TechnologySection from '@/components/home/TechnologySection'
import TeamSection from '@/components/home/TeamSection'
import NewsSection from '@/components/home/NewsSection'
import CTABanner from '@/components/home/CTABanner'

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturesBar />
      <ProductSpotlight />
      <LifestyleGallery />
      <MissionSection />
      <BenefitsGrid />
      <AmbassadorSection />
      <TechnologySection />
      <TeamSection />
      <NewsSection />
      <CTABanner />
    </>
  )
}
