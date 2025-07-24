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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: []
  });

  // Return features with proper fallbacks
  return features && features.length > 0 ? features : [
    { featureKey: 'recognition', isEnabled: true },
    { featureKey: 'social', isEnabled: true },
    { featureKey: 'surveys', isEnabled: true },
    { featureKey: 'marketplace', isEnabled: true },
    { featureKey: 'analytics', isEnabled: true },
    { featureKey: 'celebrations', isEnabled: true }
  ];
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeatureEnabled(featureKey: string): boolean {
  const features = useOrganizationFeatures();
  const feature = features.find(f => f.featureKey === featureKey);
  return feature?.isEnabled ?? false;
}