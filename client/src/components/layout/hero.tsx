import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "wouter";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

const Hero = () => {
  return (
    <section 
      className={cn(
        "relative bg-white overflow-hidden",
        "py-12 sm:py-24 md:py-32 px-4"
      )}
    >
      <div className="mx-auto flex max-w-container flex-col gap-12 pt-16 sm:gap-24">
        <div className="flex flex-col items-center gap-6 text-center sm:gap-12">
          {/* Badge */}
          <Badge variant="outline" className="animate-appear gap-2">
            <span className="text-muted-foreground">Consultant time tracking made simple</span>
            <a href="/#features" className="flex items-center gap-1">
              See features
              <ArrowRight className="h-3 w-3" />
            </a>
          </Badge>

          {/* Title */}
          <h1 className="relative z-10 inline-block animate-appear bg-gradient-to-r from-gray-900 to-primary-600 bg-clip-text text-4xl font-bold leading-tight text-transparent drop-shadow-2xl sm:text-6xl sm:leading-tight md:text-7xl md:leading-tight">
            Manage your consulting business <span className="text-primary-600">effortlessly</span>
          </h1>

          {/* Description */}
          <p className="text-md relative z-10 max-w-[550px] animate-appear font-medium text-gray-600 opacity-0 delay-100 sm:text-xl">
            Track time, create invoices, and manage client engagements all in one place. 
            Built for consultants who want to spend less time on admin.
          </p>

          {/* Actions */}
          <div className="relative z-10 flex animate-appear justify-center gap-4 opacity-0 delay-300">
            <Link href="/login?tab=register">
              <Button size="lg" className="bg-primary-600 hover:bg-primary-700 text-white">
                Start for free
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/#features">
              <Button variant="glow" size="lg">
                Learn more
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero; 