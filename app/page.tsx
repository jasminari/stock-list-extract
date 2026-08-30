import ComingSoonNav from "@/components/landing/ComingSoonNav";
import ComingSoonHero from "@/components/landing/ComingSoonHero";
import ScreensSection from "@/components/landing/ScreensSection";
import AppFeaturesSection from "@/components/landing/AppFeaturesSection";
import RoadmapSection from "@/components/landing/RoadmapSection";
import ComingSoonCTA from "@/components/landing/ComingSoonCTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <>
      <ComingSoonNav />
      <ComingSoonHero />
      <ScreensSection />
      <AppFeaturesSection />
      <RoadmapSection />
      <ComingSoonCTA />
      <Footer />
    </>
  );
}
