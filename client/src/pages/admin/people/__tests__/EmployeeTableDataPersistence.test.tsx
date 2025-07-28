import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeeDirectory from '../EmployeeDirectory';
import React from 'react';

// Test data scenarios to validate data persistence
const completeEmployeeData = {
  id: 1,
  name: 'John',
  surname: 'Smith',
  email: 'john.smith@canva.com',
  job_title: 'Senior Developer',
  jobTitle: 'Senior Developer',
  department: 'Information technology',
  location: 'New York',
  status: 'active',
  hire_date: '2023-01-15',
  hireDate: '2023-01-15',
  last_seen_at: '2025-07-27T14:30:00.000Z',
  lastSeenAt: '2025-07-27T14:30:00.000Z',
  avatar_url: 'https://example.com/avatar.jpg',
  avatarUrl: 'https://example.com/avatar.jpg',
  organization_id: 1
};

const snakeCaseOnlyData = {
  id: 2,
  name: 'Jane',
  surname: 'Doe',
  email: 'jane.doe@canva.com',
  job_title: 'HR Manager',
  department: 'Human resources',
  location: 'Dubai',
  status: 'active',
  hire_date: '2022-06-10',
  last_seen_at: '2025-07-25T09:15:00.000Z',
  avatar_url: 'https://example.com/avatar2.jpg',
  organization_id: 1
};

const camelCaseOnlyData = {
  id: 3,
  name: 'Mike',
  surname: 'Johnson',
  email: 'mike.johnson@canva.com',
  jobTitle: 'Sales Manager',
  department: 'Sales',
  location: 'Tokyo',
  status: 'active',
  hireDate: '2021-03-20',
  lastSeenAt: '2025-07-26T16:45:00.000Z',
  avatarUrl: 'https://example.com/avatar3.jpg',
  organization_id: 1
};

const missingDataEmployee = {
  id: 4,
  name: 'Sarah',
  surname: 'Wilson',
  email: 'sarah.wilson@canva.com',
  job_title: null,
  jobTitle: null,
  department: 'Marketing',
  location: null,
  status: 'pending',
  hire_date: null,
  hireDate: null,
  last_seen_at: null,
  lastSeenAt: null,
  avatar_url: null,
  avatarUrl: null,
  organization_id: 1
};

const emptyStringDataEmployee = {
  id: 5,
  name: 'Tom',
  surname: 'Brown',
  email: 'tom.brown@canva.com',
  job_title: '',
  jobTitle: '',
  department: 'Finance',
  location: '',
  status: 'inactive',
  hire_date: '',
  hireDate: '',
  last_seen_at: '',
  lastSeenAt: '',
  avatar_url: '',
  avatarUrl: '',
  organization_id: 1
};

const undefinedDataEmployee = {
  id: 6,
  name: 'Lisa',
  surname: 'Garcia',
  email: 'lisa.garcia@canva.com',
  job_title: undefined,
  jobTitle: undefined,
  department: 'Administration',
  location: undefined,
  status: 'active',
  hire_date: undefined,
  hireDate: undefined,
  last_seen_at: undefined,
  lastSeenAt: undefined,
  avatar_url: undefined,
  avatarUrl: undefined,
  organization_id: 1
};

const mockSubscriptionInfo = {
  subscribed_users: 500,
  current_usage: 6,
  active_employees: 4,
  total_employees: 6
};

const mockDepartments = ['Information technology', 'Human resources', 'Sales', 'Marketing', 'Finance', 'Administration'];
const mockLocations = ['New York', 'Dubai', 'Tokyo'];

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

