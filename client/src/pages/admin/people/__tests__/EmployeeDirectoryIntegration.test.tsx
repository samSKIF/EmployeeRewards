import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import EmployeeDirectory from '../EmployeeDirectory';
import * as api from '@/lib/api';

// Mock API calls for integration testing
jest.mock('@/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock authentication context
const mockAuthContext = {
  user: {
    id: 1,
    name: 'Admin User',
    email: 'admin@company.com',
    isAdmin: true,
    organization_id: 1,
    department: 'Administration'
  },
  isAuthenticated: true
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

// Mock toast notifications
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('Employee Directory Integration Tests - Frontend-Backend Data Flow', () => {
  let queryClient: QueryClient;

  const mockEmployeesResponse = {
    employees: [
      {
        id: 1,
        name: 'John',
        surname: 'Doe', 
        email: 'john.doe@company.com',
        department: 'Engineering',
        location: 'New York',
        job_title: 'Software Engineer',
        status: 'active',
        hire_date: '2023-01-15',
        last_seen_at: '2025-08-06T10:00:00Z',
        organization_id: 1,
        avatar_url: null,
        phone_number: '+1234567890'
      },
      {
        id: 2,
        name: 'Jane',
        surname: 'Smith',
        email: 'jane.smith@company.com', 
        department: 'Marketing',
        location: 'San Francisco',
        job_title: 'Marketing Manager',
        status: 'active',
        hire_date: '2022-06-01',
        last_seen_at: '2025-08-05T14:30:00Z',
        organization_id: 1,
        avatar_url: null,
        phone_number: '+0987654321'
      }
    ],
    pagination: {
      total: 402, // Critical: Consistent user count validation
      limit: 50,
      offset: 0,
      has_more: true,
      total_pages: 9
    },
    filters: {
      search: '',
      department: '',
      status: 'active',
      include_admin: false
    },
    meta: {
      organization_id: 1,
      retrieved_at: '2025-08-06T10:00:00Z',
      sort_config: { sort_by: 'name', sort_order: 'asc' }
    }
  };

  const mockDepartments = ['Engineering', 'Marketing', 'Sales', 'Product', 'Design'];
  const mockLocations = ['New York', 'San Francisco', 'Remote', 'Chicago', 'London'];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();

    // Mock API responses for successful data flow
    mockedApi.get = jest.fn().mockImplementation((endpoint) => {
      if (endpoint === '/api/admin/employees') {
        return Promise.resolve(mockEmployeesResponse);
      }
      if (endpoint === '/api/users/departments') {
        return Promise.resolve(mockDepartments);
      }
      if (endpoint === '/api/users/locations') {
        return Promise.resolve(mockLocations);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    mockedApi.post = jest.fn();
    mockedApi.patch = jest.fn();
    mockedApi.delete = jest.fn();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Data Loading and Display Integration', () => {
    it('should load and display employee data with correct user count validation', async () => {
      renderWithProviders(<EmployeeDirectory />);

      // Verify loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for data to load and verify display
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Critical: Verify user count consistency (402 users)
      await waitFor(() => {
        expect(screen.getByText(/402/)).toBeInTheDocument(); // Total count
      });

      // Verify employee details are displayed correctly
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();

      expect(screen.getByText('jane.smith@company.com')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
      expect(screen.getByText('Marketing Manager')).toBeInTheDocument();
      expect(screen.getByText('San Francisco')).toBeInTheDocument();

      // Verify API was called with correct parameters
      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
        params: expect.objectContaining({
          limit: 50,
          offset: 0,
          sortBy: 'name',
          sortOrder: 'asc'
        })
      });
    });

    it('should maintain user count consistency across filter operations', async () => {
      renderWithProviders(<EmployeeDirectory />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Apply department filter
      const departmentFilter = screen.getByLabelText(/department/i);
      fireEvent.change(departmentFilter, { target: { value: 'Engineering' } });

      // Mock filtered response maintaining total count
      const filteredResponse = {
        ...mockEmployeesResponse,
        employees: [mockEmployeesResponse.employees[0]], // Only engineering employee
        pagination: {
          ...mockEmployeesResponse.pagination,
          total: 402 // Total count remains consistent
        },
        filters: {
          ...mockEmployeesResponse.filters,
          department: 'Engineering'
        }
      };

      mockedApi.get = jest.fn().mockResolvedValue(filteredResponse);

      // Trigger filter application
      const applyButton = screen.getByText(/apply filters/i);
      fireEvent.click(applyButton);

      await waitFor(() => {
        // Verify filtered results
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        
        // Critical: Total count should remain 402 even with filters
        expect(screen.getByText(/402/)).toBeInTheDocument();
      });

      // Verify API called with filter parameters
      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
        params: expect.objectContaining({
          department: 'Engineering'
        })
      });
    });
  });

  describe('Employee Creation Integration Flow', () => {
    it('should handle complete employee creation workflow with user count update', async () => {
      renderWithProviders(<EmployeeDirectory />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click add employee button
      const addButton = screen.getByText(/add employee/i);
      fireEvent.click(addButton);

      // Verify modal opens
      await waitFor(() => {
        expect(screen.getByText(/create employee/i)).toBeInTheDocument();
      });

      // Fill in employee form
      const nameInput = screen.getByLabelText(/first name/i);
      const surnameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const departmentSelect = screen.getByLabelText(/department/i);

      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      fireEvent.change(surnameInput, { target: { value: 'Johnson' } });
      fireEvent.change(emailInput, { target: { value: 'alice.johnson@company.com' } });
      fireEvent.change(departmentSelect, { target: { value: 'Product' } });

      // Mock successful creation response
      const newEmployee = {
        id: 3,
        name: 'Alice',
        surname: 'Johnson',
        email: 'alice.johnson@company.com',
        department: 'Product',
        location: 'Remote',
        job_title: 'Product Manager',
        status: 'pending',
        organization_id: 1,
        created_at: new Date().toISOString()
      };

      mockedApi.post = jest.fn().mockResolvedValue({
        employee: newEmployee,
        message: 'Employee created successfully'
      });

      // Mock updated employee list with new count
      const updatedResponse = {
        ...mockEmployeesResponse,
        employees: [...mockEmployeesResponse.employees, newEmployee],
        pagination: {
          ...mockEmployeesResponse.pagination,
          total: 403 // Updated count after creation
        }
      };

      mockedApi.get = jest.fn().mockResolvedValue(updatedResponse);

      // Submit form
      const submitButton = screen.getByText(/create employee/i);
      fireEvent.click(submitButton);

      // Verify creation API call
      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/api/admin/employees', {
          name: 'Alice',
          surname: 'Johnson',
          email: 'alice.johnson@company.com',
          department: 'Product'
        });
      });

      // Verify list refresh and updated count
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText(/403/)).toBeInTheDocument(); // Updated total
      });
    });
  });

  describe('Employee Update Integration Flow', () => {
    it('should handle employee update workflow maintaining data consistency', async () => {
      renderWithProviders(<EmployeeDirectory />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click edit button for first employee
      const employeeRow = screen.getByText('John Doe').closest('[data-testid="employee-row"]');
      const editButton = within(employeeRow!).getByLabelText(/edit/i);
      fireEvent.click(editButton);

      // Verify edit modal opens
      await waitFor(() => {
        expect(screen.getByText(/edit employee/i)).toBeInTheDocument();
      });

      // Update job title
      const jobTitleInput = screen.getByLabelText(/job title/i);
      fireEvent.change(jobTitleInput, { target: { value: 'Senior Software Engineer' } });

      // Mock successful update response
      const updatedEmployee = {
        ...mockEmployeesResponse.employees[0],
        job_title: 'Senior Software Engineer',
        updated_at: new Date().toISOString()
      };

      mockedApi.patch = jest.fn().mockResolvedValue({
        employee: updatedEmployee,
        message: 'Employee updated successfully'
      });

      // Mock updated list response
      const updatedListResponse = {
        ...mockEmployeesResponse,
        employees: [
          updatedEmployee,
          mockEmployeesResponse.employees[1]
        ]
      };

      mockedApi.get = jest.fn().mockResolvedValue(updatedListResponse);

      // Submit update
      const updateButton = screen.getByText(/update employee/i);
      fireEvent.click(updateButton);

      // Verify update API call
      await waitFor(() => {
        expect(mockedApi.patch).toHaveBeenCalledWith('/api/admin/employees/1', {
          job_title: 'Senior Software Engineer'
        });
      });

      // Verify updated data display
      await waitFor(() => {
        expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
        expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument();
      });

      // Critical: User count should remain consistent after update
      expect(screen.getByText(/402/)).toBeInTheDocument();
    });
  });

  describe('Employee Deletion Integration Flow', () => {
    it('should handle employee deletion with proper count update and confirmation', async () => {
      renderWithProviders(<EmployeeDirectory />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click delete button
      const employeeRow = screen.getByText('John Doe').closest('[data-testid="employee-row"]');
      const deleteButton = within(employeeRow!).getByLabelText(/delete/i);
      fireEvent.click(deleteButton);

      // Verify confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });

      // Mock successful deletion response
      mockedApi.delete = jest.fn().mockResolvedValue({
        message: 'Employee deleted successfully'
      });

      // Mock updated list without deleted employee
      const updatedResponse = {
        ...mockEmployeesResponse,
        employees: [mockEmployeesResponse.employees[1]], // Only Jane remains
        pagination: {
          ...mockEmployeesResponse.pagination,
          total: 401 // Decremented count
        }
      };

      mockedApi.get = jest.fn().mockResolvedValue(updatedResponse);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      fireEvent.click(confirmButton);

      // Verify deletion API call
      await waitFor(() => {
        expect(mockedApi.delete).toHaveBeenCalledWith('/api/admin/employees/1');
      });

      // Verify employee removed and count updated
      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText(/401/)).toBeInTheDocument(); // Updated total
      });
    });
  });

  describe('Search and Filter Integration', () => {
    it('should handle real-time search with proper API integration', async () => {
      renderWithProviders(<EmployeeDirectory />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.getByPlaceholderText(/search employees/i);

      // Type search query
      fireEvent.change(searchInput, { target: { value: 'jane' } });

      // Mock search results
      const searchResponse = {
        ...mockEmployeesResponse,
        employees: [mockEmployeesResponse.employees[1]], // Only Jane matches
        filters: {
          ...mockEmployeesResponse.filters,
          search: 'jane'
        }
      };

      mockedApi.get = jest.fn().mockResolvedValue(searchResponse);

      // Wait for debounced search
      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
          params: expect.objectContaining({
            search: 'jane'
          })
        });
      }, { timeout: 1000 });

      // Verify search results
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully with user feedback', async () => {
      // Mock API failure
      mockedApi.get = jest.fn().mockRejectedValue(new Error('Network error'));

      renderWithProviders(<EmployeeDirectory />);

      // Verify error state display
      await waitFor(() => {
        expect(screen.getByText(/failed to load employees/i)).toBeInTheDocument();
      });

      // Verify retry functionality
      const retryButton = screen.getByText(/retry/i);
      
      // Mock successful retry
      mockedApi.get = jest.fn().mockResolvedValue(mockEmployeesResponse);
      fireEvent.click(retryButton);

      // Verify successful data load after retry
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText(/402/)).toBeInTheDocument();
      });
    });

    it('should handle creation errors with proper validation feedback', async () => {
      renderWithProviders(<EmployeeDirectory />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Open creation modal
      const addButton = screen.getByText(/add employee/i);
      fireEvent.click(addButton);

      // Fill invalid data
      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      // Mock validation error response
      mockedApi.post = jest.fn().mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid email format' }
        }
      });

      const submitButton = screen.getByText(/create employee/i);
      fireEvent.click(submitButton);

      // Verify error message display
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization Integration', () => {
    it('should implement proper pagination and loading states', async () => {
      renderWithProviders(<EmployeeDirectory />);

      // Verify initial loading
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Verify pagination controls
      expect(screen.getByText(/page 1 of 9/i)).toBeInTheDocument();
      
      // Test pagination navigation
      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);

      // Verify API called with correct offset
      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
          params: expect.objectContaining({
            offset: 50 // Next page offset
          })
        });
      });
    });

    it('should implement proper caching and data synchronization', async () => {
      const { rerender } = renderWithProviders(<EmployeeDirectory />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Verify initial API call
      expect(mockedApi.get).toHaveBeenCalledTimes(3); // employees, departments, locations

      // Rerender component (simulating navigation back)
      rerender(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <EmployeeDirectory />
          </BrowserRouter>
        </QueryClientProvider>
      );

      // Verify data loads from cache (no additional API calls)
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(mockedApi.get).toHaveBeenCalledTimes(3); // Same count, no additional calls
    });
  });
});