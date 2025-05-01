import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  Menu,
  LayoutDashboard,
  Building2,
  Clock,
  FileText,
  X,
  LogOut,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileNavProps {
  className?: string;
}

const MobileNav = ({ className }: MobileNavProps) => {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logoutMutation } = useAuth();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

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
    <>
      {/* Mobile Header */}
      <header className={cn("md:hidden bg-white border-b border-slate-200 p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/images/contraq-logo.png" alt="Contraq Logo" className="h-8" />
          </div>
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMenu}
            className="text-slate-700 p-1"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Menu (hidden by default) */}
      <div 
        className={cn(
          "md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMenu}
      >
        <div 
          className={cn(
            "fixed right-0 top-0 h-full w-64 bg-white shadow-xl transition-transform transform",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-semibold text-lg">Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeMenu}
              className="text-slate-700 p-1"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <nav className="py-2">
            {navigationItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(
                    "flex items-center px-4 py-3",
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
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
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
                  <p className="text-xs text-slate-500">Consultant</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Link href="/account/settings" onClick={closeMenu}>
                  <button 
                    className="flex items-center justify-center text-slate-500 hover:text-slate-700 p-2"
                    aria-label="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </Link>
                <button 
                  onClick={() => {
                    logoutMutation.mutate();
                    closeMenu();
                  }} 
                  className="flex items-center justify-center text-slate-500 hover:text-slate-700 p-2"
                  disabled={logoutMutation.isPending}
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
