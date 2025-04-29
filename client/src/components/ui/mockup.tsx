import React from "react";
import { cn } from "@/lib/utils";

export interface MockupProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "browser" | "phone" | "window" | "responsive";
  children: React.ReactNode;
}

export function Mockup({
  className,
  type = "browser",
  children,
  ...props
}: MockupProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-background",
        {
          "rounded-xl p-4 shadow-lg": type === "window",
          "rounded-[2.5rem] p-4 shadow-xl": type === "phone",
          "shadow-lg": type === "browser" || type === "responsive"
        },
        className
      )}
      {...props}
    >
      {type === "browser" && (
        <div className="flex items-center border-b border-border bg-muted px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
          <div className="ml-4 h-3.5 w-3/5 rounded-full bg-muted-foreground/20" />
        </div>
      )}
      {type === "phone" && (
        <>
          <div className="absolute left-1/2 top-0 h-6 w-24 -translate-x-1/2 rounded-b-lg bg-muted" />
          <div className="absolute bottom-2 left-1/2 h-4 w-12 -translate-x-1/2 rounded-full border border-border" />
        </>
      )}
      {type === "window" && (
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
        </div>
      )}
      <div
        className={cn("overflow-hidden", {
          "h-full w-full": type === "responsive",
        })}
      >
        {children}
      </div>
    </div>
  );
}

export interface MockupFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "small" | "medium" | "large" | "full";
  children: React.ReactNode;
}

export function MockupFrame({
  className,
  size = "medium",
  children,
  ...props
}: MockupFrameProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden",
        {
          "max-w-screen-sm": size === "small",
          "max-w-screen-md": size === "medium",
          "max-w-screen-lg": size === "large",
          "w-full": size === "full",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
} 