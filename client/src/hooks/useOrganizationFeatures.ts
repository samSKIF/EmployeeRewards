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
  // In a full implementation, this would fetch from /api/organization/features
  // For now, we'll check if recognition settings exist as a proxy for recognition enablement
  
  const { data: recognitionSettings } = useQuery({
    queryKey: ['/api/recognition/settings'],
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: null
  });

  // Determine if recognition is enabled based on settings availability
  const isRecognitionEnabled = Boolean(recognitionSettings);

  return [
    { featureKey: 'recognition', isEnabled: isRecognitionEnabled },
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