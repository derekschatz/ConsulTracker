import Navbar from "../components/layout/navbar";
import Hero from "../components/layout/hero";
import Features from "../components/layout/features";
import Testimonials from "../components/layout/testimonials";
import Pricing from "../components/layout/pricing";
import Cta from "../components/layout/cta";
import Footer from "../components/layout/footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <Cta />
      <Footer />
    </div>
  );
};

export default LandingPage; 