import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BulkActions } from './BulkActions';
import { Employee, BulkAction } from './types';

const mockEmployees: Employee[] = [
  {
    id: 1,
    name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    username: 'johndoe',
    phoneNumber: '123-456-7890',
    jobTitle: 'Developer',
    department: 'Engineering',
    location: 'New York',
    managerEmail: 'manager@example.com',
    sex: 'Male',
    nationality: 'US',
    birthDate: '1990-01-01',
    hireDate: '2020-01-01',
    isAdmin: false,
    status: 'active',
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
    phoneNumber: '123-456-7891',
    jobTitle: 'Designer',
    department: 'Design',
    location: 'London',
    managerEmail: 'manager2@example.com',
    sex: 'Female',
    nationality: 'UK',
    birthDate: '1992-02-02',
    hireDate: '2021-01-01',
    isAdmin: false,
    status: 'active',
    avatarUrl: null,
    adminScope: null,
    allowedSites: null,
    allowedDepartments: null,
  },
];

const mockDepartments = ['Engineering', 'Design', 'Marketing'];

const defaultProps = {
  selectedEmployees: mockEmployees,
  onBulkAction: vi.fn(),
  onClearSelection: vi.fn(),
  departments: mockDepartments,
  isLoading: false,
};

describe('BulkActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render selection summary', () => {
      render(<BulkActions {...defaultProps} />);
      
      expect(screen.getByText('2 employees selected')).toBeInTheDocument();
      expect(screen.getByText('Choose an action to apply to all selected employees')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<BulkActions {...defaultProps} />);
      
      expect(screen.getByText('Export Selected')).toBeInTheDocument();
      expect(screen.getByText('Delete Selected')).toBeInTheDocument();
      expect(screen.getByText('Clear Selection')).toBeInTheDocument();
    });

    it('should render selected employee badges', () => {
      render(<BulkActions {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should not render when no employees selected', () => {
      const { container } = render(
        <BulkActions {...defaultProps} selectedEmployees={[]} />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should show "+X more" badge for many selected employees', () => {
      const manyEmployees = Array.from({ length: 10 }, (_, i) => ({
        ...mockEmployees[0],
        id: i + 1,
        name: `Employee${i + 1}`,
      }));
      
      render(<BulkActions {...defaultProps} selectedEmployees={manyEmployees} />);
      
      expect(screen.getByText('+5 more')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClearSelection when clear button clicked', () => {
      const onClearSelection = vi.fn();
      render(<BulkActions {...defaultProps} onClearSelection={onClearSelection} />);
      
      const clearButton = screen.getByText('Clear Selection');
      fireEvent.click(clearButton);
      
      expect(onClearSelection).toHaveBeenCalledTimes(1);
    });

    it('should call onBulkAction for export without confirmation', async () => {
      const onBulkAction = vi.fn().mockResolvedValue(undefined);
      render(<BulkActions {...defaultProps} onBulkAction={onBulkAction} />);
      
      const exportButton = screen.getByText('Export Selected');
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(onBulkAction).toHaveBeenCalledWith({
          type: 'export',
          employeeIds: [1, 2],
        });
      });
    });

    it('should show confirmation dialog for delete action', () => {
      render(<BulkActions {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Confirm Bulk Action')).toBeInTheDocument();
      expect(screen.getByText(/This will permanently delete 2 employees/)).toBeInTheDocument();
    });

    it('should show confirmation dialog for status update', () => {
      render(<BulkActions {...defaultProps} />);
      
      // First select a status
      const statusSelect = screen.getByDisplayValue('Update Status');
      fireEvent.click(statusSelect);
      
      // Note: This test might need adjustment based on your Select component implementation
      // You may need to find and click the specific option
      
      const applyButton = screen.getAllByText('Apply')[0];
      fireEvent.click(applyButton);
      
      // Should show confirmation
      expect(screen.getByText('Confirm Bulk Action')).toBeInTheDocument();
    });
  });

  describe('Confirmation Dialog', () => {
    it('should execute bulk action when confirmed', async () => {
      const onBulkAction = vi.fn().mockResolvedValue(undefined);
      render(<BulkActions {...defaultProps} onBulkAction={onBulkAction} />);
      
      // Trigger delete action
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      // Confirm the action
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(onBulkAction).toHaveBeenCalledWith({
          type: 'delete',
          employeeIds: [1, 2],
        });
      });
    });

    it('should cancel bulk action when cancelled', () => {
      const onBulkAction = vi.fn();
      render(<BulkActions {...defaultProps} onBulkAction={onBulkAction} />);
      
      // Trigger delete action
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      // Cancel the action
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      // Dialog should close and action not executed
      expect(screen.queryByText('Confirm Bulk Action')).not.toBeInTheDocument();
      expect(onBulkAction).not.toHaveBeenCalled();
    });

    it('should show affected employees in confirmation dialog', () => {
      render(<BulkActions {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Affected employees:')).toBeInTheDocument();
      expect(screen.getByText('John Doe (john@example.com)')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith (jane@example.com)')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable buttons when loading', () => {
      render(<BulkActions {...defaultProps} isLoading={true} />);
      
      const exportButton = screen.getByText('Export Selected');
      const deleteButton = screen.getByText('Delete Selected');
      
      expect(exportButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it('should show loading text in confirmation dialog', () => {
      render(<BulkActions {...defaultProps} isLoading={true} />);
      
      const deleteButton = screen.getByText('Delete Selected');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single employee selection', () => {
      render(<BulkActions {...defaultProps} selectedEmployees={[mockEmployees[0]]} />);
      
      expect(screen.getByText('1 employee selected')).toBeInTheDocument();
    });

    it('should handle empty departments list', () => {
      render(<BulkActions {...defaultProps} departments={[]} />);
      
      // Should still render other actions
      expect(screen.getByText('Export Selected')).toBeInTheDocument();
    });

    it('should disable status apply button when no status selected', () => {
      render(<BulkActions {...defaultProps} />);
      
      const applyButtons = screen.getAllByText('Apply');
      const statusApplyButton = applyButtons[0];
      
      expect(statusApplyButton).toBeDisabled();
    });

    it('should disable department apply button when no department selected', () => {
      render(<BulkActions {...defaultProps} />);
      
      const applyButtons = screen.getAllByText('Apply');
      const deptApplyButton = applyButtons[1];
      
      expect(deptApplyButton).toBeDisabled();
    });
  });
});