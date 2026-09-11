import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesShowcase from "@/components/landing/FeaturesShowcase";
import DeepDive from "@/components/landing/DeepDive";
import StatsSection from "@/components/landing/StatsSection";
import PricingSection from "@/components/landing/PricingSection";
import ContactSection from "@/components/landing/ContactSection";
import Footer from "@/components/landing/Footer";
import { StandaloneRedirect } from "@/components/landing/StandaloneRedirect";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === "SUPER_ADMIN") redirect("/admin");
    if (user.role === "SHOP_MANAGER") redirect("/shop/dashboard");
    redirect("/owner");
  }

  return (
    <main className="min-h-screen">
      <StandaloneRedirect />
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
