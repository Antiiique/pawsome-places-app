import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategoryFilters from "@/components/CategoryFilters";
import MapSection from "@/components/MapSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <CategoryFilters />
      <MapSection />
      <Footer />
    </div>
  );
};

export default Index;