describe('Employee Table Data Persistence Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            completeEmployeeData,
            snakeCaseOnlyData,
            camelCaseOnlyData,
            missingDataEmployee,
            emptyStringDataEmployee,
            undefinedDataEmployee
          ]),
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

  describe('Complete Data Display', () => {
    it('always displays employee names even when other fields are missing', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // All employee names should always be visible
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
        expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
        expect(screen.getByText('Tom Brown')).toBeInTheDocument();
        expect(screen.getByText('Lisa Garcia')).toBeInTheDocument();
      });
    });

    it('always displays email addresses for all employees', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('john.smith@canva.com')).toBeInTheDocument();
        expect(screen.getByText('jane.doe@canva.com')).toBeInTheDocument();
        expect(screen.getByText('mike.johnson@canva.com')).toBeInTheDocument();
        expect(screen.getByText('sarah.wilson@canva.com')).toBeInTheDocument();
        expect(screen.getByText('tom.brown@canva.com')).toBeInTheDocument();
        expect(screen.getByText('lisa.garcia@canva.com')).toBeInTheDocument();
      });
    });

    it('always displays departments for all employees', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Information technology')).toBeInTheDocument();
        expect(screen.getByText('Human resources')).toBeInTheDocument();
        expect(screen.getByText('Sales')).toBeInTheDocument();
        expect(screen.getByText('Marketing')).toBeInTheDocument();
        expect(screen.getByText('Finance')).toBeInTheDocument();
        expect(screen.getByText('Administration')).toBeInTheDocument();
      });
    });

    it('always displays status badges for all employees', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const statusBadges = screen.getAllByText(/^(active|pending|inactive)$/);
        expect(statusBadges).toHaveLength(6); // All 6 employees should have status badges
        
        // Check specific statuses
        expect(screen.getAllByText('active')).toHaveLength(4);
        expect(screen.getByText('pending')).toBeInTheDocument();
        expect(screen.getByText('inactive')).toBeInTheDocument();
      });
    });
  });

  describe('Job Title Field Persistence', () => {
    it('displays job titles from snake_case field when available', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('HR Manager')).toBeInTheDocument();
      });
    });

    it('displays job titles from camelCase field when available', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sales Manager')).toBeInTheDocument();
      });
    });

    it('displays job titles from either field format when both exist', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      });
    });

    it('shows dash (-) for missing job titles consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const tableCells = screen.getAllByRole('cell');
        const jobTitleCells = tableCells.filter(cell => 
          cell.textContent === '-' && 
          cell.previousElementSibling?.textContent?.includes('@canva.com')
        );
        
        // Should have dashes for employees with missing job titles
        expect(jobTitleCells.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Hire Date Field Persistence', () => {
    it('displays formatted hire dates from snake_case field', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Jun 10, 2022')).toBeInTheDocument();
      });
    });

    it('displays formatted hire dates from camelCase field', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Mar 20, 2021')).toBeInTheDocument();
      });
    });

    it('displays formatted hire dates from either field when both exist', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument();
      });
    });

    it('shows dash (-) for missing hire dates consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const hireDateCells = screen.getAllByRole('cell');
        const dashCells = hireDateCells.filter(cell => cell.textContent === '-');
        
        // Should have at least 3 dashes for missing hire dates
        expect(dashCells.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Last Connected Field Persistence', () => {
    it('displays relative time for recent connections from snake_case field', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const relativeTimeElements = screen.getAllByText(/ago$/);
        expect(relativeTimeElements.length).toBeGreaterThan(0);
      });
    });

    it('displays relative time for connections from camelCase field', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const relativeTimeElements = screen.getAllByText(/ago$/);
        expect(relativeTimeElements.length).toBeGreaterThan(0);
      });
    });

    it('shows "Never" for employees who have never connected consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const neverElements = screen.getAllByText('Never');
        // Should have "Never" for employees with null/undefined/empty last_seen_at
        expect(neverElements.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('handles various null/undefined/empty scenarios for last connection', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Test that all last connection scenarios are handled
        const lastConnectedCells = screen.getAllByRole('cell');
        const connectionCells = lastConnectedCells.filter(cell => 
          cell.textContent === 'Never' || cell.textContent?.includes('ago')
        );
        
        // Should have 6 cells for last connected data (one per employee)
        expect(connectionCells.length).toBe(6);
      });
    });
  });

  describe('Location Field Persistence', () => {
    it('displays locations when available', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('New York')).toBeInTheDocument();
        expect(screen.getByText('Dubai')).toBeInTheDocument();
        expect(screen.getByText('Tokyo')).toBeInTheDocument();
      });
    });

    it('shows dash (-) for missing locations consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const locationCells = screen.getAllByRole('cell');
        const dashLocationCells = locationCells.filter(cell => 
          cell.textContent === '-' &&
          cell.parentElement?.querySelector('td:nth-child(4)')?.textContent === cell.textContent
        );
        
        // Should have dashes for missing locations
        expect(dashLocationCells.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Avatar Field Persistence', () => {
    it('handles missing avatar URLs gracefully', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should render avatar fallbacks for all employees
        const avatarFallbacks = screen.getAllByText(/^[A-Z]{1,2}$/);
        expect(avatarFallbacks.length).toBe(6); // All employees should have avatar fallbacks
      });
    });

    it('uses either snake_case or camelCase avatar URL when available', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check that avatar images are rendered (even if they fail to load, the img tags should exist)
        const avatarImages = screen.getAllByRole('img');
        expect(avatarImages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Normalization Function Tests', () => {
    it('normalizes employee data correctly for all field formats', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Verify that normalization works by checking that all expected data appears
        // This tests the normalizeEmployee function indirectly
        
        // Job titles should appear from both formats
        expect(screen.getByText('Senior Developer')).toBeInTheDocument(); // Both formats
        expect(screen.getByText('HR Manager')).toBeInTheDocument(); // snake_case only
        expect(screen.getByText('Sales Manager')).toBeInTheDocument(); // camelCase only
        
        // Hire dates should appear from both formats
        expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument(); // Both formats
        expect(screen.getByText('Jun 10, 2022')).toBeInTheDocument(); // snake_case only
        expect(screen.getByText('Mar 20, 2021')).toBeInTheDocument(); // camelCase only
      });
    });
  });

  describe('Sorting Persistence with Data Variations', () => {
    it('sorts correctly even with missing data in sort fields', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const nameButton = screen.getByRole('button', { name: /Employee/i });
        fireEvent.click(nameButton);
      });

      await waitFor(() => {
        // Should sort all employees by name regardless of missing other fields
        const employeeRows = screen.getAllByRole('row');
        expect(employeeRows.length).toBeGreaterThan(6); // Header + 6 employee rows
      });
    });

    it('sorts by job title handling missing values consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const jobTitleButton = screen.getByRole('button', { name: /Job Title/i });
        fireEvent.click(jobTitleButton);
      });

      await waitFor(() => {
        // Should handle sorting with missing job titles
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        
        // Verify that employees with and without job titles are both displayed
        expect(screen.getByText('Senior Developer')).toBeInTheDocument();
        expect(screen.getAllByText('-').length).toBeGreaterThan(0);
      });
    });

    it('sorts by hire date handling missing values consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const hireDateButton = screen.getByRole('button', { name: /Hire Date/i });
        fireEvent.click(hireDateButton);
      });

      await waitFor(() => {
        // Should handle sorting with missing hire dates
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        
        // Verify that employees with and without hire dates are both displayed
        expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument();
        expect(screen.getAllByText('-').length).toBeGreaterThan(0);
      });
    });

    it('sorts by last connected handling "Never" values consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const lastConnectedButton = screen.getByRole('button', { name: /Last Connected/i });
        fireEvent.click(lastConnectedButton);
      });

      await waitFor(() => {
        // Should handle sorting with "Never" and relative time values
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        
        // Verify both "Never" and time ago values are displayed
        expect(screen.getAllByText('Never').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/ago$/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filter Persistence with Data Variations', () => {
    it('filters employees correctly regardless of data completeness', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search employees...');
        fireEvent.change(searchInput, { target: { value: 'John' } });
      });

      await waitFor(() => {
        // Should find John Smith even with complete data
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
        
        // Should not show other employees
        expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
      });
    });

    it('department filter works with all employees regardless of missing fields', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const departmentSelect = screen.getByDisplayValue('All Departments') || 
                                 screen.getAllByRole('combobox')[1];
        fireEvent.click(departmentSelect);
      });

      await waitFor(() => {
        const marketingOption = screen.getByText('Marketing');
        fireEvent.click(marketingOption);
      });

      await waitFor(() => {
        // Should show Sarah Wilson from Marketing department even with missing job title
        expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
        expect(screen.getByText('Marketing')).toBeInTheDocument();
        
        // Should not show employees from other departments
        expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
      });
    });

    it('status filter works with all status types', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const statusSelect = screen.getAllByRole('combobox')[2];
        fireEvent.click(statusSelect);
      });

      await waitFor(() => {
        const pendingOption = screen.getByText('Pending');
        fireEvent.click(pendingOption);
      });

      await waitFor(() => {
        // Should show only pending employees
        expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
        
        // Should not show active/inactive employees
        expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
      });
    });
  });

  describe('Table Structure Integrity', () => {
    it('always renders complete table structure with all columns', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Verify all column headers are present
        expect(screen.getByRole('button', { name: /Employee/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Job Title/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Department/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Location/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Status/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Hire Date/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Last Connected/i })).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('always renders exactly 6 employee rows regardless of data completeness', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const rows = table.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(6); // Should have exactly 6 employee rows
      });
    });

    it('ensures each employee row has all required cells', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        employeeRows.forEach((row) => {
          const cells = row.querySelectorAll('td');
          expect(cells).toHaveLength(8); // 8 columns: Employee, Job Title, Department, Location, Status, Hire Date, Last Connected, Actions
        });
      });
    });
  });
});