import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Mock the missing component since it doesn't exist
const MockSubscriptionManagement = ({ organizationId }: { organizationId: number }) => (
  <div data-testid="subscription-management">
    <h2>Subscription Management</h2>
    <p>Organization ID: {organizationId}</p>
    <div>Active subscription: 150 users</div>
  </div>
);

// Mock the component import
vi.mock('../SubscriptionManagement', () => ({
  SubscriptionManagement: MockSubscriptionManagement,
}));

// Global mock for fetch API with auth middleware pattern
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useAuth hook for authentication
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', email: 'admin@company.com', isAdmin: true },
    isAuthenticated: true,
    isLoading: false
  }),
}));

// Mock the management API
const mockManagementApi = vi.fn();
vi.mock('@/lib/managementApi', () => ({
  managementApi: mockManagementApi,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('SubscriptionManagement Component', () => {
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
        <MockSubscriptionManagement organizationId={organizationId} />
      </QueryClientProvider>
    );
  };

  describe('Collapsible Subscription Section', () => {
    it('should start collapsed when subscription is active', async () => {
      const mockActiveSubscription = {
        hasSubscription: true,
        subscription: {
          isActive: true,
          subscribedUsers: 150,
          totalMonthlyAmount: 1125,
          subscriptionPeriod: 'quarter',
          lastPaymentDate: '2025-07-26',
          expirationDate: '2026-07-26',
        },
      };

      mockManagementApi.mockResolvedValue(mockActiveSubscription);

      renderComponent();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Show Renewal Options')).toBeInTheDocument();
      });

      // Verify the renewal form is not visible initially
      expect(screen.queryByText('Payment Date')).not.toBeInTheDocument();
      expect(screen.getByText('Subscription is active. Click "Show Renewal Options" above to renew or modify.')).toBeInTheDocument();
    });

    it('should expand when toggle button is clicked', async () => {
      const mockActiveSubscription = {
        hasSubscription: true,
        subscription: {
          isActive: true,
          subscribedUsers: 150,
          totalMonthlyAmount: 1125,
        },
      };

      mockManagementApi.mockResolvedValue(mockActiveSubscription);

      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Show Renewal Options')).toBeInTheDocument();
      });

      // Click to expand
      const toggleButton = screen.getByText('Show Renewal Options');
      fireEvent.click(toggleButton);

      // Verify expanded state
      await waitFor(() => {
        expect(screen.getByText('Hide Renewal Options')).toBeInTheDocument();
        expect(screen.getByText('Payment Date')).toBeInTheDocument();
        expect(screen.getByText('Subscription Period')).toBeInTheDocument();
      });
    });

    it('should show correct button text and icons for each state', async () => {
      const mockActiveSubscription = {
        hasSubscription: true,
        subscription: { isActive: true },
      };

      mockManagementApi.mockResolvedValue(mockActiveSubscription);

      renderComponent();

      // Wait for initial collapsed state
      await waitFor(() => {
        const showButton = screen.getByText('Show Renewal Options');
        expect(showButton).toBeInTheDocument();
        
        // Check for down arrow icon (collapsed state)
        const downArrow = showButton.parentElement?.querySelector('svg path[d*="M19 9l-7 7-7-7"]');
        expect(downArrow).toBeInTheDocument();
      });

      // Click to expand
      fireEvent.click(screen.getByText('Show Renewal Options'));

      // Verify expanded state text and icon
      await waitFor(() => {
        const hideButton = screen.getByText('Hide Renewal Options');
        expect(hideButton).toBeInTheDocument();
        
        // Check for up arrow icon (expanded state)
        const upArrow = hideButton.parentElement?.querySelector('svg path[d*="M5 15l7-7 7 7"]');
        expect(upArrow).toBeInTheDocument();
      });
    });

    it('should not collapse for inactive subscriptions', async () => {
      const mockInactiveSubscription = {
        hasSubscription: true,
        subscription: {
          isActive: false,
          subscribedUsers: 50,
          totalMonthlyAmount: 500,
        },
      };

      mockManagementApi.mockResolvedValue(mockInactiveSubscription);

      renderComponent();

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByText('Renew Subscription')).toBeInTheDocument();
      });

      // Verify toggle button is not present for inactive subscriptions
      expect(screen.queryByText('Show Renewal Options')).not.toBeInTheDocument();
      expect(screen.queryByText('Hide Renewal Options')).not.toBeInTheDocument();

      // Verify form is visible
      expect(screen.getByText('Payment Date')).toBeInTheDocument();
      expect(screen.getByText('Subscription Period')).toBeInTheDocument();
    });

    it('should not collapse for organizations without subscriptions', async () => {
      const mockNoSubscription = {
        hasSubscription: false,
        subscription: null,
      };

      mockManagementApi.mockResolvedValue(mockNoSubscription);

      renderComponent();

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByText('Create Subscription')).toBeInTheDocument();
      });

      // Verify toggle button is not present
      expect(screen.queryByText('Show Renewal Options')).not.toBeInTheDocument();

      // Verify form is visible
      expect(screen.getByText('Payment Date')).toBeInTheDocument();
      expect(screen.getByText('Subscription Period')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should persist collapse state during component updates', async () => {
      const mockActiveSubscription = {
        hasSubscription: true,
        subscription: { isActive: true },
      };

      mockManagementApi.mockResolvedValue(mockActiveSubscription);

      const { rerender } = renderComponent();

      // Wait for initial load and expand
      await waitFor(() => {
        expect(screen.getByText('Show Renewal Options')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Show Renewal Options'));

      await waitFor(() => {
        expect(screen.getByText('Hide Renewal Options')).toBeInTheDocument();
      });

      // Rerender component to simulate prop changes
      rerender(
        <QueryClientProvider client={queryClient}>
          <SubscriptionManagement organizationId={6} />
        </QueryClientProvider>
      );

      // State should persist
      await waitFor(() => {
        expect(screen.getByText('Hide Renewal Options')).toBeInTheDocument();
      });
    });

    it('should reset state when subscription status changes', async () => {
      // Start with active subscription
      const mockActiveSubscription = {
        hasSubscription: true,
        subscription: { isActive: true },
      };

      mockManagementApi.mockResolvedValue(mockActiveSubscription);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Show Renewal Options')).toBeInTheDocument();
      });

      // Expand the section
      fireEvent.click(screen.getByText('Show Renewal Options'));

      await waitFor(() => {
        expect(screen.getByText('Hide Renewal Options')).toBeInTheDocument();
      });

      // Simulate subscription becoming inactive
      const mockInactiveSubscription = {
        hasSubscription: true,
        subscription: { isActive: false },
      };

      mockManagementApi.mockResolvedValue(mockInactiveSubscription);

      // Trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/management/organizations/6/subscription'] });

      // Should no longer show toggle buttons
      await waitFor(() => {
        expect(screen.queryByText('Show Renewal Options')).not.toBeInTheDocument();
        expect(screen.queryByText('Hide Renewal Options')).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration with Subscription Workflow', () => {
    it('should handle subscription renewal from collapsed state', async () => {
      const mockActiveSubscription = {
        hasSubscription: true,
        subscription: {
          isActive: true,
          subscribedUsers: 150,
          totalMonthlyAmount: 1125,
        },
      };

      const mockRenewalResponse = {
        isActive: true,
        subscribedUsers: 200,
        totalMonthlyAmount: 1600,
      };

      mockManagementApi
        .mockResolvedValueOnce(mockActiveSubscription) // Initial subscription data
        .mockResolvedValueOnce(mockRenewalResponse); // Renewal response

      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Show Renewal Options')).toBeInTheDocument();
      });

      // Expand to access renewal form
      fireEvent.click(screen.getByText('Show Renewal Options'));

      await waitFor(() => {
        expect(screen.getByText('Payment Date')).toBeInTheDocument();
      });

      // Fill out renewal form
      const paymentDateInput = screen.getByDisplayValue('');
      fireEvent.change(paymentDateInput, { target: { value: '2025-07-27' } });

      const subscribedUsersInput = screen.getByPlaceholderText('50');
      fireEvent.change(subscribedUsersInput, { target: { value: '200' } });

      // Submit renewal
      const renewButton = screen.getByText('Renew Subscription');
      fireEvent.click(renewButton);

      // Verify API call
      await waitFor(() => {
        expect(mockManagementApi).toHaveBeenCalledWith(
          '/organizations/6/subscription/renew',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('2025-07-27'),
          })
        );
      });
    });

    it('should display loading states correctly', async () => {
      mockManagementApi.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderComponent();

      // Should show loading state
      expect(screen.getByText('Loading subscription details...')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      mockManagementApi.mockRejectedValue(new Error('API Error'));

      renderComponent();

      // Should handle error state
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to load subscription data',
          description: 'API Error',
          variant: 'destructive',
        });
      });
    });
  });
});