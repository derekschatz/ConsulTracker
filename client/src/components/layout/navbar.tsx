import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed w-full bg-white/90 backdrop-blur-sm z-50 border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="bg-primary-600 text-white p-2 rounded-md mr-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Contrack</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-700 hover:text-primary-600 font-medium">
              Home
            </Link>
            <Link href="/#features" className="text-gray-700 hover:text-primary-600 font-medium">
              Features
            </Link>
            <Link href="/#pricing" className="text-gray-700 hover:text-primary-600 font-medium">
              Pricing
            </Link>
            <Link href="/login" className="ml-4">
              <Button variant="outline" className="border-primary-600 text-primary-600 hover:bg-primary-50">
                Log in
              </Button>
            </Link>
            <Link href="/login?tab=register">
              <Button className="bg-primary-600 hover:bg-primary-700 text-white">
                Sign up
              </Button>
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              className="text-gray-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/#features"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-3 space-x-3">
                <Link
                  href="/login"
                  className="block w-full px-3 py-2 rounded-md text-center text-base font-medium text-primary-600 bg-white border border-primary-600 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/login?tab=register"
                  className="block w-full px-3 py-2 rounded-md text-center text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar; 