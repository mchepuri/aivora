import { Hero } from '@/components/landing/Hero';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { CtaSection } from '@/components/landing/CtaSection';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <CtaSection />
    </>
  );
}
