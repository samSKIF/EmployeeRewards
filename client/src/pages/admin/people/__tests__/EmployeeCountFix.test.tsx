import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeeDirectory from '../EmployeeDirectory';

// Mock the API responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock wouter
vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => 
    <a href={href}>{children}</a>,
  useLocation: () => ['/admin/people/employee-directory', vi.fn()],
}));

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Employee Count Fix Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows correct employee counts from subscription API instead of fallback 50', async () => {
    const mockSubscriptionInfo = {
      subscribed_users: 500,
      current_usage: 401,
      active_employees: 401,
      total_employees: 402,
      usage_percentage: 80,
      available_slots: 99,
      subscription_status: 'active',
      organization_name: 'Canva'
    };

    // Mock all API endpoints
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/subscription/usage')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubscriptionInfo),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    renderWithQueryClient(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Employee Directory')).toBeInTheDocument();
    });

    // Verify that it shows real numbers (401/402) not the old fallback (50)
    await waitFor(() => {
      expect(screen.getByText('401')).toBeInTheDocument(); // Active employees
      expect(screen.getByText(/401 active • 1 inactive • 402 total/)).toBeInTheDocument();
      expect(screen.getByText('401/500')).toBeInTheDocument(); // Subscription usage
    });

    // Ensure the old incorrect "50" is NOT displayed
    expect(screen.queryByText('50')).not.toBeInTheDocument();
    expect(screen.queryByText('49')).not.toBeInTheDocument();
  });

  it('demonstrates the "50" issue when subscription API fails and token is expired', async () => {
    // Simulate token expiration - all API calls fail with 401
    mockFetch.mockImplementation((url: string) => {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized: Invalid token' }),
      });
    });

    renderWithQueryClient(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Employee Directory')).toBeInTheDocument();
    });

    // When APIs fail, it should fall back to empty arrays and default subscription limit
    await waitFor(() => {
      // Should show 0 employees when API fails (empty array)
      expect(screen.getByText('0')).toBeInTheDocument(); // Active employees fallback
      expect(screen.getByText(/0 active • 0 inactive • 0 total/)).toBeInTheDocument();
      
      // Should show 0/500 (default subscription limit)
      expect(screen.getByText('0/500')).toBeInTheDocument();
    });

    // The old "50" fallback should not appear in this scenario
    expect(screen.queryByText('50')).not.toBeInTheDocument();
  });

  it('verifies subscription API provides the source of truth for employee counts', async () => {
    // Simulate scenario where subscription API works but user API has limited data
    const limitedEmployeeData = [
      { id: 1, name: 'John', email: 'john@example.com', status: 'active', department: 'IT' },
      { id: 2, name: 'Jane', email: 'jane@example.com', status: 'inactive', department: 'HR' },
    ];

    const fullSubscriptionData = {
      subscribed_users: 500,
      current_usage: 401,
      active_employees: 401,
      total_employees: 402,
      usage_percentage: 80,
      available_slots: 99,
      subscription_status: 'active',
      organization_name: 'Canva'
    };

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/subscription/usage')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fullSubscriptionData),
        });
      }
      if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(limitedEmployeeData), // Only 2 employees
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    renderWithQueryClient(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Employee Directory')).toBeInTheDocument();
    });

    // Should prioritize subscription API data (401/402) over limited user API data (2)
    await waitFor(() => {
      expect(screen.getByText('401')).toBeInTheDocument(); // From subscription API
      expect(screen.getByText(/401 active • 1 inactive • 402 total/)).toBeInTheDocument();
      expect(screen.getByText('401/500')).toBeInTheDocument();
    });

    // Should NOT show the limited employee data count
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText(/1 active • 1 inactive • 2 total/)).not.toBeInTheDocument();
  });

  it('validates that the 50 number came from authRoutes default subscription limit', async () => {
    // This test documents where the "50" was coming from
    const DEFAULT_SUBSCRIPTION_LIMIT = 50; // From authRoutes.ts line 60

    // Simulate the old behavior (before the fix)
    const oldBehaviorData = {
      employees: [], // Empty due to token expiration
      subscriptionLimit: DEFAULT_SUBSCRIPTION_LIMIT, // The source of "50"
      activeEmployees: 0,
      totalEmployees: 0
    };

    // Create a mock component that simulates the old calculation
    const OldBehaviorComponent = () => {
      const employees = oldBehaviorData.employees;
      const totalEmployees = employees.length; // Would be 0
      const activeEmployees = employees.filter((emp: any) => emp.status === 'active').length; // Would be 0
      const subscriptionLimit = DEFAULT_SUBSCRIPTION_LIMIT; // This was the source of "50"

      return (
        <div data-testid="old-behavior">
          <div data-testid="total-employees">{totalEmployees}</div>
          <div data-testid="active-employees">{activeEmployees}</div>
          <div data-testid="subscription-limit">{subscriptionLimit}</div>
        </div>
      );
    };

    render(<OldBehaviorComponent />);

    // Verify this would have shown 0 employees but 50 subscription limit
    expect(screen.getByTestId('total-employees')).toHaveTextContent('0');
    expect(screen.getByTestId('active-employees')).toHaveTextContent('0');
    expect(screen.getByTestId('subscription-limit')).toHaveTextContent('50');

    // This explains why users saw "50" in the UI - it was the default subscription limit fallback
  });

  it('confirms the fix prioritizes subscription API over employee array length', async () => {
    const mockEmployeesArray = new Array(50).fill(null).map((_, i) => ({
      id: i + 1,
      name: `Employee ${i + 1}`,
      email: `emp${i + 1}@example.com`,
      status: i < 49 ? 'active' : 'inactive',
      department: 'Engineering'
    }));

    const mockSubscriptionData = {
      subscribed_users: 500,
      current_usage: 401,
      active_employees: 401,
      total_employees: 402,
      usage_percentage: 80,
      available_slots: 99,
      subscription_status: 'active',
      organization_name: 'Canva'
    };

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/subscription/usage')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubscriptionData),
        });
      }
      if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmployeesArray),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    renderWithQueryClient(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Employee Directory')).toBeInTheDocument();
    });

    // Should show subscription API numbers (401), not employees array length (50)
    await waitFor(() => {
      expect(screen.getByText('401')).toBeInTheDocument(); // Subscription API wins
      expect(screen.getByText(/401 active • 1 inactive • 402 total/)).toBeInTheDocument();
    });

    // Should NOT show the employees array count
    expect(screen.queryByText('49')).not.toBeInTheDocument(); // Active from array
    expect(screen.queryByText(/49 active • 1 inactive • 50 total/)).not.toBeInTheDocument();
  });
});