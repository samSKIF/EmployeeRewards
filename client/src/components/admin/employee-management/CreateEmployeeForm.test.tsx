import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateEmployeeForm } from './CreateEmployeeForm';
import { EmployeeFormData } from './types';

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

const mockDepartments = ['Engineering', 'Marketing', 'Sales'];
const mockLocations = ['New York', 'London', 'Tokyo'];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  departments: mockDepartments,
  locations: mockLocations,
  isLoading: false,
};

describe('CreateEmployeeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form when open', () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      expect(screen.getByText('Create New Employee')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<CreateEmployeeForm {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Create New Employee')).not.toBeInTheDocument();
    });

    it('should render all form sections', () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Work Information')).toBeInTheDocument();
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByText('Access & Permissions')).toBeInTheDocument();
    });

    it('should render department and location options', () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      // Click department select to open options
      const departmentSelect = screen.getByText('Select department');
      fireEvent.click(departmentSelect);
      
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('should show admin warning when admin checkbox is checked', () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      const adminCheckbox = screen.getByLabelText('Grant administrator privileges');
      fireEvent.click(adminCheckbox);
      
      expect(screen.getByText(/This user will have administrative access/)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show required field errors', async () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Surname is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText('Email Address *');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should validate password length', async () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Temporary Password *');
      fireEvent.change(passwordInput, { target: { value: '123' } });
      
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText('Phone Number');
      fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });
      
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
      });
    });

    it('should validate future dates', async () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      const birthDateInput = screen.getByLabelText('Birth Date');
      fireEvent.change(birthDateInput, { target: { value: futureDateString } });
      
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Birth date cannot be in the future')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const validFormData = {
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    };

    it('should submit valid form data', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CreateEmployeeForm {...defaultProps} onSubmit={onSubmit} />);
      
      // Fill in required fields
      fireEvent.change(screen.getByLabelText('First Name *'), { 
        target: { value: validFormData.name } 
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), { 
        target: { value: validFormData.surname } 
      });
      fireEvent.change(screen.getByLabelText('Email Address *'), { 
        target: { value: validFormData.email } 
      });
      fireEvent.change(screen.getByLabelText('Temporary Password *'), { 
        target: { value: validFormData.password } 
      });
      
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'John',
            surname: 'Doe',
            email: 'john.doe@example.com',
            password: 'password123',
            status: 'active',
            isAdmin: false,
          })
        );
      });
    });

    it('should not submit invalid form', async () => {
      const onSubmit = vi.fn();
      render(<CreateEmployeeForm {...defaultProps} onSubmit={onSubmit} />);
      
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('should close form after successful submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<CreateEmployeeForm {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);
      
      // Fill valid form
      fireEvent.change(screen.getByLabelText('First Name *'), { 
        target: { value: validFormData.name } 
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), { 
        target: { value: validFormData.surname } 
      });
      fireEvent.change(screen.getByLabelText('Email Address *'), { 
        target: { value: validFormData.email } 
      });
      fireEvent.change(screen.getByLabelText('Temporary Password *'), { 
        target: { value: validFormData.password } 
      });
      
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should clear errors when user starts typing', async () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      // Trigger validation error
      const submitButton = screen.getByText('Create Employee');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
      
      // Start typing to clear error
      const nameInput = screen.getByLabelText('First Name *');
      fireEvent.change(nameInput, { target: { value: 'John' } });
      
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });

    it('should close form when cancel is clicked', () => {
      const onClose = vi.fn();
      render(<CreateEmployeeForm {...defaultProps} onClose={onClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should generate username preview', () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText('First Name *'), { 
        target: { value: 'John' } 
      });
      fireEvent.change(screen.getByLabelText('Last Name *'), { 
        target: { value: 'Doe' } 
      });
      
      expect(screen.getByText('johndoe')).toBeInTheDocument();
    });

    it('should handle department selection', () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      const departmentSelect = screen.getByText('Select department');
      fireEvent.click(departmentSelect);
      
      const engineeringOption = screen.getByText('Engineering');
      fireEvent.click(engineeringOption);
      
      // Verify selection (this might need adjustment based on Select component behavior)
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable buttons when loading', () => {
      render(<CreateEmployeeForm {...defaultProps} isLoading={true} />);
      
      const submitButton = screen.getByText('Create Employee');
      const cancelButton = screen.getByText('Cancel');
      
      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading spinner when submitting', () => {
      render(<CreateEmployeeForm {...defaultProps} isLoading={true} />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty departments and locations lists', () => {
      render(<CreateEmployeeForm {...defaultProps} departments={[]} locations={[]} />);
      
      expect(screen.getByText('Select department')).toBeInTheDocument();
      expect(screen.getByText('Select location')).toBeInTheDocument();
    });

    it('should generate username from email when name is empty', () => {
      render(<CreateEmployeeForm {...defaultProps} />);
      
      fireEvent.change(screen.getByLabelText('Email Address *'), { 
        target: { value: 'testuser@example.com' } 
      });
      
      // Should show fallback username generation
      expect(screen.getByText(/Username will be generated/)).toBeInTheDocument();
    });

    it('should reset form when dialog is closed and reopened', () => {
      const { rerender } = render(<CreateEmployeeForm {...defaultProps} />);
      
      // Fill some data
      fireEvent.change(screen.getByLabelText('First Name *'), { 
        target: { value: 'John' } 
      });
      
      // Close dialog
      rerender(<CreateEmployeeForm {...defaultProps} isOpen={false} />);
      
      // Reopen dialog
      rerender(<CreateEmployeeForm {...defaultProps} isOpen={true} />);
      
      // Form should be reset
      const nameInput = screen.getByLabelText('First Name *') as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });
  });
});