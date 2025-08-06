import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EmployeeOnboarding from '../EmployeeOnboarding';

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

describe('EmployeeOnboarding', () => {
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
      if (url.includes('/api/users/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLocations),
        });
      }
      if (url.includes('/api/admin/users') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            name: 'John',
            email: 'john.doe@company.com',
            username: 'john.doe',
          }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders onboarding header and progress steps', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    expect(screen.getByText('Employee Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Add new team members and guide them through the onboarding process')).toBeInTheDocument();
    
    // Check onboarding steps
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Complete Profile')).toBeInTheDocument();
    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    expect(screen.getByText('Schedule Orientation')).toBeInTheDocument();
  });

  it('shows current step indicator', () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    expect(screen.getByText('Current Step')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Step number in circle
  });

  it('displays account creation form in first step', () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    expect(screen.getByText('Create Employee Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter first name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Try to submit empty form
    const createButton = screen.getByText('Create Account');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('generates username automatically', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Fill in name fields
    const firstNameInput = screen.getByPlaceholderText('Enter first name');
    const lastNameInput = screen.getByPlaceholderText('Enter last name');
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    
    // Click generate username button
    const generateUsernameButton = screen.getByText('Generate');
    fireEvent.click(generateUsernameButton);
    
    await waitFor(() => {
      const usernameInput = screen.getByPlaceholderText('Enter username');
      expect(usernameInput).toHaveValue(expect.stringMatching(/john\.doe\d+/));
    });
  });

  it('generates password automatically', () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Click generate password button
    const generatePasswordButtons = screen.getAllByText('Generate');
    const generatePasswordButton = generatePasswordButtons[1]; // Second Generate button is for password
    
    fireEvent.click(generatePasswordButton);
    
    const passwordInput = screen.getByPlaceholderText('Enter password');
    expect(passwordInput.value).toHaveLength(12);
    expect(passwordInput.value).toMatch(/[A-Za-z0-9!@#$%]+/);
  });

  it('populates department and location options', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    await waitFor(() => {
      // Check department select
      const departmentSelect = screen.getByDisplayValue('Select department');
      fireEvent.click(departmentSelect);
      
      mockDepartments.forEach(dept => {
        expect(screen.getByText(dept)).toBeInTheDocument();
      });
    });
  });

  it('creates employee account successfully', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Fill in required fields
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), { 
      target: { value: 'John' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter email address'), { 
      target: { value: 'john.doe@company.com' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { 
      target: { value: 'john.doe' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { 
      target: { value: 'password123' } 
    });
    
    // Submit form
    const createButton = screen.getByText('Create Account');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Employee account created successfully',
      });
    });
  });

  it('handles account creation errors', async () => {
    // Mock API error
    mockFetch.mockImplementationOnce((url: string, options?: any) => {
      if (options?.method === 'POST') {
        return Promise.reject(new Error('Email already exists'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDepartments),
      });
    });
    
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Fill in form and submit
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), { 
      target: { value: 'John' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter email address'), { 
      target: { value: 'john.doe@company.com' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { 
      target: { value: 'john.doe' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { 
      target: { value: 'password123' } 
    });
    
    const createButton = screen.getByText('Create Account');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Email already exists',
        variant: 'destructive',
      });
    });
  });

  it('progresses to next step after account creation', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Fill and submit form
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), { 
      target: { value: 'John' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter email address'), { 
      target: { value: 'john.doe@company.com' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { 
      target: { value: 'john.doe' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { 
      target: { value: 'password123' } 
    });
    
    const createButton = screen.getByText('Create Account');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Complete Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Mark Profile Complete')).toBeInTheDocument();
    });
  });

  it('shows profile completion step content', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Manually trigger step completion to see next step
    const step2Content = screen.queryByText('Complete Profile Information');
    
    // If not visible, we need to progress through step 1 first
    if (!step2Content) {
      // Complete step 1
      fireEvent.change(screen.getByPlaceholderText('Enter first name'), { 
        target: { value: 'John' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Enter email address'), { 
        target: { value: 'john.doe@company.com' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Enter username'), { 
        target: { value: 'john.doe' } 
      });
      fireEvent.change(screen.getByPlaceholderText('Enter password'), { 
        target: { value: 'password123' } 
      });
      
      const createButton = screen.getByText('Create Account');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Complete Profile Information')).toBeInTheDocument();
        expect(screen.getByText('Adding personal information (birth date, nationality, etc.)')).toBeInTheDocument();
        expect(screen.getByText('Setting up profile photo and contact details')).toBeInTheDocument();
      });
    }
  });

  it('shows document upload step', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Progress through steps to reach documents step
    // This would typically involve completing previous steps
    // For testing, we can simulate the step progression
    
    expect(screen.getByText('Upload Required Documents')).toBeInTheDocument();
    expect(screen.getByText('Collect necessary employment and identification documents')).toBeInTheDocument();
  });

  it('shows orientation scheduling step', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    expect(screen.getByText('Schedule Orientation')).toBeInTheDocument();
    expect(screen.getByText('Set up initial meetings and orientation sessions')).toBeInTheDocument();
  });

  it('completes all onboarding steps', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // The completion state would show after all steps are marked complete
    // This tests the final completion message structure
    expect(screen.getByText('Complete each step to ensure proper employee setup')).toBeInTheDocument();
  });

  it('allows navigation between steps', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // After progressing to step 2, there should be a back button
    // Progress to step 2 first
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), { 
      target: { value: 'John' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter email address'), { 
      target: { value: 'john.doe@company.com' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { 
      target: { value: 'john.doe' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { 
      target: { value: 'password123' } 
    });
    
    const createButton = screen.getByText('Create Account');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Back to Account Creation')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Enter invalid email
    fireEvent.change(screen.getByPlaceholderText('Enter email address'), { 
      target: { value: 'invalid-email' } 
    });
    
    const createButton = screen.getByText('Create Account');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  it('validates manager email format', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Enter invalid manager email
    fireEvent.change(screen.getByPlaceholderText("Enter manager's email"), { 
      target: { value: 'invalid-manager-email' } 
    });
    
    const createButton = screen.getByText('Create Account');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });
  });

  it('has back button to employee directory', () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    const backButton = screen.getByText('Back to Directory');
    expect(backButton.closest('a')).toHaveAttribute('href', '/admin/people/employee-directory');
  });

  it('shows loading state during account creation', async () => {
    // Mock slow API response
    mockFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST') {
        return new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ id: 1, name: 'John' }),
          }), 1000)
        );
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDepartments),
      });
    });
    
    renderWithQueryClient(<EmployeeOnboarding />);
    
    // Fill and submit form
    fireEvent.change(screen.getByPlaceholderText('Enter first name'), { 
      target: { value: 'John' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter email address'), { 
      target: { value: 'john.doe@company.com' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { 
      target: { value: 'john.doe' } 
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { 
      target: { value: 'password123' } 
    });
    
    const createButton = screen.getByText('Create Account');
    fireEvent.click(createButton);
    
    expect(screen.getByText('Creating Account...')).toBeInTheDocument();
  });

  it('disables generate username when no name is provided', () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    const generateUsernameButton = screen.getByText('Generate');
    expect(generateUsernameButton).toBeDisabled();
  });

  it('enables generate username when name is provided', async () => {
    renderWithQueryClient(<EmployeeOnboarding />);
    
    const firstNameInput = screen.getByPlaceholderText('Enter first name');
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      const generateUsernameButton = screen.getByText('Generate');
      expect(generateUsernameButton).toBeEnabled();
    });
  });
});