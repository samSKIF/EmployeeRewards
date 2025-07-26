import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EmployeeBulkActions from '../EmployeeBulkActions';

// Mock wouter
vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => 
    <a href={href}>{children}</a>,
}));

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockEmployees = [
  {
    id: 1,
    name: 'John',
    surname: 'Doe',
    email: 'john.doe@company.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    status: 'active',
    location: 'New York',
    avatarUrl: 'https://example.com/avatar1.jpg',
  },
  {
    id: 2,
    name: 'Jane',
    surname: 'Smith',
    email: 'jane.smith@company.com',
    jobTitle: 'Product Manager',
    department: 'Product',
    status: 'inactive',
    location: 'San Francisco',
  },
  {
    id: 3,
    name: 'Bob',
    surname: 'Johnson',
    email: 'bob.johnson@company.com',
    jobTitle: 'Designer',
    department: 'Design',
    status: 'terminated',
    location: 'Remote',
  },
];

const mockDepartments = ['Engineering', 'Product', 'Design', 'Marketing'];

// Mock fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and related functions for CSV export
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement for CSV download
const mockA = {
  href: '',
  download: '',
  click: vi.fn(),
};
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
  if (tag === 'a') return mockA as any;
  return {} as any;
});

function renderWithQueryClient(component: React.ReactElement) {
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
}

