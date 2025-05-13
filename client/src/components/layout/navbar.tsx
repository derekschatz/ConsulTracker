import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User, LogOut, LayoutDashboard, Settings, Building2, Clock, FileText, CreditCard } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface NavbarProps {
  className?: string;
  variant?: "marketing" | "app";
}

const Navbar = ({ className, variant = "marketing" }: NavbarProps) => {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { isPro, isTeam, isSolo } = useSubscription();
  const { data: businessInfo } = useBusinessInfo();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  
  const isAuthenticated = !!user;
  const isAppShell = variant === "app";
  
  // Get active state for navigation
  const isActive = (path: string) => location === path;

  return (
    <header 
      className={cn(
        "fixed w-full bg-white/90 backdrop-blur-sm z-50 border-b border-gray-100",
        isAppShell && "bg-card border-border", 
        isDarkMode && isAppShell && "bg-card/90",
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href={isAuthenticated ? "/engagements" : "/"} className="flex items-center">
              <img 
                src={isDarkMode && isAppShell ? "/images/contraq-logo-white.png" : "/images/contraq-logo.png"} 
                alt="Contraq Logo" 
                className="h-8" 
              />
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center justify-between flex-1 ml-10">
            <nav className="flex items-center space-x-6">
              {isAuthenticated ? (
                // App navigation for authenticated users
                <>
                  {/* Only show Dashboard for Pro or Team subscriptions */}
                  {(isPro || isTeam) && (
                    <Link 
                      href="/dashboard" 
                      className={cn(
                        "text-gray-700 hover:text-primary-600 font-medium flex items-center",
                        isActive("/dashboard") && isAppShell && "text-primary-600 font-semibold"
                      )}
                    >
                      <LayoutDashboard className="h-4 w-4 mr-1" />
                      Dashboard
                    </Link>
                  )}
                  <Link 
                    href="/engagements" 
                    className={cn(
                      "text-gray-700 hover:text-primary-600 font-medium flex items-center",
                      isActive("/engagements") && isAppShell && "text-primary-600 font-semibold"
                    )}
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    Engagements
                  </Link>
                  <Link 
                    href="/time-logs" 
                    className={cn(
                      "text-gray-700 hover:text-primary-600 font-medium flex items-center",
                      isActive("/time-logs") && isAppShell && "text-primary-600 font-semibold"
                    )}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Time Logs
                  </Link>
                  <Link 
                    href="/invoices" 
                    className={cn(
                      "text-gray-700 hover:text-primary-600 font-medium flex items-center",
                      isActive("/invoices") && isAppShell && "text-primary-600 font-semibold"
                    )}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Invoices
                  </Link>
                </>
              ) : (
                // Marketing navigation for unauthenticated users
                <>
                  <Link href="/" className="text-gray-700 hover:text-primary-600 font-medium">
                    Home
                  </Link>
                  <Link href="/#features" className="text-gray-700 hover:text-primary-600 font-medium">
                    Features
                  </Link>
                  <Link href="/pricing" className="text-gray-700 hover:text-primary-600 font-medium">
                    Pricing
                  </Link>
                </>
              )}
            </nav>
            
            {isAuthenticated ? (
              <div className="flex items-center">
                {/* User dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center rounded-full h-8 w-8 bg-gray-100 p-1 hover:bg-gray-200 overflow-hidden border border-gray-200">
                      <div className="h-full w-full rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {user?.name 
                            ? `${user.name.split(' ')[0][0]}${user.name.split(' ')[1]?.[0] || ''}`
                            : user?.username.substring(0, 2).toUpperCase() || 'U'}
                        </span>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-sm font-medium">
                      {user?.name || user?.username}
                      {businessInfo?.companyName && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {businessInfo.companyName}
                        </div>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    {isSolo && (
                      <DropdownMenuItem asChild>
                        <Link href="/pricing" className="cursor-pointer text-primary-600 font-medium">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Upgrade to Pro
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/account/settings" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      className="cursor-pointer text-red-600 focus:text-red-700"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div>
                <Link href="/login" className="ml-4">
                  <Button variant="outline" className="border-primary-600 text-primary-600 hover:bg-primary-50">
                    Log in
                  </Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button className="bg-primary-600 hover:bg-primary-700 text-white ml-2">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              className="text-gray-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {isAuthenticated ? (
              // App navigation for authenticated users
              <>
                {(isPro || isTeam) && (
                  <Link
                    href="/dashboard"
                    className={cn(
                      "block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50",
                      isActive("/dashboard") && "bg-gray-50 text-primary-600"
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </div>
                  </Link>
                )}
                <Link
                  href="/engagements"
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50",
                    isActive("/engagements") && "bg-gray-50 text-primary-600"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Engagements
                  </div>
                </Link>
                <Link
                  href="/time-logs"
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50",
                    isActive("/time-logs") && "bg-gray-50 text-primary-600"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Time Logs
                  </div>
                </Link>
                <Link
                  href="/invoices"
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50",
                    isActive("/invoices") && "bg-gray-50 text-primary-600"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Invoices
                  </div>
                </Link>
              </>
            ) : (
              // Marketing navigation for unauthenticated users
              <>
                <Link
                  href="/"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/#features"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
              </>
            )}
            
            {isAuthenticated ? (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {user?.name 
                        ? `${user.name.split(' ')[0][0]}${user.name.split(' ')[1]?.[0] || ''}`
                        : user?.username.substring(0, 2).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user?.name || user?.username}</div>
                    {businessInfo?.companyName && (
                      <div className="text-xs text-gray-500">{businessInfo.companyName}</div>
                    )}
                  </div>
                </div>
                <div className="mt-3 px-2">
                  {isSolo && (
                    <Link
                      href="/pricing"
                      className="block px-3 py-2 rounded-md text-base font-medium text-primary-600 hover:text-primary-700 hover:bg-gray-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Upgrade to Pro
                      </div>
                    </Link>
                  )}
                  <Link
                    href="/account/settings"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      logoutMutation.mutate();
                      setIsMenuOpen(false);
                    }}
                    disabled={logoutMutation.isPending}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-gray-50 mt-2"
                  >
                    <div className="flex items-center">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-3 space-x-3">
                  <Link
                    href="/login"
                    className="block w-full px-3 py-2 rounded-md text-center text-base font-medium text-primary-600 bg-white border border-primary-600 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/login?tab=register"
                    className="block w-full px-3 py-2 rounded-md text-center text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar; 