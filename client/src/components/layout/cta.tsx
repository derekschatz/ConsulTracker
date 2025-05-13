import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "wouter";

const Cta = () => {
  return (
    <div className="py-24 bg-primary-50">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to streamline your consulting business?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of consultants who are spending less time on admin and more time on billable work.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/login?tab=register">
              <Button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-6 text-lg w-full sm:w-auto">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="border-primary-600 text-primary-600 hover:bg-primary-50 px-8 py-6 text-lg w-full sm:w-auto">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-gray-600">
            Start today for free!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cta; 