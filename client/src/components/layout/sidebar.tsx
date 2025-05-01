import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBusinessInfo } from '@/hooks/use-business-info';
import {
  LayoutDashboard,
  Building2,
  Clock,
  FileText,
  LogOut,
  Settings
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { data: businessInfo } = useBusinessInfo();

  // Get first name for greeting
  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';

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
    <aside className={cn(
      "hidden md:block fixed top-0 left-0 bottom-0 md:w-64 lg:w-72 bg-white border-r border-slate-200",
      className
    )}>
      <div className="flex flex-col h-full p-5">
        {/* Logo */}
        <div className="flex items-center justify-start mb-8">
          <img src="/images/contraq-logo.png" alt="Contraq Logo" className="h-10" />
        </div>

        {/* Nav Links */}
        <nav className="space-y-1 flex-1 overflow-y-auto">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="text-sm font-medium text-slate-700">
                  {user?.name 
                    ? `${user.name.split(' ')[0][0]}${user.name.split(' ')[1]?.[0] || ''}`
                    : user?.username.substring(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-900">
                  {user?.name || user?.username}
                </p>
                <p className="text-xs text-slate-500">{businessInfo?.companyName || 'Consultant'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/account/settings">
                <button 
                  className="flex items-center text-slate-500 hover:text-slate-700"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </Link>
              <button 
                onClick={() => logoutMutation.mutate()} 
                className="flex items-center text-slate-500 hover:text-slate-700"
                disabled={logoutMutation.isPending}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
