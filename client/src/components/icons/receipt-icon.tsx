import React from 'react';

interface ReceiptIconProps {
  className?: string;
  size?: number;
}

const ReceiptIcon: React.FC<ReceiptIconProps> = ({ 
  className = "", 
  size = 24 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        {/* Document background */}
        <path 
          d="M5 3.5C5 2.67 5.67 2 6.5 2H17.5C18.33 2 19 2.67 19 3.5V20.5C19 21.33 18.33 22 17.5 22H6.5C5.67 22 5 21.33 5 20.5V3.5Z" 
          fill="#f0f2f5" 
        />
        
        {/* Folded corner */}
        <path 
          d="M17 2L19 4V2H17Z" 
          fill="#e0e4e8" 
        />
        
        {/* List lines */}
        <rect x="7.5" y="6" width="9" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="7.5" y="9" width="9" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="7.5" y="12" width="9" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="7.5" y="15" width="6" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="7.5" y="18" width="4" height="1.5" rx="0.75" fill="currentColor" />
        
        {/* Document outline */}
        <path 
          d="M17.5 2H6.5C5.67 2 5 2.67 5 3.5V20.5C5 21.33 5.67 22 6.5 22H17.5C18.33 22 19 21.33 19 20.5V3.5C19 2.67 18.33 2 17.5 2Z"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Time indicator */}
        <circle cx="16" cy="4" r="0.5" fill="currentColor" />
      </g>
    </svg>
  );
};

export default ReceiptIcon;