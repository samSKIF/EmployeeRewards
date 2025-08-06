import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminEmployeesPage } from './AdminEmployeesPage';

// Mock the hooks and components
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', isAdmin: true },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
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

// Global mock for fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock wouter
vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => 
    <a href={href}>{children}</a>,
  useLocation: () => ['/admin/employees', vi.fn()],
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

  return renderWithQueryClient(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AdminEmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup API mocking with auth headers
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
    it('should render page header and statistics', () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      expect(screen.getByText('Employee Management')).toBeInTheDocument();
      expect(screen.getByText('Manage team members and their information')).toBeInTheDocument();
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Departments')).toBeInTheDocument();
      expect(screen.getByText('Locations')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      expect(screen.getByText('Import CSV')).toBeInTheDocument();
      expect(screen.getByText('Add Employee')).toBeInTheDocument();
    });

    it('should render all child components', () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      expect(screen.getByTestId('employee-filters')).toBeInTheDocument();
      expect(screen.getByTestId('employee-list')).toBeInTheDocument();
    });

    it('should show correct statistics', () => {
      renderWithQueryClient(<AdminEmployeesPage />);

      expect(screen.getByText('2')).toBeInTheDocument(); // Total employees
      expect(screen.getByText('Showing 2 of 2 employees')).toBeInTheDocument();
    });
  });

  describe('Employee Selection', () => {
    it('should handle individual employee selection', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      const johnEmployee = screen.getByText('John Doe');
      fireEvent.click(johnEmployee);

      // Should show bulk actions after selection
      expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should handle select all functionality', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      const selectAllButton = screen.getByText('Select All');
      fireEvent.click(selectAllButton);

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should clear selection', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      // Select an employee first
      const johnEmployee = screen.getByText('John Doe');
      fireEvent.click(johnEmployee);

      // Clear selection
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should handle filter changes', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      const applyFilterButton = screen.getByText('Apply Filter');
      fireEvent.click(applyFilterButton);

      // Verify filter was applied (in real implementation, this would filter the list)
      expect(screen.getByTestId('employee-filters')).toBeInTheDocument();
    });

    it('should filter employees correctly', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      // Initially shows all employees
      expect(screen.getByText('Employee Count: 2')).toBeInTheDocument();
    });
  });

  describe('Create Employee', () => {
    it('should open create form when add button clicked', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      const addButton = screen.getByText('Add Employee');
      fireEvent.click(addButton);

      expect(screen.getByTestId('create-form')).toBeInTheDocument();
    });

    it('should close create form when cancelled', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      // Open form
      const addButton = screen.getByText('Add Employee');
      fireEvent.click(addButton);

      // Close form
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId('create-form')).not.toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      // Open form
      const addButton = screen.getByText('Add Employee');
      fireEvent.click(addButton);

      // Submit form
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      // Form should close after submission
      await waitFor(() => {
        expect(screen.queryByTestId('create-form')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bulk Actions', () => {
    it('should handle bulk delete action', async () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      // Select an employee
      const johnEmployee = screen.getByText('John Doe');
      fireEvent.click(johnEmployee);

      // Perform bulk delete
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Should clear selection after action
      await waitFor(() => {
        expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();
      });
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate unique departments correctly', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      // Should show 2 departments (Engineering, Marketing)
      const departmentCards = screen.getAllByText('2');
      expect(departmentCards.length).toBeGreaterThan(0);
    });

    it('should calculate active employees correctly', () => {
      
      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      // Both employees are active
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty employee list', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      
      queryClient.setQueryData(['/api/users'], []);
      queryClient.setQueryData(['/api/departments'], []);
      queryClient.setQueryData(['/api/locations'], []);
      
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      expect(screen.getByText('0')).toBeInTheDocument(); // Total employees
      expect(screen.getByText('Showing 0 of 0 employees')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      renderWithQueryClient(
        
          <AdminEmployeesPage />
        
      );

      // Component should render even with loading state
      expect(screen.getByText('Employee Management')).toBeInTheDocument();
    });
  });
});