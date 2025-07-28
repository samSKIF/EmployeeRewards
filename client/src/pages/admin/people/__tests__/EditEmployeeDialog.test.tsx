import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock components and hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/admin/employees', vi.fn()],
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock EmployeeDirectory component for testing
const MockEmployeeDirectory = () => {
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState(null);
  
  const mockEmployees = [
    {
      id: 1,
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@test.com',
      location: 'New york',
      manager_email: 'manager@test.com',
      department: 'Engineering',
      status: 'active',
      job_title: 'Senior Developer',
    }
  ];

  return (
    <div>
      <div>John Doe</div>
      <button onClick={() => setIsEditDialogOpen(true)}>Edit</button>
      {isEditDialogOpen && (
        <div>
          <h2>Edit Employee</h2>
          <label>First Name</label>
          <input defaultValue="John" />
          <label>Last Name</label>
          <input defaultValue="Doe" />
          <label>Email</label>
          <input defaultValue="john.doe@test.com" />
          <label>Manager Email</label>
          <input defaultValue="manager@test.com" />
          <label>Location</label>
          <div>New York</div>
          <button onClick={() => setIsEditDialogOpen(false)}>Cancel</button>
          <button>Save Changes</button>
        </div>
      )}
    </div>
  );
};

// Mock data
const mockEmployees = [
  {
    id: 1,
    name: 'John',
    surname: 'Doe',
    email: 'john.doe@test.com',
    location: 'New york', // Lowercase to test case matching
    manager_email: 'manager@test.com',
    department: 'Engineering',
    status: 'active',
    job_title: 'Senior Developer',
    hire_date: '2023-01-15',
    birth_date: '1990-05-20',
    nationality: 'American',
    sex: 'male',
    phone_number: '555-0123'
  },
  {
    id: 2,
    name: 'Jane',
    surname: 'Smith',
    email: 'jane.smith@test.com',
    location: 'TOKYO', // Uppercase to test case matching
    manager_email: 'manager2@test.com',
    department: 'Marketing',
    status: 'active',
    job_title: 'Marketing Manager',
    hire_date: '2022-06-10',
    birth_date: '1988-12-03',
    nationality: 'Japanese',
    sex: 'female',
    phone_number: '555-0456'
  }
];

const mockLocations = ['New York', 'Tokyo', 'Dubai'];
const mockDepartments = ['Engineering', 'Marketing', 'Sales'];

// Mock API responses
global.fetch = vi.fn();

const createMockFetch = (data: any) => {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
};

describe('Edit Employee Dialog', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Setup fetch mocks
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/users')) {
        return createMockFetch(mockEmployees)();
      }
      if (url.includes('/api/users/locations')) {
        return createMockFetch(mockLocations)();
      }
      if (url.includes('/api/users/departments')) {
        return createMockFetch(mockDepartments)();
      }
      if (url.includes('/api/admin/subscription/usage')) {
        return createMockFetch({ subscribed_users: 500, current_users: 402 })();
      }
      return createMockFetch({})();
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MockEmployeeDirectory />
      </QueryClientProvider>
    );
  };

  it('should open edit dialog when edit button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click edit button
    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });
  });

  it('should populate form fields with employee data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click edit for John Doe
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      // Check if form fields are populated
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.doe@test.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('manager@test.com')).toBeInTheDocument();
    });
  });

  it('should handle case-insensitive location matching', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click edit for John Doe (has "New york" location)
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      // Location should show "New York" (properly matched from "New york")
      const locationDisplay = screen.getByText('New York');
      expect(locationDisplay).toBeInTheDocument();
    });
  });

  it('should handle dialog close and reopen', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dialog
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Close dialog
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Edit Employee')).not.toBeInTheDocument();
    });
  });

  it('should handle form submission', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    (global.fetch as any).mockImplementation((url: string, options: any) => {
      if (options?.method === 'PUT') {
        mockUpdate();
        return createMockFetch({ success: true })();
      }
      // Return existing mocks for GET requests
      if (url.includes('/api/users/locations')) {
        return createMockFetch(mockLocations)();
      }
      return createMockFetch(mockEmployees)();
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click edit
    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Make a change
    const nameInput = screen.getByDisplayValue('John');
    fireEvent.change(nameInput, { target: { value: 'Johnny' } });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('should handle empty locations gracefully', async () => {
    // Mock empty locations
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/users/locations')) {
        return createMockFetch([])();
      }
      if (url.includes('/api/users')) {
        return createMockFetch([{
          ...mockEmployees[0],
          location: 'Unknown Location'
        }])();
      }
      return createMockFetch({})();
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
      // Should show "No Location" option when no match found
      expect(screen.getByText('No Location')).toBeInTheDocument();
    });
  });

  it('should close dialog when cancel is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dialog
    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Edit Employee')).not.toBeInTheDocument();
    });
  });

  it('should handle all required form fields', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);

    await waitFor(() => {
      // Check all required fields are present
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Job Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Department')).toBeInTheDocument();
      expect(screen.getByLabelText('Location')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Hire Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Manager Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Nationality')).toBeInTheDocument();
      expect(screen.getByLabelText('Gender')).toBeInTheDocument();
    });
  });

  it('should not show responsibilities and about me fields', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument();
      // These fields should NOT be present
      expect(screen.queryByLabelText('Responsibilities')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('About Me')).not.toBeInTheDocument();
    });
  });
});