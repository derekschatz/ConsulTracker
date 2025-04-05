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
        <path 
          d="M4 6.5C4 5.67 4.67 5 5.5 5H18.5C19.33 5 20 5.67 20 6.5V18.5C20 19.33 19.33 20 18.5 20H5.5C4.67 20 4 19.33 4 18.5V6.5Z" 
          fill="#f0f2f5" 
        />
        <path 
          d="M5 8C5 8 6 7 7 8C8 9 9 8 9 8C9 8 10 7 11 8C12 9 13 8 13 8C13 8 14 7 15 8C16 9 17 8 17 8C17 8 18 7 19 8V7C19 7 18 6 17 7C16 8 15 7 15 7C15 7 14 6 13 7C12 8 11 7 11 7C11 7 10 6 9 7C8 8 7 7 7 7C7 7 6 6 5 7V8Z" 
          fill="currentColor" 
        />
        <path 
          d="M5 19C5 19 6 18 7 19C8 20 9 19 9 19C9 19 10 18 11 19C12 20 13 19 13 19C13 19 14 18 15 19C16 20 17 19 17 19C17 19 18 18 19 19V18C19 18 18 17 17 18C16 19 15 18 15 18C15 18 14 17 13 18C12 19 11 18 11 18C11 18 10 17 9 18C8 19 7 18 7 18C7 18 6 17 5 18V19Z" 
          fill="currentColor" 
        />
        <rect x="8" y="10" width="8" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="8" y="13" width="8" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="8" y="16" width="5" height="1.5" rx="0.75" fill="currentColor" />
      </g>
    </svg>
  );
};

export default ReceiptIcon;