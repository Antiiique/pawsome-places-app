import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MapSection from "@/components/MapSection";
import Footer from "@/components/Footer";
import { useState } from "react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection onSearch={handleSearch} />
      <MapSection searchQuery={searchQuery} />
      <Footer />
    </div>
  );
};

export default Index;
