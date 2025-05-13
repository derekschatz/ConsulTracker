import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PersonalInfoTab from "./personal-info-tab";
import BusinessInfoTab from "./business-info-tab";
import BillingTab from "./billing-tab";
import { cn } from "@/lib/utils";

// Define the sections for our account settings
const sections = [
  { id: "personal", title: "Personal Information", description: "Update your personal information and account settings" },
  { id: "business", title: "Business Information", description: "Add your company details for invoices and billing" },
  { id: "billing", title: "Billing", description: "Manage your subscription and billing information" },
];

const AccountSettings = () => {
  const [activeSection, setActiveSection] = useState("personal");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Register section refs
  const registerSectionRef = (id: string, ref: HTMLDivElement | null) => {
    sectionRefs.current[id] = ref;
  };

  // Handle navigation click
  const scrollToSection = (sectionId: string) => {
    const sectionRef = sectionRefs.current[sectionId];
    if (sectionRef) {
      setIsScrolling(true);
      
      // Use native scrollIntoView with smooth behavior
      sectionRef.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      
      // Set the active section immediately
      setActiveSection(sectionId);
      
      // Reset scrolling flag after animation completes
      setTimeout(() => setIsScrolling(false), 500);
    }
  };

  // Track scroll position to update active section
  const handleScroll = useCallback(() => {
    if (isScrolling || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollPosition = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollMidpoint = scrollPosition + (containerHeight / 2);
    
    // Check if we're scrolled to the bottom or near bottom - if so, always set to last section
    const isNearBottom = Math.abs((container.scrollHeight - scrollPosition - containerHeight)) < 20;
    if (isNearBottom) {
      // If we're at or near the bottom, always highlight the last section (billing)
      if (activeSection !== "billing") {
        setActiveSection("billing");
      }
      return;
    }
    
    // Find the section that is currently most visible in the viewport
    let currentSectionId = activeSection;
    let maxVisibleHeight = 0;
    
    for (const sectionId in sectionRefs.current) {
      const sectionRef = sectionRefs.current[sectionId];
      if (sectionRef) {
        // Calculate the top and bottom of the section
        const sectionTop = sectionRef.offsetTop;
        const sectionBottom = sectionTop + sectionRef.offsetHeight;
        
        // Calculate how much of the section is visible
        const visibleTop = Math.max(sectionTop, scrollPosition);
        const visibleBottom = Math.min(sectionBottom, scrollPosition + containerHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        
        // If this section has more visible height than previous candidates, select it
        if (visibleHeight > maxVisibleHeight) {
          maxVisibleHeight = visibleHeight;
          currentSectionId = sectionId;
        }
        
        // Special case: if midpoint is in this section, prioritize it
        if (scrollMidpoint >= sectionTop && scrollMidpoint <= sectionBottom) {
          currentSectionId = sectionId;
          break;
        }
      }
    }

    if (currentSectionId !== activeSection) {
      setActiveSection(currentSectionId);
    }
  }, [activeSection, isScrolling]);

  // Set up scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      
      // Also listen for window scroll events since scrollIntoView affects window scroll
      window.addEventListener('scroll', handleScroll);
      
      // Call handleScroll once to set the initial active section
      handleScroll();
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // Check for hash fragments in URL and scroll to section on component mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && sections.some(section => section.id === hash)) {
      // Slightly delay to ensure refs are populated
      setTimeout(() => {
        scrollToSection(hash);
      }, 100);
    }
    
    // If no hash but URL includes "billing", navigate to billing section
    if (!hash && window.location.pathname.toLowerCase().includes('billing')) {
      setTimeout(() => {
        scrollToSection('billing');
      }, 100);
    }
    
    // Check URL parameters for section
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');
    if (sectionParam && sections.some(section => section.id === sectionParam)) {
      setTimeout(() => {
        scrollToSection(sectionParam);
      }, 100);
    }
  }, []);
  
  // Set up a mutation observer to watch for changes to the DOM that might affect scroll positions
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Recheck scroll position when DOM changes
      if (!isScrolling) {
        handleScroll();
      }
    });
    
    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current, { 
        childList: true, 
        subtree: true,
        attributes: true 
      });
    }
    
    return () => observer.disconnect();
  }, [handleScroll, isScrolling]);
  
  // Special case for the billing section - check if we need to scroll all the way to the bottom
  useEffect(() => {
    if (activeSection === "billing" && scrollContainerRef.current && sectionRefs.current["billing"]) {
      const container = scrollContainerRef.current;
      const billingRef = sectionRefs.current["billing"];
      const billingBottom = billingRef.offsetTop + billingRef.offsetHeight;
      
      // If there's not much content below the billing section, scroll to bottom to ensure billing is active
      if (container.scrollHeight - billingBottom < 100) {
        if (!isScrolling) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "auto"
          });
        }
      }
    }
  }, [activeSection, isScrolling]);

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your personal and business information
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left navigation panel */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-card rounded-lg border shadow-sm sticky top-4">
            <nav className="p-2">
              <ul className="space-y-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        activeSection === section.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Right scrollable content area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 space-y-8 overflow-y-auto max-h-[calc(100vh-150px)]"
        >
          {sections.map((section) => (
            <div 
              key={section.id}
              ref={(ref) => registerSectionRef(section.id, ref)}
              id={section.id}
              className="scroll-mt-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {section.id === "personal" && <PersonalInfoTab />}
                  {section.id === "business" && <BusinessInfoTab />}
                  {section.id === "billing" && <BillingTab />}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings; 