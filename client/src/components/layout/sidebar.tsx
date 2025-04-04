import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Clock,
  FileText,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const [location] = useLocation();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Engagements',
      href: '/engagements',
      icon: Building2,
    },
    {
      name: 'Time Logs',
      href: '/time-logs',
      icon: Clock,
    },
    {
      name: 'Invoices',
      href: '/invoices',
      icon: FileText,
    },
  ];

  return (
    <aside className={cn("hidden md:flex md:w-64 lg:w-72 flex-col bg-white border-r border-slate-200 h-screen", className)}>
      <div className="flex flex-col h-full p-5">
        {/* Logo */}
        <div className="flex items-center justify-start mb-8">
          <div className="h-10 w-10 rounded-md bg-blue-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="ml-3 text-xl font-semibold">ConsultTrack</h1>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1 flex-1">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-md",
                  isActive
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-sm font-medium text-slate-700">JD</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-900">John Doe</p>
              <p className="text-xs text-slate-500">Consultant</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
