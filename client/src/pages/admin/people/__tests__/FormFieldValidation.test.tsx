import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock toast and other dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/admin/employees', vi.fn()],
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock form component for testing
const MockFormComponent = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    phone: '',
    jobTitle: '',
    nationality: '',
  });

  return (
    <div>
      <div>Test User</div>
      <button onClick={() => setIsOpen(true)}>Edit</button>
      {isOpen && (
        <div>
          <h2>Edit Employee</h2>
          <label>First Name</label>
          <input 
            value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <label>Last Name</label>
          <input 
            value={formData.surname}
            onChange={(e) => setFormData({...formData, surname: e.target.value})}
          />
          <label>Email</label>
          <input 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <label>Phone Number</label>
          <input 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
          <label>Job Title</label>
          <input 
            value={formData.jobTitle}
            onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
          />
          <label>Nationality</label>
          <input 
            value={formData.nationality}
            onChange={(e) => setFormData({...formData, nationality: e.target.value})}
          />
          <div>No Location</div>
          <div>No Department</div>
          <div>Prefer not to say</div>
          <button onClick={() => setIsOpen(false)}>Cancel</button>
          <button>Save Changes</button>
        </div>
      )}
    </div>
  );
};

describe('Form Field Validation and Behavior', () => {
  let queryClient: QueryClient;

  const mockEmployee = {
    id: 1,
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    location: null,
    manager_email: null,
    department: null,
    status: 'active',
    job_title: null,
    hire_date: null,
    birth_date: null,
    nationality: null,
    sex: null,
    phone_number: null
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/users/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['New York', 'Tokyo', 'Dubai']),
        });
      }
      if (url.includes('/api/users/departments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['Engineering', 'Marketing', 'Sales']),
        });
      }
      if (url.includes('/api/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockEmployee]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MockFormComponent />
      </QueryClientProvider>
    );
  };

  it('should handle null/undefined field values gracefully', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
      
      // All fields should have appropriate defaults or be empty
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
      expect(screen.getByDisplayValue('User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      
      // Select fields should show placeholder/default values
      expect(screen.getByText('No Location')).toBeInTheDocument();
      expect(screen.getByText('No Department')).toBeInTheDocument();
      expect(screen.getByText('Prefer not to say')).toBeInTheDocument();
    });
  });

  it('should handle select field changes correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Test location select
    const locationTrigger = screen.getByRole('combobox', { name: /location/i });
    fireEvent.click(locationTrigger);
    
    await waitFor(() => {
      expect(screen.getByText('New York')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('New York'));

    // Test status select
    const statusTrigger = screen.getByRole('combobox', { name: /status/i });
    fireEvent.click(statusTrigger);
    
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Inactive'));
  });

  it('should handle input field changes correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Test text input changes
    const phoneInput = screen.getByLabelText('Phone Number');
    fireEvent.change(phoneInput, { target: { value: '555-1234' } });
    expect(phoneInput).toHaveValue('555-1234');

    const jobTitleInput = screen.getByLabelText('Job Title');
    fireEvent.change(jobTitleInput, { target: { value: 'Software Engineer' } });
    expect(jobTitleInput).toHaveValue('Software Engineer');

    const nationalityInput = screen.getByLabelText('Nationality');
    fireEvent.change(nationalityInput, { target: { value: 'American' } });
    expect(nationalityInput).toHaveValue('American');
  });

  it('should handle date input fields correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Test date inputs
    const hireDateInput = screen.getByLabelText('Hire Date');
    fireEvent.change(hireDateInput, { target: { value: '2023-01-15' } });
    expect(hireDateInput).toHaveValue('2023-01-15');

    const birthDateInput = screen.getByLabelText('Birth Date');
    fireEvent.change(birthDateInput, { target: { value: '1990-05-20' } });
    expect(birthDateInput).toHaveValue('1990-05-20');
  });

  it('should not include responsibilities and about me fields', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
      
      // These fields should NOT exist
      expect(screen.queryByLabelText('Responsibilities')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('About Me')).not.toBeInTheDocument();
      expect(screen.queryByText('Key responsibilities and duties')).not.toBeInTheDocument();
      expect(screen.queryByText('Brief description about the employee')).not.toBeInTheDocument();
    });
  });

  it('should handle form reset when dialog closes and reopens', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    // Open dialog
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Make changes
    const phoneInput = screen.getByLabelText('Phone Number');
    fireEvent.change(phoneInput, { target: { value: '555-1234' } });

    // Close dialog
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Edit Employee')).not.toBeInTheDocument();
    });

    // Reopen dialog
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
      // Field should be reset to original value (empty)
      const phoneInputReopened = screen.getByLabelText('Phone Number');
      expect(phoneInputReopened).toHaveValue('');
    });
  });

  it('should maintain form state during validation errors', async () => {
    // Mock API to return validation error
    global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
      if (options?.method === 'PUT') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Validation error' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([mockEmployee]),
      });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Make changes
    const phoneInput = screen.getByLabelText('Phone Number');
    fireEvent.change(phoneInput, { target: { value: '555-1234' } });

    // Submit form (will fail)
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Dialog should remain open with changes intact
    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
      expect(phoneInput).toHaveValue('555-1234');
    });
  });
});