import { HeroSection } from '@/components/landing/HeroSection';
import { InteractiveDemo } from '@/components/landing/InteractiveDemo';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <HeroSection />
      <InteractiveDemo />
      <FeaturesGrid />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
