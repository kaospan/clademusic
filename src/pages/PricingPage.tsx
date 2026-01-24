import { LandingNav } from '@/components/landing/LandingNav';
import { PricingPreview } from '@/components/landing/PricingPreview';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <LandingNav />
      <main className="pt-16">
        <PricingPreview />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;
