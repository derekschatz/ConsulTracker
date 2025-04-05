import React from 'react';

import { FileText } from 'lucide-react';

interface ReceiptIconProps {
  className?: string;
  size?: number;
}

const ReceiptIcon: React.FC<ReceiptIconProps> = ({ 
  className = "", 
  size = 24 
}) => {
  // Use the FileText icon from Lucide to match the side navigation
  return <FileText size={size} className={className} />;
};

export default ReceiptIcon;