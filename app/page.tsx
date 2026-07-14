import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesShowcase from "@/components/landing/FeaturesShowcase";
import DeepDive from "@/components/landing/DeepDive";
import StatsSection from "@/components/landing/StatsSection";
import PricingSection from "@/components/landing/PricingSection";
import ContactSection from "@/components/landing/ContactSection";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesShowcase />
      <DeepDive />
      <StatsSection />
      <PricingSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
