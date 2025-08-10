import { QueryClient, QueryFunction } from '@tanstack/react-query';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>
): Promise<Response> {
  // Get JWT token from localStorage
  const token = localStorage.getItem('token');
  
  // Get tenant_id from localStorage (stored during login)
  const tenantId = localStorage.getItem('tenant_id') || '1';

  // Prepare headers with auth token
  const headers: Record<string, string> = { ...customHeaders };
  
  // Only set Content-Type for JSON data, not for FormData
  if (data && !(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add tenant_id to URL if not already present
  let finalUrl = url;
  if (!url.includes('tenant_id=')) {
    const separator = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${separator}tenant_id=${tenantId}`;
  }

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: 'include',
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = 'returnNull' | 'throw';
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get auth token from localStorage - try Firebase token first, then fallback to JWT token
    const firebaseToken = localStorage.getItem('firebaseToken');
    const jwtToken = localStorage.getItem('token');
    const token = firebaseToken || jwtToken;
    
    // Get tenant_id from localStorage (stored during login)
    const tenantId = localStorage.getItem('tenant_id') || '1';

    // Prepare headers
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add tenant_id to URL if not already present
    let url = queryKey[0] as string;
    if (!url.includes('tenant_id=')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}tenant_id=${tenantId}`;
    }

    const res = await fetch(url, {
      credentials: 'include',
      headers,
    });

    if (unauthorizedBehavior === 'returnNull' && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'returnNull' }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 10 * 60 * 1000, // 10 minutes - longer cache for better performance
      gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
      retry: (failureCount, error) => {
        if (
          error?.message?.includes('401') ||
          error?.message?.includes('403')
        ) {
          return false; // Don't retry auth errors
        }
        return failureCount < 1; // Reduce retry attempts for faster response
      },
      retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000), // Faster retry delay
    },
    mutations: {
      retry: false, // Don't retry mutations for faster response
    },
  },
});
