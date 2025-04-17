import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the viewport is mobile-sized
 * 
 * @param breakpoint The breakpoint width in pixels (default: 768)
 * @returns Boolean indicating if the viewport is smaller than the breakpoint
 */
export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Set on initial load
    checkMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);

    // Clean up event listener
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);

  return isMobile;
}

export default useMobile;
