import Hero from "@/components/storefront/Hero";
import NewArrivals from "@/components/storefront/NewArrivals";
import YouTubeSection from "@/components/storefront/YouTubeSection";
import Footer from "@/components/storefront/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Hero />
      <NewArrivals />
      <YouTubeSection />
      <Footer />
    </main>
  );
}
