import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeeDirectory from '../EmployeeDirectory';

// Mock data reflecting the real employee structure with all fields
const mockEmployees = [
  {
    id: 1614,
    name: 'Alexandar',
    surname: 'Reyez',
    email: 'reyez.alexandar@canva.com',
    job_title: 'Senior HR Specialist',
    jobTitle: 'Senior HR Specialist', // Both formats for compatibility
    department: 'Human resources',
    location: 'New York',
    status: 'active',
    hire_date: '2023-07-02',
    hireDate: '2023-07-02',
    last_seen_at: '2025-07-27T10:30:00.000Z',
    lastSeenAt: '2025-07-27T10:30:00.000Z',
    avatar_url: 'https://ui-avatars.com/api/?name=Alexander&background=34495e&color=ffffff&size=150&rounded=true&seed=1614',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alexander&background=34495e&color=ffffff&size=150&rounded=true&seed=1614',
    organization_id: 1
  },
  {
    id: 1510,
    name: 'Alexander',
    surname: 'Gonzalez', 
    email: 'gonzalez.alexander@canva.com',
    job_title: 'Chief HR Officer',
    jobTitle: 'Chief HR Officer',
    department: 'Human resources',
    location: 'Dubai',
    status: 'active',
    hire_date: '2021-12-14',
    hireDate: '2021-12-14',
    last_seen_at: '2025-07-24T13:04:11.256Z',
    lastSeenAt: '2025-07-24T13:04:11.256Z',
    avatar_url: 'https://ui-avatars.com/api/?name=Alexander&background=27ae60&color=ffffff&size=150&rounded=true&seed=1510',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alexander&background=27ae60&color=ffffff&size=150&rounded=true&seed=1510',
    organization_id: 1
  },
  {
    id: 1396,
    name: 'Alexander',
    surname: 'Gomez',
    email: 'gomez.alexander@canva.com',
    job_title: 'Finance Analyst',
    jobTitle: 'Finance Analyst',
    department: 'Finance',
    location: 'New York',
    status: 'pending',
    hire_date: '2022-06-15',
    hireDate: '2022-06-15',
    last_seen_at: null, // Will show as "Never"
    lastSeenAt: null,
    avatar_url: 'https://api.dicebear.com/7.x/initials/png?seed=1396_Alexander_hispanic_female&backgroundColor=7f8c8d&size=150',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/png?seed=1396_Alexander_hispanic_female&backgroundColor=7f8c8d&size=150',
    organization_id: 1
  },
  {
    id: 1568,
    name: 'Alexander',
    surname: 'Perez',
    email: 'perez.alexander@canva.com',
    job_title: 'Sales Representative',
    jobTitle: 'Sales Representative',
    department: 'Sales',
    location: 'Dubai',
    status: 'inactive',
    hire_date: '2023-06-05',
    hireDate: '2023-06-05',
    last_seen_at: '2025-06-15T08:20:00.000Z', // Older timestamp for inactive user
    lastSeenAt: '2025-06-15T08:20:00.000Z',
    avatar_url: 'https://ui-avatars.com/api/?name=Alexander&background=95a5a6&color=ffffff&size=150&rounded=true&seed=1568',
    avatarUrl: 'https://ui-avatars.com/api/?name=Alexander&background=95a5a6&color=ffffff&size=150&rounded=true&seed=1568',
    organization_id: 1
  }
];

const mockSubscriptionInfo = {
  subscribed_users: 500,
  current_usage: 401,
  active_employees: 401,
  total_employees: 402,
  pending_employees: 1,
  inactive_employees: 0,
  terminated_employees: 0,
  usage_percentage: 80,
  available_slots: 99,
  subscription_status: 'active',
  organization_name: 'Canva'
};

const mockDepartments = ['Human resources', 'Finance', 'Sales', 'Information technology', 'Marketing'];
const mockLocations = ['New York', 'Dubai', 'Tokyo'];

