import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Create a custom render function that includes providers
function render(ui: React.ReactElement, { ...options } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
    user: userEvent.setup(),
  };
}

// Re-export everything
export * from '@testing-library/react';
export { render, userEvent }; 