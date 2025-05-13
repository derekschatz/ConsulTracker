"use client";

import { Check, CheckCircle2, Star, CreditCard } from "lucide-react";
import { Button, buttonVariants } from "../ui/button";
import { Link } from "wouter";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  isPopular: boolean;
  isComingSoon?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: "Solo",
    price: "0",
    yearlyPrice: "0",
    period: "per month",
    features: [
      "Up to 2 clients",
      "Time tracking",
      "Standard Invoice Template",
      "Email support"
    ],
    description: "Everything you need to get started",
    buttonText: "Sign Up Free",
    monthlyPriceId: "",
    yearlyPriceId: "",
    isPopular: false,
  },
  {
    name: "Pro",
    price: "19",
    yearlyPrice: "15",
    period: "per month",
    features: [
      "Unlimited clients",
      "Metrics Dashboard",
      "Customizable invoices",
      "Priority support"
    ],
    description: "Perfect for growing businesses",
    buttonText: "Start trial",
    monthlyPriceId: "price_1RJIy0KC0x0Qg4vJqwpLtIjT",
    yearlyPriceId: "price_1RJDPtKC0x0Qg4vJiLu33TUe",
    isPopular: true,
  },
  {
    name: "Team",
    price: "49",
    yearlyPrice: "39",
    period: "per month",
    features: [
      "Everything in Pro, plus:",
      "Team management",
      "Advanced reporting",
      "Custom integrations",
      "Dedicated account manager"
    ],
    description: "For larger consulting teams",
    buttonText: "Coming Soon",
    monthlyPriceId: "",
    yearlyPriceId: "",
    isPopular: false,
    isComingSoon: true,
  },
];

// Declare the custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-buy-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'buy-button-id'?: string;
        'publishable-key'?: string;
      }, HTMLElement>;
    }
  }
}

