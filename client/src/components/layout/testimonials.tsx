import { Star } from "lucide-react";

const Testimonials = () => {
  return (
    <div className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Trusted by consultants worldwide
          </h2>
          <p className="text-xl text-gray-600">
            Here's what our customers have to say about Contraq
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Testimonial 1 */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm flex flex-col h-full">
            <div className="flex mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="text-yellow-400 fill-yellow-400 h-5 w-5" />
              ))}
            </div>
            <p className="text-gray-700 mb-6 italic flex-grow">
              "Contraq has completely transformed how I manage my consulting business. 
              The time tracking and invoicing features save me hours every week."
            </p>
            <div className="mt-auto">
              <h4 className="font-bold text-gray-900">Sarah Johnson</h4>
              <p className="text-gray-600 text-sm">Marketing Consultant</p>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm flex flex-col h-full">
            <div className="flex mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="text-yellow-400 fill-yellow-400 h-5 w-5" />
              ))}
            </div>
            <p className="text-gray-700 mb-6 italic flex-grow">
              "The client management features have been a game changer. 
              I can keep track of all my projects and billing information in one place."
            </p>
            <div className="mt-auto">
              <h4 className="font-bold text-gray-900">Michael Chen</h4>
              <p className="text-gray-600 text-sm">IT Consultant</p>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm flex flex-col h-full">
            <div className="flex mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="text-yellow-400 fill-yellow-400 h-5 w-5" />
              ))}
            </div>
            <p className="text-gray-700 mb-6 italic flex-grow">
              "As a freelance consultant, keeping track of my time and billing used to be a hassle. 
              Contraq makes it so easy that I can focus on what I do best."
            </p>
            <div className="mt-auto">
              <h4 className="font-bold text-gray-900">Emily Rodriguez</h4>
              <p className="text-gray-600 text-sm">Business Analyst</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials; 