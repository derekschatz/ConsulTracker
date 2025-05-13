"use client";

import { cn } from "@/lib/utils";
import { Link } from "wouter";
import React, { useState, createContext, useContext, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Pin, PinOff } from "lucide-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  pinned: boolean;
  setPinned: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const [pinned, setPinned] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate, pinned, setPinned }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate, pinned, setPinned } = useSidebar();
  
  // Handle mouse enter/leave based on pinned state
  const handleMouseEnter = () => {
    if (!pinned) {
      setOpen(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (!pinned) {
      setOpen(false);
    }
  };
  
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className="flex flex-col h-full">
        {/* Main content */}
        {children}
      </div>
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full fixed top-0 left-0 z-50 border-b border-neutral-200 dark:border-neutral-700"
        )}
        {...props}
      >
        <div className="flex items-center">
          <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 mr-2" />
          <span className="font-medium text-black dark:text-white">Contraq</span>
        </div>
        <div className="flex justify-end z-20">
          <Menu
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-6 z-[100] flex flex-col",
                className
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 mr-2" />
                  <span className="font-medium text-black dark:text-white">Contraq</span>
                </div>
                <div
                  className="text-neutral-800 dark:text-neutral-200 cursor-pointer"
                  onClick={() => setOpen(!open)}
                >
                  <X />
                </div>
              </div>
              <div className="flex-1">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="block md:hidden h-14 w-full"></div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: any;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0 truncate max-w-[180px]"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

export const ToggleSidebarButton = () => {
  const { open, setOpen, pinned, setPinned } = useSidebar();
  
  // Toggle pin state
  const togglePin = () => {
    if (open) {
      setPinned(!pinned);
    } else {
      setOpen(true);
      setPinned(true);
    }
  };
  
  return (
    <button 
      onClick={togglePin}
      className="flex justify-center items-center p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-200 w-full"
      title={pinned ? "Unpin Sidebar" : "Pin Sidebar"}
      aria-label={pinned ? "Unpin Sidebar" : "Pin Sidebar"}
    >
      {pinned ? (
        <PinOff className="h-5 w-5 text-neutral-700 dark:text-neutral-200" />
      ) : (
        <Pin className="h-5 w-5 text-neutral-700 dark:text-neutral-200" />
      )}
    </button>
  );
};
