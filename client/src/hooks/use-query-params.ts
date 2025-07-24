import { useLocation } from 'wouter';

/**
 * A hook to get and parse query parameters from the current URL
 */
export function useQueryParams() {
  const [location] = useLocation();

  // Get the query string from the URL
  const getParamsFromUrl = () => {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    // Convert URLSearchParams to a plain object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  };

  return getParamsFromUrl();
}
