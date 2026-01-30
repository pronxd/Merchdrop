import Hero from "@/components/Hero";
import FeaturedCakes from "@/components/FeaturedCakes";
import About from "@/components/About";
import Reviews from "@/components/Reviews";
import OrderSection from "@/components/OrderSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <FeaturedCakes />
      <About />
      <Reviews />
      <OrderSection />
      <Footer />
    </main>
  );
}
