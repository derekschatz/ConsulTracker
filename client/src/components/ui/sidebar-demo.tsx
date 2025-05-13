"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink, ToggleSidebarButton } from "@/components/ui/sidebar";
import { LayoutDashboard, UserCog, Clock, FileText, Settings, LogOut, Zap } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SidebarDemo() {
  const { user, logoutMutation } = useAuth();
  const { isPro, isTeam } = useSubscription();
  const [open, setOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Get user's name and create initials
  const userName = user?.name || user?.username || '';
  const nameParts = userName.split(' ');
  const initials = nameParts.length > 1 
    ? `${nameParts[0][0]}${nameParts[1][0]}` 
    : userName.substring(0, 2);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const openLogoutDialog = () => {
    setLogoutDialogOpen(true);
  };

  // Define navigation links based on subscription
  const links = [
    ...(isPro || isTeam ? [{
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    }] : []),
    {
      label: "Engagements",
      href: "/engagements",
      icon: (
        <UserCog className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Time Logs",
      href: "/time-logs",
      icon: (
        <Clock className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Invoices",
      href: "/invoices",
      icon: (
        <FileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];
  
  return (
    <>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="flex flex-col h-full">
          {/* Logo */}
          <div className="mb-6">
            {open ? <Logo /> : <LogoIcon />}
          </div>
            
          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </nav>
            
          {/* Upgrade button section - only shown if not pro or team */}
          {!isPro && !isTeam && (
            <div className="mt-6">
              {open ? (
                <Link href="/account/billing">
                  <button className="w-full flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">Upgrade Plan</span>
                  </button>
                </Link>
              ) : (
                <Link href="/account/billing" className="block text-center">
                  <button 
                    className="w-full flex justify-center items-center bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
                    aria-label="Upgrade Plan"
                    title="Upgrade Plan"
                  >
                    <Zap className="h-5 w-5" />
                  </button>
                </Link>
              )}
            </div>
          )}
            
          {/* Expand/Collapse button above user icon */}
          <div className="mt-auto">
            <div className="mb-2">
              <ToggleSidebarButton />
            </div>
            
            {/* User Account and Logout section */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
              {!open ? (
                <>
                  {/* Collapsed view - logout button above user icon */}
                  <div className="mb-2">
                    <button
                      onClick={openLogoutDialog}
                      className="w-full p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center"
                      aria-label="Logout"
                    >
                      <LogOut className="h-5 w-5 text-neutral-700 dark:text-neutral-200" />
                    </button>
                  </div>
                  <SidebarLink
                    link={{
                      label: userName,
                      href: "/account/settings",
                      icon: (
                        <div className="h-7 w-7 flex-shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center">
                          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                            {initials.toUpperCase()}
                          </span>
                        </div>
                      ),
                    }}
                  />
                </>
              ) : (
                /* Expanded view - logout button to the right of user icon */
                <div className="flex items-center">
                  <div className="flex-grow">
                    <SidebarLink
                      link={{
                        label: userName,
                        href: "/account/settings",
                        icon: (
                          <div className="h-7 w-7 flex-shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center">
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                              {initials.toUpperCase()}
                            </span>
                          </div>
                        ),
                      }}
                    />
                  </div>
                  <button
                    onClick={openLogoutDialog}
                    className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                    aria-label="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Logo = () => {
  return (
    <Link
      href="#"
      className="font-normal flex items-center text-sm relative z-20"
    >
      <img
        src="/images/contraq-logo.png"
        alt="Contraq Logo"
        className="h-8 object-contain"
      />
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="#"
      className="font-normal flex items-center text-sm relative z-20"
    >
      <img
        src="/images/noBgColor-IconOnly.png"
        alt="Contraq Logo"
        className="h-8 w-8 object-contain"
      />
    </Link>
  );
}; 