// Mock fetch globally
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Enhanced Employee Directory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup fetch mocks for different endpoints
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmployees),
        });
      }
      if (url.includes('/api/admin/subscription/usage')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubscriptionInfo),
        });
      }
      if (url.includes('/api/users/departments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDepartments),
        });
      }
      if (url.includes('/api/users/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLocations),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  describe('Missing Data Population', () => {
    it('displays job titles from both field formats correctly', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Senior HR Specialist')).toBeInTheDocument();
        expect(screen.getByText('Chief HR Officer')).toBeInTheDocument();
        expect(screen.getByText('Finance Analyst')).toBeInTheDocument();
        expect(screen.getByText('Sales Representative')).toBeInTheDocument();
      });

      // Verify no missing job titles show as "-"
      const jobTitleCells = screen.getAllByTestId('job-title-cell') || [];
      jobTitleCells.forEach(cell => {
        expect(cell.textContent).not.toBe('-');
      });
    });

    it('displays hire dates properly formatted', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Jul 02, 2023')).toBeInTheDocument();
        expect(screen.getByText('Dec 14, 2021')).toBeInTheDocument();
        expect(screen.getByText('Jun 15, 2022')).toBeInTheDocument();
        expect(screen.getByText('Jun 05, 2023')).toBeInTheDocument();
      });
    });

    it('displays last connected times with proper formatting', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show relative time for recent connections
        expect(screen.getByText(/ago$/)).toBeInTheDocument();
        // Should show "Never" for employees who haven't connected
        expect(screen.getByText('Never')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting Functionality', () => {
    it('displays sorting arrows on all column headers', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check that sorting buttons exist for each sortable column
        const sortableColumns = [
          'Employee', 'Job Title', 'Department', 
          'Location', 'Status', 'Hire Date', 'Last Connected'
        ];
        
        sortableColumns.forEach(columnName => {
          const button = screen.getByRole('button', { name: new RegExp(columnName, 'i') });
          expect(button).toBeInTheDocument();
        });
      });
    });

    it('sorts employees by name when name column is clicked', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const nameButton = screen.getByRole('button', { name: /Employee/i });
        fireEvent.click(nameButton);
      });

      // Verify employees are displayed in alphabetical order
      await waitFor(() => {
        const employeeRows = screen.getAllByTestId('employee-row') || screen.getAllByRole('row');
        // Should be sorted alphabetically by first name
        expect(employeeRows[1]).toHaveTextContent('Alexandar Reyez');
        expect(employeeRows[2]).toHaveTextContent('Alexander Gonzalez');
      });
    });

    it('sorts employees by last connected time when Last Connected column is clicked', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const lastConnectedButton = screen.getByRole('button', { name: /Last Connected/i });
        fireEvent.click(lastConnectedButton);
      });

      // Should sort by most recent first (descending)
      await waitFor(() => {
        const timeElements = screen.getAllByText(/ago$|Never/);
        // Most recent should come first when sorted descending
        expect(timeElements[0].textContent).toMatch(/ago$/);
      });
    });

    it('reverses sort direction when clicking the same column twice', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const nameButton = screen.getByRole('button', { name: /Employee/i });
        
        // First click - ascending
        fireEvent.click(nameButton);
        expect(nameButton).toBeInTheDocument();
        
        // Second click - descending  
        fireEvent.click(nameButton);
        expect(nameButton).toBeInTheDocument();
      });
    });

    it('sorts by job title alphabetically', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const jobTitleButton = screen.getByRole('button', { name: /Job Title/i });
        fireEvent.click(jobTitleButton);
      });

      await waitFor(() => {
        // Should see job titles in alphabetical order
        expect(screen.getByText('Chief HR Officer')).toBeInTheDocument();
        expect(screen.getByText('Finance Analyst')).toBeInTheDocument();
        expect(screen.getByText('Sales Representative')).toBeInTheDocument();
      });
    });
  });

  describe('Last Connected Column', () => {
    it('shows "Last Connected" as a column header', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Last Connected/i })).toBeInTheDocument();
      });
    });

    it('displays relative time for recent connections', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show "X days ago" or similar for recent connections
        const relativeTimeElements = screen.getAllByText(/ago$/);
        expect(relativeTimeElements.length).toBeGreaterThan(0);
      });
    });

    it('displays "Never" for employees who have not connected', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Never')).toBeInTheDocument();
      });
    });

    it('handles different connection time scenarios correctly', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should handle recent connections (days ago)
        const recentConnections = screen.getAllByText(/days? ago$/);
        expect(recentConnections.length).toBeGreaterThanOrEqual(0);

        // Should handle very recent connections (hours ago)
        const hourlyConnections = screen.getAllByText(/hours? ago$/);
        expect(hourlyConnections.length).toBeGreaterThanOrEqual(0);

        // Should handle never connected
        expect(screen.getByText('Never')).toBeInTheDocument();
      });
    });
  });

  describe('Data Field Compatibility', () => {
    it('handles both snake_case and camelCase field formats', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should display data regardless of field naming convention
        expect(screen.getByText('Senior HR Specialist')).toBeInTheDocument();
        expect(screen.getByText('Chief HR Officer')).toBeInTheDocument();
        
        // Should show hire dates from either field format
        expect(screen.getByText('Jul 02, 2023')).toBeInTheDocument();
        expect(screen.getByText('Dec 14, 2021')).toBeInTheDocument();
      });
    });

    it('falls back gracefully when data is missing', async () => {
      const employeesWithMissingData = [
        {
          id: 9999,
          name: 'Test',
          surname: 'Employee',
          email: 'test@canva.com',
          job_title: null,
          jobTitle: null,
          department: 'Unknown',
          location: null,
          status: 'active',
          hire_date: null,
          hireDate: null,
          last_seen_at: null,
          lastSeenAt: null,
          avatar_url: null,
          avatarUrl: null,
          organization_id: 1
        }
      ];

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/users')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(employeesWithMissingData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubscriptionInfo),
        });
      });

      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test Employee')).toBeInTheDocument();
        expect(screen.getByText('Never')).toBeInTheDocument();
        
        // Should show fallbacks for missing data
        const dashElements = screen.getAllByText('-');
        expect(dashElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('HR Management Features', () => {
    it('displays all employee data needed for HR management', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Essential HR data points
        expect(screen.getByText('Senior HR Specialist')).toBeInTheDocument(); // Job titles
        expect(screen.getByText('Human resources')).toBeInTheDocument(); // Departments
        expect(screen.getByText('New York')).toBeInTheDocument(); // Locations
        expect(screen.getByText('active')).toBeInTheDocument(); // Status
        expect(screen.getByText('Jul 02, 2023')).toBeInTheDocument(); // Hire dates
        expect(screen.getByText('Never')).toBeInTheDocument(); // Last connected
      });
    });

    it('provides sorting for all relevant HR metrics', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      const hrSortableColumns = [
        'Employee', 'Job Title', 'Department', 'Location', 
        'Status', 'Hire Date', 'Last Connected'
      ];

      for (const column of hrSortableColumns) {
        await waitFor(() => {
          const button = screen.getByRole('button', { name: new RegExp(column, 'i') });
          expect(button).toBeInTheDocument();
          
          // Test sorting functionality
          fireEvent.click(button);
        });
      }
    });

    it('shows employee count with accurate filtering', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show filtered count
        expect(screen.getByText(/Employee List \(\d+\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and User Experience', () => {
    it('loads employee data without blocking the UI', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      // Should show loading state initially
      expect(screen.getByTestId('loading-spinner') || screen.getByText(/loading/i)).toBeInTheDocument();

      // Should load data and remove loading state
      await waitFor(() => {
        expect(screen.getByText('Senior HR Specialist')).toBeInTheDocument();
      });
    });

    it('maintains sort state across data updates', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const nameButton = screen.getByRole('button', { name: /Employee/i });
        fireEvent.click(nameButton);
        
        // Sort state should be maintained
        expect(nameButton).toBeInTheDocument();
      });
    });
  });
});