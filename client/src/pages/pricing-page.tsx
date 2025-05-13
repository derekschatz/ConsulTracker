import Navbar from "../components/layout/navbar";
import Pricing from "../components/layout/pricing";
import Footer from "../components/layout/footer";

// The App component should already have the AuthProvider and SubscriptionProvider
// so we don't need to add them here. The pricing component will use the hooks directly.

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16">
        <Pricing />
      </div>
      <Footer />
    </div>
  );
};

export default PricingPage; 