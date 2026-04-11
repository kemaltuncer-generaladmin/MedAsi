import dynamic from "next/dynamic";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection, MarqueeBand } from "@/components/landing/HeroSection";

function LandingSectionSkeleton({
  heightClass = "min-h-[420px]",
}: {
  heightClass?: string;
}) {
  return (
    <section className={`px-4 sm:px-6 lg:px-8 py-20 ${heightClass}`}>
      <div className="max-w-6xl mx-auto animate-pulse space-y-6">
        <div className="h-4 w-28 rounded-full bg-white/10" />
        <div className="h-12 w-full max-w-3xl rounded-2xl bg-white/10" />
        <div className="h-6 w-full max-w-2xl rounded-2xl bg-white/5" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-44 rounded-3xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </section>
  );
}

const FeaturesSection = dynamic(
  () => import("@/components/landing/FeaturesSections").then((mod) => mod.FeaturesSection),
  {
    loading: () => <LandingSectionSkeleton heightClass="min-h-[700px]" />,
  },
);

const HowItWorksSection = dynamic(
  () => import("@/components/landing/FeaturesSections").then((mod) => mod.HowItWorksSection),
  {
    loading: () => <LandingSectionSkeleton heightClass="min-h-[760px]" />,
  },
);

const AIDemoSection = dynamic(
  () => import("@/components/landing/FeaturesSections").then((mod) => mod.AIDemoSection),
  {
    loading: () => <LandingSectionSkeleton heightClass="min-h-[720px]" />,
  },
);

const StatsSection = dynamic(
  () => import("@/components/landing/SalesSections").then((mod) => mod.StatsSection),
  {
    loading: () => <LandingSectionSkeleton heightClass="min-h-[320px]" />,
  },
);

const PricingSection = dynamic(
  () => import("@/components/landing/SalesSections").then((mod) => mod.PricingSection),
  {
    loading: () => <LandingSectionSkeleton heightClass="min-h-[900px]" />,
  },
);

const TestimonialsSection = dynamic(
  () => import("@/components/landing/SalesSections").then((mod) => mod.TestimonialsSection),
  {
    loading: () => <LandingSectionSkeleton heightClass="min-h-[620px]" />,
  },
);

const FAQSection = dynamic(
  () => import("@/components/landing/SalesSections").then((mod) => mod.FAQSection),
  {
    loading: () => <LandingSectionSkeleton heightClass="min-h-[560px]" />,
  },
);

const FooterCTA = dynamic(
  () => import("@/components/landing/SalesSections").then((mod) => mod.FooterCTA),
  {
    loading: () => <LandingSectionSkeleton heightClass="min-h-[320px]" />,
  },
);

export default function LandingPage() {
  return (
    <main style={{ backgroundColor: "#0A0A0C", color: "#FFFFFF", overflowX: "hidden" }}>
      <Navbar />
      <HeroSection />
      <MarqueeBand />
      <FeaturesSection />
      <HowItWorksSection />
      <AIDemoSection />
      <StatsSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <FooterCTA />
    </main>
  );
}
