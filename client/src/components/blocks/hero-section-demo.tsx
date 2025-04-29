"use client"

import { HeroSection } from "@/components/blocks/hero-section"
import { Icons } from "@/components/ui/icons"

export function HeroSectionDemo() {
  return (
    <HeroSection
      badge={{
        text: "Introducing our new components",
        action: {
          text: "Learn more",
          href: "/docs",
        },
      }}
      title="Build faster with beautiful components"
      description="Premium UI components built with React and Tailwind CSS. Save time and ship your next project faster with our ready-to-use components."
      actions={[
        {
          text: "Get Started",
          href: "/docs/getting-started",
          variant: "default",
        },
        {
          text: "GitHub",
          href: "https://github.com/your-repo",
          variant: "glow",
          icon: <Icons.gitHub className="h-5 w-5" />,
        },
      ]}
      image={{
        light: "https://unsplash.com/photos/g5f0BJq-FRs/download?force=true",
        dark: "https://unsplash.com/photos/4zxSWESyZio/download?force=true",
        alt: "UI Components Preview",
      }}
    />
  )
} 