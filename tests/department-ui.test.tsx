import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import DepartmentManagement from '../client/src/pages/admin/settings/DepartmentManagement';

// Mock dependencies
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock react-query hooks
const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

import { apiRequest } from '@/lib/queryClient';

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('Department Management UI', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  const mockDepartments = [
    {
      id: 1,
      name: 'Engineering',
      description: 'Software development team',
      color: '#3B82F6',
      is_active: true,
      created_at: '2025-01-30T08:00:00Z',
      employee_count: 15,
    },
    {
      id: 2,
      name: 'Marketing',
      description: 'Brand and communications team',
      color: '#EC4899',
      is_active: true,
      created_at: '2025-01-30T08:00:00Z',
      employee_count: 8,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();

    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockUseQuery.mockReturnValue({
      data: mockDepartments,
      isLoading: false,
      error: null,
    });

    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      error: null,
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DepartmentManagement />
      </QueryClientProvider>
    );
  };

  describe('Department List Display', () => {
    it('should render department management header', () => {
      renderComponent();
      
      expect(screen.getByText('Department Management')).toBeInTheDocument();
      expect(screen.getByText('Manage your organization\'s departments and structure')).toBeInTheDocument();
    });

    it('should display department statistics correctly', () => {
      renderComponent();
      
      expect(screen.getByText('Total Departments')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total departments
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
      expect(screen.getByText('23')).toBeInTheDocument(); // 15 + 8 employees
      expect(screen.getByText('Active Departments')).toBeInTheDocument();
    });

    it('should render departments list with correct data', () => {
      renderComponent();
      
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Software development team')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
      expect(screen.getByText('Brand and communications team')).toBeInTheDocument();
      
      // Check employee counts
      expect(screen.getByText('15 employees')).toBeInTheDocument();
      expect(screen.getByText('8 employees')).toBeInTheDocument();
    });

    it('should show loading state when data is loading', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderComponent();
      
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });

    it('should display empty state when no departments exist', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderComponent();
      
      expect(screen.getByText('No departments found')).toBeInTheDocument();
      expect(screen.getByText('Create your first department to get started')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Department')).toBeInTheDocument();
    });

    it('should show department colors correctly', () => {
      renderComponent();
      
      // Check that department color indicators are present
      const departmentRows = screen.getAllByRole('row');
      expect(departmentRows.length).toBeGreaterThan(2); // Header + department rows
    });
  });

  describe('Create Department Dialog', () => {
    it('should open create department dialog when button is clicked', async () => {
      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      expect(screen.getByText('Create New Department')).toBeInTheDocument();
      expect(screen.getByText('Add a new department to your organization structure')).toBeInTheDocument();
    });

    it('should render all form fields in create dialog', async () => {
      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      expect(screen.getByLabelText('Department Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByText('Department Color')).toBeInTheDocument();
      
      // Check that color picker is present
      const colorButtons = screen.getAllByRole('button');
      const colorPickerButtons = colorButtons.filter(button => 
        button.style.backgroundColor && button.style.backgroundColor !== ''
      );
      expect(colorPickerButtons.length).toBeGreaterThan(5); // Multiple color options
    });

    it('should validate required fields', async () => {
      const mockMutate = jest.fn();
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      const submitButton = screen.getByText('Create Department');
      expect(submitButton).toBeDisabled(); // Should be disabled when name is empty
      
      // Fill in name
      const nameInput = screen.getByLabelText('Department Name *');
      await user.type(nameInput, 'Human Resources');
      
      expect(submitButton).not.toBeDisabled(); // Should be enabled now
    });

    it('should submit form with correct data', async () => {
      const mockMutate = jest.fn();
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      // Fill form
      const nameInput = screen.getByLabelText('Department Name *');
      const descriptionInput = screen.getByLabelText('Description');
      
      await user.type(nameInput, 'Human Resources');
      await user.type(descriptionInput, 'People operations and culture');
      
      // Select a color (click second color button)
      const colorButtons = screen.getAllByRole('button');
      const colorPickerButtons = colorButtons.filter(button => 
        button.style.backgroundColor && button.style.backgroundColor !== ''
      );
      await user.click(colorPickerButtons[1]); // Select second color
      
      // Submit form
      const submitButton = screen.getByText('Create Department');
      await user.click(submitButton);
      
      expect(mockMutate).toHaveBeenCalledWith({
        name: 'Human Resources',
        description: 'People operations and culture',
        color: expect.any(String), // Color should be set
      });
    });

    it('should handle color selection correctly', async () => {
      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      // Get color buttons
      const colorButtons = screen.getAllByRole('button');
      const colorPickerButtons = colorButtons.filter(button => 
        button.style.backgroundColor && button.style.backgroundColor !== ''
      );
      
      expect(colorPickerButtons.length).toBe(10); // Should have 10 color options
      
      // Click different colors and verify selection
      await user.click(colorPickerButtons[2]);
      // Visual feedback would be tested with more specific selectors
    });

    it('should close dialog on cancel', async () => {
      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      expect(screen.getByText('Create New Department')).toBeInTheDocument();
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Create New Department')).not.toBeInTheDocument();
      });
    });

    it('should reset form when dialog is reopened', async () => {
      renderComponent();
      
      // Open dialog and fill form
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      const nameInput = screen.getByLabelText('Department Name *');
      await user.type(nameInput, 'Test Department');
      
      // Cancel dialog
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      // Reopen dialog
      await user.click(createButton);
      
      // Form should be reset
      const newNameInput = screen.getByLabelText('Department Name *');
      expect(newNameInput).toHaveValue('');
    });
  });

  describe('Edit Department Functionality', () => {
    it('should open edit dialog when edit button is clicked', async () => {
      renderComponent();
      
      // Find and click edit button for first department
      const editButtons = screen.getAllByLabelText('Edit department');
      await user.click(editButtons[0]);
      
      expect(screen.getByText('Edit Department')).toBeInTheDocument();
      expect(screen.getByText('Modify department information')).toBeInTheDocument();
    });

    it('should populate form with existing department data', async () => {
      renderComponent();
      
      const editButtons = screen.getAllByLabelText('Edit department');
      await user.click(editButtons[0]);
      
      const nameInput = screen.getByLabelText('Department Name *') as HTMLInputElement;
      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
      
      expect(nameInput.value).toBe('Engineering');
      expect(descriptionInput.value).toBe('Software development team');
    });

    it('should submit edit form with updated data', async () => {
      const mockMutate = jest.fn();
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      renderComponent();
      
      const editButtons = screen.getAllByLabelText('Edit department');
      await user.click(editButtons[0]);
      
      // Update name
      const nameInput = screen.getByLabelText('Department Name *');
      await user.clear(nameInput);
      await user.type(nameInput, 'Software Engineering');
      
      // Submit form
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      expect(mockMutate).toHaveBeenCalledWith({
        id: 1,
        data: {
          name: 'Software Engineering',
          description: 'Software development team',
          color: '#3B82F6',
        },
      });
    });
  });

  describe('Delete Department Functionality', () => {
    it('should show delete confirmation dialog', async () => {
      // Mock window.confirm
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const mockMutate = jest.fn();
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      renderComponent();
      
      const deleteButtons = screen.getAllByLabelText('Delete department');
      await user.click(deleteButtons[0]);
      
      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete the "Engineering" department? This action cannot be undone.'
      );
      
      mockConfirm.mockRestore();
    });

    it('should call delete mutation when confirmed', async () => {
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const mockMutate = jest.fn();
      
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      renderComponent();
      
      const deleteButtons = screen.getAllByLabelText('Delete department');
      await user.click(deleteButtons[0]);
      
      expect(mockMutate).toHaveBeenCalledWith(1); // Department ID
      
      mockConfirm.mockRestore();
    });

    it('should not delete when cancelled', async () => {
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
      const mockMutate = jest.fn();
      
      mockUseMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        error: null,
      });

      renderComponent();
      
      const deleteButtons = screen.getAllByLabelText('Delete department');
      await user.click(deleteButtons[0]);
      
      expect(mockMutate).not.toHaveBeenCalled();
      
      mockConfirm.mockRestore();
    });
  });

  describe('Department Actions Menu', () => {
    it('should show dropdown menu with actions', async () => {
      renderComponent();
      
      const menuButtons = screen.getAllByLabelText('Department actions');
      await user.click(menuButtons[0]);
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should trigger edit from dropdown menu', async () => {
      renderComponent();
      
      const menuButtons = screen.getAllByLabelText('Department actions');
      await user.click(menuButtons[0]);
      
      const editMenuItem = screen.getByText('Edit');
      await user.click(editMenuItem);
      
      expect(screen.getByText('Edit Department')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state during create operation', async () => {
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        error: null,
      });

      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      const nameInput = screen.getByLabelText('Department Name *');
      await user.type(nameInput, 'Test Department');
      
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      
      const submitButton = screen.getByText('Creating...');
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state during update operation', async () => {
      mockUseMutation.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        error: null,
      });

      renderComponent();
      
      const editButtons = screen.getAllByLabelText('Edit department');
      await user.click(editButtons[0]);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      
      const saveButton = screen.getByText('Saving...');
      expect(saveButton).toBeDisabled();
    });

    it('should handle query error states gracefully', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch departments'),
      });

      renderComponent();
      
      // Should still render the basic structure even with error
      expect(screen.getByText('Department Management')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderComponent();
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(4); // Name, Description, Employees, Actions
      expect(screen.getAllByRole('row')).toHaveLength(3); // Header + 2 data rows
    });

    it('should support keyboard navigation', async () => {
      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      createButton.focus();
      
      expect(createButton).toHaveFocus();
      
      // Test tab navigation
      await user.tab();
      // Next focusable element should be focused
    });

    it('should have proper form labels and validation', async () => {
      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      const nameInput = screen.getByLabelText('Department Name *');
      const descriptionInput = screen.getByLabelText('Description');
      
      expect(nameInput).toHaveAttribute('id', 'name');
      expect(descriptionInput).toHaveAttribute('id', 'description');
      
      // Required field should be marked
      expect(nameInput).toBeRequired();
      expect(descriptionInput).not.toBeRequired();
    });
  });

  describe('Data Integration', () => {
    it('should refetch data after successful creation', async () => {
      const mockInvalidateQueries = jest.fn();
      
      mockUseMutation.mockImplementation((options: any) => ({
        mutate: (data: any) => {
          options.onSuccess();
        },
        isPending: false,
        error: null,
      }));

      // Mock useQueryClient
      jest.doMock('@tanstack/react-query', () => ({
        ...jest.requireActual('@tanstack/react-query'),
        useQueryClient: () => ({
          invalidateQueries: mockInvalidateQueries,
        }),
      }));

      renderComponent();
      
      const createButton = screen.getByText('Create Department');
      await user.click(createButton);
      
      const nameInput = screen.getByLabelText('Department Name *');
      await user.type(nameInput, 'Test Department');
      
      const submitButton = screen.getByText('Create Department');
      await user.click(submitButton);
      
      // Should invalidate queries after successful creation
      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: ['/api/admin/departments'],
        });
      });
    });

    it('should maintain consistent data state across operations', () => {
      renderComponent();
      
      // Verify initial state
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
      
      // Department count should match data
      expect(screen.getByText('2')).toBeInTheDocument(); // Total departments
    });
  });
});