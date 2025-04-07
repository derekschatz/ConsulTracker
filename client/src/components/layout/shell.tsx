import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import Sidebar from './sidebar';
import MobileNav from './mobile-nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

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
      return 'ConsultTrack';
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
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  // Normal layout with navigation for authenticated users
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Hidden on mobile */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Navigation */}
        <MobileNav />

        {/* Content Wrapper */}
        <div className={cn("flex-1 overflow-y-auto p-4 md:p-6 lg:p-8", className)}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Shell;
