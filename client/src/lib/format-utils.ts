// Format a number as currency
export function formatCurrency(amount: number | string | null | undefined, options = {}): string {
  if (amount === null || amount === undefined) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    }).format(0);
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle NaN
  if (isNaN(numAmount)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    }).format(0);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(numAmount);
}

// Format a number with specified decimal places
export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(0);
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle NaN
  if (isNaN(numValue)) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(0);
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue);
}

// Format hours with proper decimal places
export function formatHours(hours: number | string | null | undefined): string {
  if (hours === null || hours === undefined) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(0);
  }
  
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  // Handle NaN
  if (isNaN(numHours)) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(0);
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(numHours);
}

// Format hours for display, showing X hrs Y mins
export function formatHoursToHrMin(hours: number | string): string {
  const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  const wholeHours = Math.floor(numHours);
  const minutes = Math.round((numHours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''}`;
  }
  
  if (wholeHours === 0) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  
  return `${wholeHours} hr${wholeHours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
}

// Format date for display
export function formatDateDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

// Generate invoice number with prefix and padding
export function generateInvoiceNumber(prefix: string, number: number, padding = 3): string {
  const paddedNumber = number.toString().padStart(padding, '0');
  return `${prefix}-${paddedNumber}`;
}

// Calculate billable amount
export function calculateBillableAmount(hours: number, rate: number): number {
  return hours * rate;
}

// Format percentage
export function formatPercentage(value: number, decimals = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

// Format a time relative to now (e.g. "2 hours ago", "Yesterday", etc.)
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 6) {
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (diffDay > 1) {
    return `${diffDay} days ago`;
  } else if (diffDay === 1) {
    return 'Yesterday';
  } else if (diffHour >= 1) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffMin >= 1) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Format an invoice status to get the appropriate color classes
export function getStatusClasses(status: string): { bg: string, text: string } {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paid':
      return { bg: 'bg-green-100', text: 'text-green-700' };
    case 'pending':
    case 'submitted':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    case 'overdue':
      return { bg: 'bg-red-100', text: 'text-red-700' };
    case 'upcoming':
      return { bg: 'bg-blue-100', text: 'text-blue-700' };
    case 'completed':
      return { bg: 'bg-slate-100', text: 'text-slate-700' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700' };
  }
}
