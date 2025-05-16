import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const ServerStatusBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Check the API status by making a request to the user endpoint
  const { error, isError } = useQuery({
    queryKey: ['/api/user'],
    refetchOnWindowFocus: true,
    retry: 1,
    refetchInterval: 60000, // Check every minute
  });
  
  // Show banner when there's an error
  useEffect(() => {
    if (isError) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isError]);
  
  if (!isVisible) return null;
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'Server connection issue. Some features may not work.';
  
  const isDatabaseError = errorMessage.includes('Database connection unavailable');
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 z-50">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p className="text-sm">
            {isDatabaseError 
              ? 'Database connection unavailable. Please contact support.'
              : errorMessage
            }
          </p>
        </div>
        <button 
          onClick={() => setIsVisible(false)} 
          className="text-white hover:text-red-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ServerStatusBanner; 