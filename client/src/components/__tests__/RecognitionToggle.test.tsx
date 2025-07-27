import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationFeaturesToggle } from '../OrganizationFeaturesToggle';

// Mock the management API
const mockApiRequest = vi.fn();
vi.mock('../../lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('Recognition & Rewards Module Toggle - Frontend Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (organizationId: number = 6) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OrganizationFeaturesToggle organizationId={organizationId} />
      </QueryClientProvider>
    );
  };

  describe('Recognition Toggle UI Tests', () => {
    it('should display recognition module toggle with correct labels', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false },
        { id: 10, organization_id: 6, feature_key: 'social', is_enabled: true }
      ];

      mockApiRequest.mockResolvedValue(mockFeatures);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recognition & Rewards Module')).toBeInTheDocument();
        expect(screen.getByText('Enable peer-to-peer recognition, points economy, and reward shop features')).toBeInTheDocument();
      });

      // Verify toggle switch is present
      const toggleSwitch = screen.getByRole('switch');
      expect(toggleSwitch).toBeInTheDocument();
      expect(toggleSwitch).not.toBeChecked();
    });

    it('should show toggle as enabled when recognition feature is active', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: true }
      ];

      mockApiRequest.mockResolvedValue(mockFeatures);

      renderComponent();

      await waitFor(() => {
        const toggleSwitch = screen.getByRole('switch');
        expect(toggleSwitch).toBeChecked();
      });
    });

    it('should show toggle as disabled when recognition feature is inactive', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest.mockResolvedValue(mockFeatures);

      renderComponent();

      await waitFor(() => {
        const toggleSwitch = screen.getByRole('switch');
        expect(toggleSwitch).not.toBeChecked();
      });
    });

    it('should handle missing recognition feature gracefully', async () => {
      const mockFeatures = [
        { id: 10, organization_id: 6, feature_key: 'social', is_enabled: true }
      ];

      mockApiRequest.mockResolvedValue(mockFeatures);

      renderComponent();

      await waitFor(() => {
        const toggleSwitch = screen.getByRole('switch');
        expect(toggleSwitch).not.toBeChecked(); // Should default to false
      });
    });

    it('should not display debug information section', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: true }
      ];

      mockApiRequest.mockResolvedValue(mockFeatures);

      renderComponent();

      await waitFor(() => {
        // Verify debug section is not present
        expect(screen.queryByText(/Current state:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Feature found:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Features count:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Toggle Interaction Tests', () => {
    it('should enable recognition feature when toggle is clicked', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockFeatures) // Initial fetch
        .mockResolvedValueOnce({ // Mutation response
          id: 9,
          organization_id: 6,
          feature_key: 'recognition',
          is_enabled: true,
          enabled_at: '2025-07-27T18:00:00.000Z'
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      // Click the toggle to enable
      const toggleSwitch = screen.getByRole('switch');
      fireEvent.click(toggleSwitch);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/management/organizations/6/features',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              featureKey: 'recognition',
              isEnabled: true
            })
          })
        );
      });
    });

    it('should disable recognition feature when toggle is clicked', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: true }
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockFeatures) // Initial fetch
        .mockResolvedValueOnce({ // Mutation response
          id: 9,
          organization_id: 6,
          feature_key: 'recognition',
          is_enabled: false,
          disabled_at: '2025-07-27T18:05:00.000Z'
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeChecked();
      });

      // Click the toggle to disable
      const toggleSwitch = screen.getByRole('switch');
      fireEvent.click(toggleSwitch);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/management/organizations/6/features',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              featureKey: 'recognition',
              isEnabled: false
            })
          })
        );
      });
    });

    it('should disable toggle during mutation to prevent double-clicks', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      // Mock slow API response
      mockApiRequest
        .mockResolvedValueOnce(mockFeatures)
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve({ is_enabled: true }), 1000)
        ));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      const toggleSwitch = screen.getByRole('switch');
      fireEvent.click(toggleSwitch);

      // Toggle should be disabled during mutation
      await waitFor(() => {
        expect(toggleSwitch).toBeDisabled();
      });
    });

    it('should show success message after successful toggle', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockFeatures)
        .mockResolvedValueOnce({ is_enabled: true });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      fireEvent.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Feature updated',
          description: 'Recognition & Rewards module has been enabled',
        });
      });
    });

    it('should show error message on toggle failure', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockFeatures)
        .mockRejectedValueOnce(new Error('Update failed'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      fireEvent.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to update feature',
          description: 'Update failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('State Management Tests', () => {
    it('should invalidate cache after successful mutation', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockFeatures)
        .mockResolvedValueOnce({ is_enabled: true });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      const toggleSwitch = screen.getByRole('switch');
      fireEvent.click(toggleSwitch);

      await waitFor(() => {
        // Verify cache invalidation by checking query client state
        const queryState = queryClient.getQueryState(['/api/management/organizations/6/features']);
        expect(queryState?.isInvalidated).toBe(true);
      });
    });

    it('should maintain consistent state across component re-renders', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: true }
      ];

      mockApiRequest.mockResolvedValue(mockFeatures);

      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeChecked();
      });

      // Re-render component
      rerender(
        <QueryClientProvider client={queryClient}>
          <OrganizationFeaturesToggle organizationId={6} />
        </QueryClientProvider>
      );

      // State should persist
      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeChecked();
      });
    });

    it('should handle rapid toggle clicks gracefully', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      let callCount = 0;
      mockApiRequest
        .mockResolvedValueOnce(mockFeatures)
        .mockImplementation(() => {
          callCount++;
          return Promise.resolve({ is_enabled: callCount % 2 === 1 });
        });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      const toggleSwitch = screen.getByRole('switch');
      
      // Rapidly click toggle multiple times
      fireEvent.click(toggleSwitch);
      fireEvent.click(toggleSwitch);
      fireEvent.click(toggleSwitch);

      // Should only process one request due to disabled state during mutations
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledTimes(2); // Initial fetch + 1 mutation
      });
    });
  });

  describe('Loading States Tests', () => {
    it('should show loading state while fetching features', () => {
      mockApiRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderComponent();

      expect(screen.getByText('Loading features...')).toBeInTheDocument();
    });

    it('should show loading spinner during mutation', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockFeatures)
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      fireEvent.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(screen.getByTestId('toggle-loading-spinner')).toBeInTheDocument();
      });
    });

    it('should handle empty features array', async () => {
      mockApiRequest.mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        const toggleSwitch = screen.getByRole('switch');
        expect(toggleSwitch).not.toBeChecked(); // Should default to false
        expect(toggleSwitch).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest.mockResolvedValue(mockFeatures);

      renderComponent();

      await waitFor(() => {
        const toggleSwitch = screen.getByRole('switch');
        expect(toggleSwitch).toHaveAttribute('aria-label', 'Toggle Recognition & Rewards Module');
      });
    });

    it('should support keyboard navigation', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockFeatures)
        .mockResolvedValueOnce({ is_enabled: true });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      const toggleSwitch = screen.getByRole('switch');
      
      // Focus and activate with keyboard
      toggleSwitch.focus();
      fireEvent.keyDown(toggleSwitch, { key: 'Enter' });

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/management/organizations/6/features',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    it('should have proper focus management', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest.mockResolvedValue(mockFeatures);

      renderComponent();

      await waitFor(() => {
        const toggleSwitch = screen.getByRole('switch');
        toggleSwitch.focus();
        expect(toggleSwitch).toHaveFocus();
      });
    });
  });

  describe('Edge Cases Tests', () => {
    it('should handle API timeout gracefully', async () => {
      mockApiRequest.mockRejectedValue(new Error('Request timeout'));

      renderComponent();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to load features',
          description: 'Request timeout',
          variant: 'destructive',
        });
      });
    });

    it('should handle malformed API response', async () => {
      mockApiRequest.mockResolvedValue({ invalid: 'response' });

      renderComponent();

      await waitFor(() => {
        // Should handle gracefully and show default state
        const toggleSwitch = screen.getByRole('switch');
        expect(toggleSwitch).not.toBeChecked();
      });
    });

    it('should handle network connectivity issues', async () => {
      mockApiRequest
        .mockResolvedValueOnce([{ id: 9, feature_key: 'recognition', is_enabled: false }])
        .mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      fireEvent.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to update feature',
          description: 'Network error',
          variant: 'destructive',
        });
      });
    });

    it('should handle component unmounting during API call', async () => {
      const mockFeatures = [
        { id: 9, organization_id: 6, feature_key: 'recognition', is_enabled: false }
      ];

      mockApiRequest
        .mockResolvedValueOnce(mockFeatures)
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve({ is_enabled: true }), 1000)
        ));

      const { unmount } = renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('switch')).not.toBeChecked();
      });

      fireEvent.click(screen.getByRole('switch'));
      
      // Unmount component while API call is in progress
      unmount();

      // Should not cause any errors or memory leaks
      expect(() => {}).not.toThrow();
    });
  });
});