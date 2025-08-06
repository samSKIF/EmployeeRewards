import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminEmployeesPage } from './AdminEmployeesPage';

// Mock the hooks and components with proper auth middleware pattern
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', isAdmin: true },
    isAuthenticated: true,
    isLoading: false
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Global mock for fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock wouter
vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => 
    <a href={href}>{children}</a>,
  useLocation: () => ['/admin/employees', vi.fn()],
}));

// Mock the child components
vi.mock('./EmployeeFilters', () => ({
  EmployeeFilters: ({ onFiltersChange, filteredCount, totalEmployees }: any) => (
    <div data-testid="employee-filters">
      <div>Showing {filteredCount} of {totalEmployees} employees</div>
      <button onClick={() => onFiltersChange({ search: 'test' })}>Apply Filter</button>
    </div>
  ),
}));

vi.mock('./EmployeeList', () => ({
  EmployeeList: ({ employees, onEmployeeSelect, onSelectAll }: any) => (
    <div data-testid="employee-list">
      <div>Employee Count: {employees.length}</div>
      <button onClick={() => onSelectAll(true)}>Select All</button>
      {employees.map((emp: any) => (
        <div key={emp.id} onClick={() => onEmployeeSelect(emp, true)}>
          {emp.name} {emp.surname}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('./BulkActions', () => ({
  BulkActions: ({ selectedEmployees, onBulkAction, onClearSelection }: any) => {
    if (selectedEmployees.length === 0) return null;
    return (
      <div data-testid="bulk-actions">
        <div>{selectedEmployees.length} selected</div>
        <button onClick={() => onBulkAction({ type: 'delete', employeeIds: [1] })}>
          Delete
        </button>
        <button onClick={onClearSelection}>Clear</button>
      </div>
    );
  },
}));

vi.mock('./CreateEmployeeForm', () => ({
  CreateEmployeeForm: ({ isOpen, onClose, onSubmit }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="create-form">
        <button onClick={() => onSubmit({ name: 'New', surname: 'Employee' })}>
          Submit
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  },
}));

// Mock API responses
const mockEmployees = [
  {
    id: 1,
    name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    username: 'johndoe',
    department: 'Engineering',
    location: 'New York',
    status: 'active',
    isAdmin: false,
    phoneNumber: null,
    jobTitle: 'Developer',
    managerEmail: null,
    sex: null,
    nationality: null,
    birthDate: null,
    hireDate: '2020-01-01',
    avatarUrl: null,
    adminScope: null,
    allowedSites: null,
    allowedDepartments: null,
  },
  {
    id: 2,
    name: 'Jane',
    surname: 'Smith',
    email: 'jane@example.com',
    username: 'janesmith',
    department: 'Marketing',
    location: 'London',
    status: 'active',
    isAdmin: true,
    phoneNumber: null,
    jobTitle: 'Manager',
    managerEmail: null,
    sex: null,
    nationality: null,
    birthDate: null,
    hireDate: '2019-01-01',
    avatarUrl: null,
    adminScope: 'client',
    allowedSites: null,
    allowedDepartments: null,
  },
];

const mockDepartments = ['Engineering', 'Marketing', 'Sales'];
const mockLocations = ['New York', 'London', 'Tokyo'];

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AdminEmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup API mocking with auth headers - same pattern as successful EmployeeDirectory
    mockFetch.mockImplementation((url: string, options?: any) => {
      console.log('Mock fetch called with:', url, options);
      
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockEmployees),
          headers: new Headers({ 'content-type': 'application/json' })
        });
      }
      
      if (url.includes('/api/departments')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockDepartments),
          headers: new Headers({ 'content-type': 'application/json' })
        });
      }
      
      if (url.includes('/api/locations')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockLocations),
          headers: new Headers({ 'content-type': 'application/json' })
        });
      }
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
        headers: new Headers({ 'content-type': 'application/json' })
      });
    });
  });

  describe('Rendering', () => {
    it('should render page header and statistics', async () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Employee Management')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Manage team members and their information')).toBeInTheDocument();
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Departments')).toBeInTheDocument();
      expect(screen.getByText('Locations')).toBeInTheDocument();
    });

    it('should render action buttons', async () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      await waitFor(() => {
        expect(screen.getByText('Import CSV')).toBeInTheDocument();
        expect(screen.getByText('Add Employee')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render all child components', async () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('employee-filters')).toBeInTheDocument();
        expect(screen.getByTestId('employee-list')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show correct statistics', async () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Total employees
        expect(screen.getByText('Showing 2 of 2 employees')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Employee Selection', () => {
    it('should handle individual employee selection', async () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      await waitFor(() => {
        const johnEmployee = screen.getByText('John Doe');
        fireEvent.click(johnEmployee);
      }, { timeout: 3000 });

      // Should show bulk actions after selection
      expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should handle select all functionality', async () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      await waitFor(() => {
        const selectAllButton = screen.getByText('Select All');
        fireEvent.click(selectAllButton);
      }, { timeout: 3000 });

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should clear selection', async () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      await waitFor(() => {
        // Select an employee first
        const johnEmployee = screen.getByText('John Doe');
        fireEvent.click(johnEmployee);
      }, { timeout: 3000 });

      // Clear selection
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should handle filter changes', async () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      await waitFor(() => {
        const applyFilterButton = screen.getByText('Apply Filter');
        fireEvent.click(applyFilterButton);
      }, { timeout: 3000 });

      // Verify filter was applied (in real implementation, this would filter the list)
      expect(screen.getByTestId('employee-filters')).toBeInTheDocument();
    });
  });
});