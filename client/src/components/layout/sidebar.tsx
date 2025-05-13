import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useBusinessInfo } from '@/hooks/use-business-info';
import { useSubscription } from '@/hooks/use-subscription';
import {
  LayoutDashboard,
  Building2,
  Clock,
  FileText,
  LogOut,
  Settings
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { data: businessInfo } = useBusinessInfo();
  const { isPro, isTeam } = useSubscription();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Get first name for greeting
  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';

  // Only show Dashboard for Pro or Team subscriptions
  const navigationItems = [
    ...(isPro || isTeam ? [{
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard
    }] : []),
    {
      name: 'Engagements',
      href: '/engagements',
      icon: Building2
    },
    {
      name: 'Time Logs',
      href: '/time-logs',
      icon: Clock
    },
    {
      name: 'Invoices',
      href: '/invoices',
      icon: FileText
    },
  ];

  return (
    <aside className={cn(
      "hidden md:block fixed top-0 left-0 bottom-0 md:w-64 lg:w-72 bg-card border-r border-border",
      className
    )}>
      <div className="flex flex-col h-full p-5">
        {/* Logo */}
        <div className="flex items-center justify-start mb-8">
          <img src={isDarkMode ? "/images/contraq-logo-white.png" : "/images/contraq-logo.png"} alt="Contraq Logo" className="h-10" />
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
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center mr-3">
                  <item.icon className="h-5 w-5" />
                </div>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium text-foreground">
                  {user?.name 
                    ? `${user.name.split(' ')[0][0]}${user.name.split(' ')[1]?.[0] || ''}`
                    : user?.username.substring(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">
                  {user?.name || user?.username}
                </p>
                <p className="text-xs text-muted-foreground">{businessInfo?.companyName || 'Consultant'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/account/settings">
                <button 
                  className="flex items-center text-muted-foreground hover:text-foreground"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </Link>
              <button 
                onClick={() => logoutMutation.mutate()} 
                className="flex items-center text-muted-foreground hover:text-foreground"
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
