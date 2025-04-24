import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface ApiRequestOptions {
  headers?: Record<string, string>;
  [key: string]: any;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: ApiRequestOptions,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);
  
  let requestData: string | FormData | undefined = undefined;
  let requestHeaders: HeadersInit = {};
  
  // Handle FormData or JSON data
  if (data instanceof FormData) {
    requestData = data;
    // Don't set Content-Type for FormData, browser will set it with boundary
  } else if (data) {
    requestData = JSON.stringify(data);
    requestHeaders = { "Content-Type": "application/json" };
  }
  
  // Merge headers from options
  if (options?.headers) {
    requestHeaders = { ...requestHeaders, ...options.headers };
  }
  
  console.log('Request headers:', requestHeaders);
  console.log('Request body type:', requestData instanceof FormData ? 'FormData' : typeof requestData);
  
  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: requestData,
    credentials: "include",
    ...options, // Spread remaining options
  });

  console.log(`API Response: ${res.status} ${res.statusText}`);
  
  try {
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 10000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