describe('EmployeeBulkActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/users/departments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDepartments),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmployees),
        });
      }
      if (url.includes('/api/admin/users/bulk-update') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders bulk actions header and summary', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    expect(screen.getByText('Bulk Employee Actions')).toBeInTheDocument();
    expect(screen.getByText('Perform actions on multiple employees at once')).toBeInTheDocument();
    expect(screen.getByText('Selection Summary')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('0 of 3 employees selected')).toBeInTheDocument();
    });
  });

  it('displays all bulk action buttons', () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    expect(screen.getByText('Activate Employees')).toBeInTheDocument();
    expect(screen.getByText('Deactivate Employees')).toBeInTheDocument();
    expect(screen.getByText('Terminate Employees')).toBeInTheDocument();
    expect(screen.getByText('Delete Employees')).toBeInTheDocument();
    expect(screen.getByText('Export Selected')).toBeInTheDocument();
  });

  it('disables action buttons when no employees selected', () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    const activateButton = screen.getByText('Activate Employees');
    const exportButton = screen.getByText('Export Selected');
    
    expect(activateButton).toBeDisabled();
    expect(exportButton).toBeDisabled();
  });

  it('renders employee list with checkboxes', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      
      // Check for checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(4); // 3 employees + 1 select all
    });
  });

  it('selects individual employees', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      // Click first employee checkbox (skip select all checkbox)
      fireEvent.click(checkboxes[1]);
    });
    
    await waitFor(() => {
      expect(screen.getByText('1 of 3 employees selected')).toBeInTheDocument();
      
      // Buttons should now be enabled
      const activateButton = screen.getByText('Activate Employees');
      expect(activateButton).toBeEnabled();
    });
  });

  it('selects all employees with header checkbox', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);
    });
    
    await waitFor(() => {
      expect(screen.getByText('3 of 3 employees selected')).toBeInTheDocument();
    });
  });

  it('deselects all employees when clicking select all again', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      // Select all
      fireEvent.click(selectAllCheckbox);
    });
    
    await waitFor(() => {
      expect(screen.getByText('3 of 3 employees selected')).toBeInTheDocument();
    });
    
    // Deselect all
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    await waitFor(() => {
      expect(screen.getByText('0 of 3 employees selected')).toBeInTheDocument();
    });
  });

  it('filters employees by search term', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search employees...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('filters employees by status', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
    
    // Filter by active status
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.click(statusSelect);
    const activeOption = screen.getByText('Active');
    fireEvent.click(activeOption);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  it('filters employees by department', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    // Filter by Engineering department
    const departmentSelect = screen.getByDisplayValue('All Departments');
    fireEvent.click(departmentSelect);
    const engineeringOption = screen.getByText('Engineering');
    fireEvent.click(engineeringOption);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('performs activate action successfully', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first employee
    });
    
    const activateButton = screen.getByText('Activate Employees');
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: '1 employees activated',
      });
    });
  });

  it('shows confirmation dialog for destructive actions', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first employee
    });
    
    const deleteButton = screen.getByText('Delete Employees');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(screen.getByText('Confirm Delete Employees')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });
  });

  it('cancels destructive action from confirmation dialog', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first employee
    });
    
    const deleteButton = screen.getByText('Delete Employees');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });
    
    // Should not call the API
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('bulk-update'),
      expect.any(Object)
    );
  });

  it('confirms and executes destructive action', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first employee
    });
    
    const deleteButton = screen.getByText('Delete Employees');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm Delete Employees');
      fireEvent.click(confirmButton);
    });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: '1 employees deleted',
      });
    });
  });

  it('exports selected employees as CSV', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first employee
      fireEvent.click(checkboxes[2]); // Select second employee
    });
    
    const exportButton = screen.getByText('Export Selected');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export Complete',
        description: '2 employee records exported',
      });
    });
    
    // Check CSV generation
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockA.click).toHaveBeenCalled();
    expect(mockA.download).toMatch(/employees_\d{4}-\d{2}-\d{2}\.csv/);
  });

  it('shows error when no employees selected for action', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      // Don't select any employees
      const activateButton = screen.getByText('Activate Employees');
      fireEvent.click(activateButton);
    });
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'No Selection',
      description: 'Please select at least one employee',
      variant: 'destructive',
    });
  });

  it('handles bulk action API errors', async () => {
    // Mock API error
    mockFetch.mockImplementationOnce((url: string, options?: any) => {
      if (options?.method === 'POST') {
        return Promise.reject(new Error('Server error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEmployees),
      });
    });
    
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first employee
    });
    
    const activateButton = screen.getByText('Activate Employees');
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Server error',
        variant: 'destructive',
      });
    });
  });

  it('displays status badges with correct colors', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const activeBadge = screen.getByText('active');
      const inactiveBadge = screen.getByText('inactive');
      const terminatedBadge = screen.getByText('terminated');
      
      expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800');
      expect(inactiveBadge).toHaveClass('bg-gray-100', 'text-gray-800');
      expect(terminatedBadge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  it('shows help section with action descriptions', () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    expect(screen.getByText('Bulk Actions Help')).toBeInTheDocument();
    expect(screen.getByText('Understanding the available bulk operations')).toBeInTheDocument();
    expect(screen.getByText('Set selected employees to active status')).toBeInTheDocument();
    expect(screen.getByText('⚠️ This action is permanent')).toBeInTheDocument();
  });

  it('updates employee count display correctly', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      expect(screen.getByText('Employee List (3)')).toBeInTheDocument();
    });
    
    // Filter to reduce count
    const searchInput = screen.getByPlaceholderText('Search employees...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    
    await waitFor(() => {
      expect(screen.getByText('Employee List (1)')).toBeInTheDocument();
    });
  });

  it('has back button with correct link', () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    const backButton = screen.getByText('Back to Directory');
    expect(backButton.closest('a')).toHaveAttribute('href', '/admin/people/employee-directory');
  });

  it('shows loading state initially', () => {
    // Mock loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));
    
    renderWithQueryClient(<EmployeeBulkActions />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('clears selection after successful bulk action', async () => {
    renderWithQueryClient(<EmployeeBulkActions />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first employee
    });
    
    await waitFor(() => {
      expect(screen.getByText('1 of 3 employees selected')).toBeInTheDocument();
    });
    
    const activateButton = screen.getByText('Activate Employees');
    fireEvent.click(activateButton);
    
    await waitFor(() => {
      expect(screen.getByText('0 of 3 employees selected')).toBeInTheDocument();
    });
  });
});