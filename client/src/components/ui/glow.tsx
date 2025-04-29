import React from "react";
import { cn } from "@/lib/utils";

type GlowVariant = "top" | "bottom" | "all";

export interface GlowProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlowVariant;
  size?: "small" | "medium" | "large";
}

export function Glow({
  className,
  variant = "all",
  size = "medium",
  ...props
}: GlowProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10",
        {
          "bottom-0 left-1/2 -translate-x-1/2": variant === "bottom",
          "left-1/2 top-0 -translate-x-1/2": variant === "top",
          "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2": variant === "all",
          "h-64 w-[150%]": size === "small",
          "h-96 w-[250%]": size === "medium",
          "h-[500px] w-[350%]": size === "large",
        },
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-60 blur-[100px]",
          {
            "bg-gradient-to-b from-primary/40 via-purple-500/20 to-transparent": 
              variant === "top",
            "bg-gradient-to-t from-primary/40 via-purple-500/20 to-transparent": 
              variant === "bottom",
            "bg-gradient-radial from-primary/30 via-purple-500/20 to-transparent": 
              variant === "all",
          }
        )}
      />
    </div>
  );
} 