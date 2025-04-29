import { useState } from "react";
import { Check, Clock, FileText, Users, ChartBar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Features = () => {
  const features = [
    {
      id: "schedule",
      value: "schedule",
      title: "Schedule",
      icon: <Clock className="h-auto w-4 shrink-0" />,
      content: {
        badge: "Organization",
        heading: "Organize your consulting work efficiently",
        description: "Create and organize your projects with manageable tasks that keep everyone on the same page. Set priorities, due dates, and track progress all in one place.",
        buttonText: "Learn More",
        imageSrc: "/images/schedule-workflow.jpg",
        imageAlt: "Schedule workflow visualization",
        checks: [
          "Create and assign tasks",
          "Set due dates and priorities",
          "Organize with customizable workflows"
        ]
      }
    },
    {
      id: "track",
      value: "track",
      title: "Track",
      icon: <Clock className="h-auto w-4 shrink-0" />,
      content: {
        badge: "Time Management",
        heading: "Time Tracking Made Simple",
        description: "Easily track time spent on different client projects with a simple interface. Create detailed time logs with descriptions and categorize by project.",
        buttonText: "Learn More",
        imageSrc: "/images/time-tracking.jpg",
        imageAlt: "Time tracking interface",
        checks: [
          "One-click time tracking",
          "Detailed activity descriptions",
          "Categorize by project or task"
        ]
      }
    },
    {
      id: "invoice",
      value: "invoice",
      title: "Invoice",
      icon: <FileText className="h-auto w-4 shrink-0" />,
      content: {
        badge: "Billing",
        heading: "Professional Invoice Generation",
        description: "Generate professional invoices with just a few clicks. Automatically pull in time logs and calculate totals.",
        buttonText: "Learn More",
        imageSrc: "/images/invoice-generation.jpg",
        imageAlt: "Invoice generation screen",
        checks: [
          "Professional PDF invoices",
          "Auto-calculated line items",
          "Payment tracking and status updates"
        ]
      }
    },
    {
      id: "report",
      value: "report",
      title: "Report",
      icon: <ChartBar className="h-auto w-4 shrink-0" />,
      content: {
        badge: "Analytics",
        heading: "Client Management & Reporting",
        description: "Keep all your client information in one place, including contact details, projects, and billing history.",
        buttonText: "Learn More",
        imageSrc: "/images/reporting.jpg",
        imageAlt: "Reporting dashboard",
        checks: [
          "Centralized client database",
          "Project history and engagement tracking",
          "Complete billing information management"
        ]
      }
    }
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Badge variant="outline" className="bg-white">ConsulTracker</Badge>
          <h2 className="max-w-2xl text-3xl font-bold text-gray-900 md:text-4xl">
            Everything consultants need
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl">
            Simplify your consulting business with these powerful tools
          </p>
        </div>

        <Tabs defaultValue={features[0].value} className="mt-12">
          <TabsList className="container flex flex-col items-center justify-center gap-4 sm:flex-row md:gap-10 bg-transparent p-0">
            {features.map((feature) => (
              <TabsTrigger
                key={feature.value}
                value={feature.value}
                className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-gray-600 data-[state=active]:bg-primary-600 data-[state=active]:text-white shadow-sm border border-gray-200 data-[state=active]:border-primary-600"
              >
                {feature.icon} {feature.title}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="mx-auto mt-8 max-w-screen-xl rounded-2xl bg-gray-50 p-6 lg:p-12">
            {features.map((feature) => (
              <TabsContent
                key={feature.value}
                value={feature.value}
                className="grid place-items-center gap-12 lg:grid-cols-2 lg:gap-10"
              >
                <div className="flex flex-col gap-5">
                  <Badge variant="outline" className="w-fit bg-white">
                    {feature.content.badge}
                  </Badge>
                  <h3 className="text-2xl font-bold text-gray-900 lg:text-3xl">
                    {feature.content.heading}
                  </h3>
                  <p className="text-gray-600 lg:text-lg">
                    {feature.content.description}
                  </p>
                  
                  <ul className="space-y-3 mt-2">
                    {feature.content.checks.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="text-primary-600 h-5 w-5 mr-2 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="mt-4 w-fit bg-primary-600 hover:bg-primary-700 text-white" 
                    size="lg"
                  >
                    {feature.content.buttonText}
                  </Button>
                </div>
                
                <img
                  src={feature.content.imageSrc} 
                  alt={feature.content.imageAlt}
                  className="rounded-xl shadow-lg border border-gray-200 w-full h-auto max-h-[450px] object-cover"
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
};

export default Features; 