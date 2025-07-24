import { useQuery } from '@tanstack/react-query';

interface OrganizationFeature {
  featureKey: string;
  isEnabled: boolean;
}

/**
 * Hook to get organization features for the current user's organization
 * This determines which features are enabled/disabled for conditional UI rendering
 */
export function useOrganizationFeatures(): OrganizationFeature[] {
  // Fetch organization features from the new API endpoint
  const { data: features } = useQuery({
    queryKey: ['/api/admin/organization/features'],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue polling when tab is in background
    placeholderData: []
  });

  // Return features from API or empty array
  return features || [];
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeatureEnabled(featureKey: string): boolean {
  const features = useOrganizationFeatures();
  const feature = features.find(f => f.featureKey === featureKey);
  return feature?.isEnabled ?? false;
}