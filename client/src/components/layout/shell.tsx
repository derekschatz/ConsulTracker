import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { SidebarDemo } from '@/components/ui/sidebar-demo';

interface ShellProps {
  children: ReactNode;
  className?: string;
}

const getPageTitle = (path: string): string => {
  switch (path) {
    case '/':
      return 'Dashboard';
    case '/engagements':
      return 'Engagements';
    case '/time-logs':
      return 'Time Logs';
    case '/invoices':
      return 'Invoices';
    default:
      return 'Contraq';
  }
};

const Shell = ({ children, className }: ShellProps) => {
  const [location] = useLocation();
  const pageTitle = getPageTitle(location);
  const { user } = useAuth();
  
  // Check if current path is auth page
  const isAuthPage = location === '/auth';
  
  // If on auth page, render only the children without navigation
  if (isAuthPage || !user) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // Layout with sidebar for authenticated users
  return (
    <div className="min-h-screen bg-background flex h-screen overflow-hidden">
      {/* Sidebar navigation */}
      <SidebarDemo />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto w-full">
        <div className={cn(
          "p-4 md:p-6 pt-16 md:pt-4 md:ml-[60px] min-h-screen",
          className
        )}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Shell;
