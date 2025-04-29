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
          <Link href="/login?tab=register">
            <Button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-6 text-lg">
              Start your free trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="mt-4 text-gray-600">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cta; 