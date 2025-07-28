import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeeDirectory from '../EmployeeDirectory';

// Mock the API responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useLocation from wouter
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

describe('EmployeeDirectory - Subscription Usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays correct subscription usage with progress bar', async () => {
    const mockEmployees = [
      { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', department: 'Engineering' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', department: 'Marketing' },
      { id: 3, name: 'Bob Wilson', email: 'bob@example.com', status: 'inactive', department: 'Sales' },
    ];

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

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmployees),
        });
      }
      if (url.includes('/api/users/departments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['Engineering', 'Marketing', 'Sales']),
        });
      }
      if (url.includes('/api/users/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['New York', 'San Francisco']),
        });
      }
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

    // Check subscription usage display
    await waitFor(() => {
      expect(screen.getByText('Subscription Usage')).toBeInTheDocument();
      expect(screen.getByText('401/500')).toBeInTheDocument();
      expect(screen.getByText(/80% capacity used/)).toBeInTheDocument();
      expect(screen.getByText(/99 seats available/)).toBeInTheDocument();
    });

    // Check team members display (consolidated card)
    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('401')).toBeInTheDocument(); // Active employees prominently displayed
      expect(screen.getByText(/401 active • 1 inactive • 402 total/)).toBeInTheDocument();
    });

    // Check that progress bar is rendered
    const progressBar = document.querySelector('[style*="width: 80%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows warning alert only when usage is above 90%', async () => {
    const mockSubscriptionInfo = {
      subscribed_users: 500,
      current_usage: 460,
      active_employees: 460,
      total_employees: 461,
      usage_percentage: 92,
      available_slots: 40,
      subscription_status: 'active',
      organization_name: 'Test Org'
    };

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
      expect(screen.getByText('Subscription Limit Warning')).toBeInTheDocument();
      expect(screen.getByText(/You're using 92% of your subscription capacity/)).toBeInTheDocument();
      expect(screen.getByText(/Consider upgrading your plan/)).toBeInTheDocument();
    });
  });

  it('does not show warning alert when usage is below 90%', async () => {
    const mockSubscriptionInfo = {
      subscribed_users: 500,
      current_usage: 400,
      active_employees: 400,
      total_employees: 401,
      usage_percentage: 80,
      available_slots: 100,
      subscription_status: 'active',
      organization_name: 'Test Org'
    };

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

    // Should not show any warning alerts
    expect(screen.queryByText('Subscription Limit Warning')).not.toBeInTheDocument();
    expect(screen.queryByText('Subscription Usage Notice')).not.toBeInTheDocument();
  });

  it('handles different usage percentage color coding', async () => {
    const testCases = [
      { usage: 50, color: 'green' },
      { usage: 80, color: 'yellow' },
      { usage: 95, color: 'red' },
    ];

    for (const testCase of testCases) {
      const mockSubscriptionInfo = {
        subscribed_users: 500,
        current_usage: Math.round((testCase.usage / 100) * 500),
        active_employees: Math.round((testCase.usage / 100) * 500),
        total_employees: Math.round((testCase.usage / 100) * 500),
        usage_percentage: testCase.usage,
        available_slots: 500 - Math.round((testCase.usage / 100) * 500),
        subscription_status: 'active',
        organization_name: 'Test Org'
      };

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

      const { unmount } = renderWithQueryClient(<EmployeeDirectory />);

      await waitFor(() => {
        const progressBar = document.querySelector('[style*="width:"]');
        expect(progressBar).toBeInTheDocument();
        
        // Check color class based on usage percentage
        const colorElement = document.querySelector(`.bg-${testCase.color}-500`);
        expect(colorElement).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('handles fallback when subscription API fails', async () => {
    const mockEmployees = [
      { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', department: 'Engineering' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive', department: 'Marketing' },
    ];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmployees),
        });
      }
      if (url.includes('/api/admin/subscription/usage')) {
        return Promise.resolve({
          ok: false,
          status: 500,
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

    // Should fallback to employee array data
    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Active count from employees array
      expect(screen.getByText(/1 active • 1 inactive • 2 total/)).toBeInTheDocument();
    });

    // Should show default subscription limit (500)
    await waitFor(() => {
      expect(screen.getByText('1/500')).toBeInTheDocument();
    });
  });

  it('calculates departments count correctly', async () => {
    const mockEmployees = [
      { id: 1, name: 'John', email: 'john@example.com', status: 'active', department: 'Engineering' },
      { id: 2, name: 'Jane', email: 'jane@example.com', status: 'active', department: 'Marketing' },
      { id: 3, name: 'Bob', email: 'bob@example.com', status: 'active', department: 'Engineering' }, // Duplicate dept
      { id: 4, name: 'Alice', email: 'alice@example.com', status: 'active', department: 'Sales' },
      { id: 5, name: 'Eve', email: 'eve@example.com', status: 'active', department: null }, // No department
    ];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmployees),
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

    // Should count unique departments (Engineering, Marketing, Sales = 3)
    await waitFor(() => {
      expect(screen.getByText('Departments')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});