const Pricing = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const { tier: userTier, isLoading: isLoadingSubscription } = useSubscription();
  
  const isAuthenticated = !!user;

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
  };

  // Create a better implementation for the Stripe checkout
  const redirectToStripe = (priceId: string) => {
    // Use Stripe's recommended approach - redirect to their dashboard checkout page
    // This is a temporary solution - ideally should be handled server-side
    
    // Map price IDs to their corresponding checkout URLs from Stripe Dashboard
    const checkoutUrls: Record<string, string> = {
      'price_1RJIy0KC0x0Qg4vJqwpLtIjT': 'https://buy.stripe.com/bIY3fh11P5TWeMUcMQ', // Pro Monthly
      'price_1RJDPtKC0x0Qg4vJiLu33TUe': 'https://buy.stripe.com/aEU9DF4e1beg5ck28a', // Pro Yearly
    };
    
    // Get the checkout URL for the selected price
    const checkoutUrl = checkoutUrls[priceId];
    
    if (checkoutUrl) {
      console.log(`Redirecting to Stripe Dashboard checkout: ${checkoutUrl}`);
      window.location.href = checkoutUrl;
    } else {
      // Fallback to Stripe's product page if we don't have a direct link
      console.log(`No direct checkout URL for price ID: ${priceId}, redirecting to Stripe`);
      window.location.href = 'https://stripe.com/payments';
    }
  };

  return (
    <div id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <label className="relative inline-flex items-center cursor-pointer">
            <span className="mr-2 font-semibold text-foreground">Monthly</span>
            <Switch
              ref={switchRef as any}
              checked={!isMonthly}
              onCheckedChange={handleToggle}
              className="relative"
            />
            <span className="ml-2 font-semibold text-foreground">
              Annual <span className="text-primary-600 dark:text-primary-400">(Save 20%)</span>
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 sm:2 gap-4 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            // Check if this is the user's current plan
            const isCurrentPlan = isAuthenticated && !isLoadingSubscription && plan.name.toLowerCase() === userTier;
            
            return (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 1 }}
              whileInView={
                isDesktop
                  ? {
                      y: plan.isPopular ? -20 : 0,
                      opacity: 1,
                      x: index === 2 ? -30 : index === 0 ? 30 : 0,
                      scale: index === 0 || index === 2 ? 0.94 : 1.0,
                    }
                  : {}
              }
              viewport={{ once: true }}
              transition={{
                duration: 1.6,
                type: "spring",
                stiffness: 100,
                damping: 30,
                delay: 0.4,
                opacity: { duration: 0.5 },
              }}
              className={cn(
                `rounded-2xl border-[1px] p-6 bg-card text-card-foreground text-center lg:flex lg:flex-col lg:justify-center relative`,
                plan.isPopular ? "border-primary-600 border-2 dark:border-primary-400" : isCurrentPlan ? "border-green-500 border-2 dark:border-green-400" : "border-border dark:border-white/20",
                "flex flex-col shadow-sm hover:shadow-md transition-shadow",
                !plan.isPopular && !isCurrentPlan && "mt-5",
                index === 0 || index === 2
                  ? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]"
                  : "z-10",
                index === 0 && "origin-right",
                index === 2 && "origin-left"
              )}
            >
              {plan.isPopular && !isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-primary-600 dark:bg-primary-500 py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                  <Star className="text-primary-foreground h-4 w-4 fill-current" />
                  <span className="text-primary-foreground ml-1 font-sans font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 bg-green-500 dark:bg-green-600 py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                  <CheckCircle2 className="text-white h-4 w-4" />
                  <span className="text-white ml-1 font-sans font-semibold">
                    Current Plan
                  </span>
                </div>
              )}
              
              <div className="flex-1 flex flex-col">
                <p className="text-base font-semibold text-foreground">
                  {plan.name}
                </p>
                <div className="mt-6 flex items-center justify-center gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-foreground">
                    <NumberFlow
                      value={
                        isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)
                      }
                      format={{
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }}
                      transformTiming={{
                        duration: 500,
                        easing: "ease-out",
                      }}
                      willChange
                      className="font-variant-numeric: tabular-nums"
                    />
                  </span>
                  <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                    / {plan.period}
                  </span>
                </div>

                <p className="text-xs leading-5 text-muted-foreground">
                  {isMonthly ? "billed monthly" : "billed annually"}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                      <span className="text-left text-foreground dark:text-white">{feature}</span>
                    </li>
                  ))}
                </ul>

                <hr className="w-full my-6 border-border" />

                {plan.isComingSoon ? (
                  <Button 
                    variant="outline"
                    className={cn(
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter opacity-70 cursor-not-allowed",
                      "bg-card text-foreground border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400"
                    )}
                    disabled
                  >
                    {plan.buttonText}
                  </Button>
                ) : isCurrentPlan ? (
                  <Button
                    variant="outline"
                    className={cn(
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                      "bg-green-500 dark:bg-green-600 text-white border-green-500 dark:border-green-600 cursor-default"
                    )}
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : plan.name === "Solo" ? (
                  isAuthenticated ? (
                    userTier !== 'solo' ? (
                      <Button 
                        variant="outline"
                        className={cn(
                          "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                          "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary-600 dark:hover:ring-primary-400 hover:ring-offset-1 hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-primary-foreground",
                          "bg-card text-foreground border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400"
                        )}
                        onClick={() => window.location.href = "/account/settings"}
                      >
                        Downgrade
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        className={cn(
                          "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                          "bg-green-500 dark:bg-green-600 text-white border-green-500 dark:border-green-600 cursor-default"
                        )}
                        disabled
                      >
                        Current Plan
                      </Button>
                    )
                  ) : (
                    <Link href="/login?tab=register">
                      <Button 
                        variant="outline"
                        className={cn(
                          "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                          "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary-600 dark:hover:ring-primary-400 hover:ring-offset-1 hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-primary-foreground",
                          "bg-card text-foreground border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400"
                        )}
                      >
                        {plan.buttonText}
                      </Button>
                    </Link>
                  )
                ) : (
                  <Button 
                    variant="outline"
                    className={cn(
                      "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                      "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary-600 dark:hover:ring-primary-400 hover:ring-offset-1 hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-primary-foreground",
                      plan.isPopular
                        ? "bg-primary-600 dark:bg-primary-500 text-primary-foreground"
                        : "bg-card text-foreground border-primary-600 dark:border-primary-400 text-primary-600 dark:text-white"
                    )}
                    onClick={() => redirectToStripe(isMonthly ? plan.monthlyPriceId : plan.yearlyPriceId)}
                  >
                    {isAuthenticated && userTier === 'solo' ? 'Upgrade' : plan.buttonText}
                  </Button>
                )}
                <p className="mt-4 text-sm leading-5 text-muted-foreground dark:text-gray-300">
                  {plan.description}
                </p>
              </div>
            </motion.div>
          )})}
        </div>
      </div>
    </div>
  );
};

export default Pricing; 