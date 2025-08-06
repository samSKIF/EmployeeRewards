import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EmployeeProfile from '../EmployeeProfile';

// Mock wouter
vi.mock('wouter', () => ({
  useRoute: () => [true, { id: '1' }],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => 
    <a href={href}>{children}</a>,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDate: (date: Date, format: string) => 'Jan 15, 2023',
}));

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockEmployee = {
  id: 1,
  name: 'John',
  surname: 'Doe',
  email: 'john.doe@company.com',
  phoneNumber: '+1-555-0123',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  location: 'New York',
  status: 'active',
  avatarUrl: 'https://example.com/avatar.jpg',
  hireDate: '2023-01-15',
  birthDate: '1990-05-20',
  managerId: 2,
  managerEmail: 'manager@company.com',
  responsibilities: 'Develop and maintain web applications',
  aboutMe: 'Passionate developer with 5+ years of experience',
  nationality: 'American',
  sex: 'male',
};

const mockDepartments = ['Engineering', 'Product', 'Design', 'Marketing'];
const mockLocations = ['New York', 'San Francisco', 'Remote', 'London'];

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

describe('EmployeeProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses with auth headers
    mockFetch.mockImplementation((url: string, options?: any) => {
      console.log('Mock fetch called with:', url, options);
      
      if (url.includes('/api/users/1')) {
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ...mockEmployee, ...JSON.parse(options.body) }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmployee),
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

  it('renders employee profile with basic information', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
    });
  });

  it('displays employee status badge with correct styling', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      const statusBadge = screen.getByText('active');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  it('shows formatted hire date', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('Hired: Jan 15, 2023')).toBeInTheDocument();
    });
  });

  it('enters edit mode when edit button is clicked', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });
    
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.doe@company.com')).toBeInTheDocument();
    });
  });

  it('populates form fields with employee data in edit mode', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.doe@company.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1-555-0123')).toBeInTheDocument();
    });
  });

  it('cancels edit mode and reverts changes', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
    });
    
    // Make a change
    const nameInput = screen.getByDisplayValue('John');
    fireEvent.change(nameInput, { target: { value: 'Johnny' } });
    
    // Cancel editing
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Johnny')).not.toBeInTheDocument();
    });
  });

  it('saves changes successfully', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
    });
    
    // Make changes
    const nameInput = screen.getByDisplayValue('John');
    fireEvent.change(nameInput, { target: { value: 'Johnny' } });
    
    const jobTitleInput = screen.getByDisplayValue('Software Engineer');
    fireEvent.change(jobTitleInput, { target: { value: 'Senior Software Engineer' } });
    
    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Employee profile updated successfully',
      });
    });
  });

  it('handles save errors', async () => {
    // Mock API error
    mockFetch.mockImplementationOnce((url: string, options?: any) => {
      if (options?.method === 'PATCH') {
        return Promise.reject(new Error('Update failed'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEmployee),
      });
    });
    
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
    });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Update failed',
        variant: 'destructive',
      });
    });
  });

  it('renders all tab sections', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('Personal Info')).toBeInTheDocument();
      expect(screen.getByText('Job Details')).toBeInTheDocument();
      expect(screen.getByText('Contact Info')).toBeInTheDocument();
    });
  });

  it('displays personal information in personal tab', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Doe')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2023')).toBeInTheDocument(); // Birth date
      expect(screen.getByText('male')).toBeInTheDocument();
      expect(screen.getByText('American')).toBeInTheDocument();
    });
  });

  it('displays job information in job tab', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    // Click job details tab
    const jobTab = screen.getByText('Job Details');
    fireEvent.click(jobTab);
    
    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('manager@company.com')).toBeInTheDocument();
      expect(screen.getByText('Develop and maintain web applications')).toBeInTheDocument();
    });
  });

  it('displays contact information in contact tab', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    // Click contact info tab
    const contactTab = screen.getByText('Contact Info');
    fireEvent.click(contactTab);
    
    await waitFor(() => {
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    // Mock loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));
    
    renderWithQueryClient(<EmployeeProfile />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows not found message for invalid employee', async () => {
    // Mock 404 response
    mockFetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(null),
      })
    );
    
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('Employee Not Found')).toBeInTheDocument();
      expect(screen.getByText('The requested employee profile could not be found.')).toBeInTheDocument();
    });
  });

  it('updates form fields correctly in edit mode', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
    });
    
    // Test form field updates
    const surnameInput = screen.getByDisplayValue('Doe');
    fireEvent.change(surnameInput, { target: { value: 'Smith' } });
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    
    const phoneInput = screen.getByDisplayValue('+1-555-0123');
    fireEvent.change(phoneInput, { target: { value: '+1-555-9999' } });
    expect(screen.getByDisplayValue('+1-555-9999')).toBeInTheDocument();
  });

  it('handles department and location selects in edit mode', async () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
    });
    
    // Click job details tab to access department/location selects
    const jobTab = screen.getByText('Job Details');
    fireEvent.click(jobTab);
    
    await waitFor(() => {
      // Department select should show current value
      expect(screen.getByDisplayValue('Engineering')).toBeInTheDocument();
      
      // Location select should show current value
      expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
    });
  });

  it('has back button with correct link', () => {
    renderWithQueryClient(<EmployeeProfile />);
    
    const backButton = screen.getByText('Back');
    expect(backButton.closest('a')).toHaveAttribute('href', '/admin/people/employee-directory');
  });

  it('displays save button loading state during update', async () => {
    // Mock slow API response
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'PATCH') {
        return new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockEmployee),
          }), 1000)
        );
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEmployee),
      });
    });
    
    renderWithQueryClient(<EmployeeProfile />);
    
    await waitFor(() => {
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);
    });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});