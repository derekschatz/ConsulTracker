"use client";

import { Check, Star } from "lucide-react";
import { Button, buttonVariants } from "../ui/button";
import { Link } from "wouter";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

const plans: PricingPlan[] = [
  {
    name: "Solo",
    price: "9",
    yearlyPrice: "7",
    period: "per month",
    features: [
      "Up to 5 clients",
      "Basic time tracking",
      "Simple invoicing",
      "Email support"
    ],
    description: "Everything you need to get started",
    buttonText: "Start trial",
    href: "/login?tab=register",
    isPopular: false,
  },
  {
    name: "Pro",
    price: "19",
    yearlyPrice: "15",
    period: "per month",
    features: [
      "Unlimited clients",
      "Advanced time tracking",
      "Customizable invoices",
      "Priority support"
    ],
    description: "Perfect for growing businesses",
    buttonText: "Start trial",
    href: "/login?tab=register",
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
    href: "#",
    isPopular: false,
  },
];

const Pricing = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
  };

  return (
    <div id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <label className="relative inline-flex items-center cursor-pointer">
            <Label>
              <Switch
                ref={switchRef as any}
                checked={!isMonthly}
                onCheckedChange={handleToggle}
                className="relative"
              />
            </Label>
          </label>
          <span className="ml-2 font-semibold">
            Annual billing <span className="text-primary-600">(Save 20%)</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 sm:2 gap-4 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
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
                `rounded-2xl border-[1px] p-6 bg-white text-center lg:flex lg:flex-col lg:justify-center relative`,
                plan.isPopular ? "border-primary-600 border-2" : "border-gray-200",
                "flex flex-col shadow-sm hover:shadow-md transition-shadow",
                !plan.isPopular && "mt-5",
                index === 0 || index === 2
                  ? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]"
                  : "z-10",
                index === 0 && "origin-right",
                index === 2 && "origin-left"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-primary-600 py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                  <Star className="text-white h-4 w-4 fill-current" />
                  <span className="text-white ml-1 font-sans font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="flex-1 flex flex-col">
                <p className="text-base font-semibold text-gray-600">
                  {plan.name}
                </p>
                <div className="mt-6 flex items-center justify-center gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-gray-900">
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
                  <span className="text-sm font-semibold leading-6 tracking-wide text-gray-600">
                    / {plan.period}
                  </span>
                </div>

                <p className="text-xs leading-5 text-gray-500">
                  {isMonthly ? "billed monthly" : "billed annually"}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                      <span className="text-left text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <hr className="w-full my-6" />

                <Link
                  href={plan.href}
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                    }),
                    "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                    "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary-600 hover:ring-offset-1 hover:bg-primary-600 hover:text-white",
                    plan.isPopular
                      ? "bg-primary-600 text-white"
                      : "bg-white text-gray-900 border-primary-600 text-primary-600",
                    plan.name === "Team" && "opacity-70 cursor-not-allowed pointer-events-none"
                  )}
                >
                  {plan.buttonText}
                </Link>
                <p className="mt-4 text-sm leading-5 text-gray-500">
                  {plan.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing; 