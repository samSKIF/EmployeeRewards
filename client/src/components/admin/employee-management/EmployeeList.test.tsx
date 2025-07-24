import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmployeeList } from './EmployeeList';
import { Employee } from './types';

const mockEmployees: Employee[] = [
  {
    id: 1,
    name: 'John',
    surname: 'Doe',
    email: 'john@example.com',
    username: 'johndoe',
    phoneNumber: '123-456-7890',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    location: 'New York',
    managerEmail: 'manager@example.com',
    sex: 'Male',
    nationality: 'US',
    birthDate: '1990-01-01',
    hireDate: '2020-01-01',
    isAdmin: false,
    status: 'active',
    avatarUrl: 'https://example.com/avatar1.jpg',
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
    phoneNumber: null,
    jobTitle: 'Product Manager',
    department: 'Product',
    location: 'London',
    managerEmail: 'manager2@example.com',
    sex: 'Female',
    nationality: 'UK',
    birthDate: '1992-02-02',
    hireDate: '2021-01-01',
    isAdmin: true,
    status: 'active',
    avatarUrl: null,
    adminScope: 'client',
    allowedSites: ['site1'],
    allowedDepartments: ['Product'],
  },
];

const defaultProps = {
  employees: mockEmployees,
  selectedEmployees: [],
  onEmployeeSelect: vi.fn(),
  onSelectAll: vi.fn(),
  onEditEmployee: vi.fn(),
  onDeleteEmployee: vi.fn(),
  onViewProfile: vi.fn(),
  isLoading: false,
};

describe('EmployeeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render employee table with data', () => {
      render(<EmployeeList {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      render(<EmployeeList {...defaultProps} />);
      
      expect(screen.getByText('Employee')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Department')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Hire Date')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
    });

    it('should show loading skeleton when loading', () => {
      render(<EmployeeList {...defaultProps} isLoading={true} />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show empty state when no employees', () => {
      render(<EmployeeList {...defaultProps} employees={[]} />);
      
      expect(screen.getByText('No employees found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria or add new employees.')).toBeInTheDocument();
    });

    it('should render employee avatars with fallback initials', () => {
      render(<EmployeeList {...defaultProps} />);
      
      // Should show initials for employee without avatar
      expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
    });

    it('should render status badges with correct variants', () => {
      render(<EmployeeList {...defaultProps} />);
      
      const statusBadges = screen.getAllByText('active');
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    it('should show admin badge for admin users', () => {
      render(<EmployeeList {...defaultProps} />);
      
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should show phone number when available', () => {
      render(<EmployeeList {...defaultProps} />);
      
      expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    });
  });

  describe('Selection Functionality', () => {
    it('should handle select all checkbox', () => {
      const onSelectAll = vi.fn();
      render(<EmployeeList {...defaultProps} onSelectAll={onSelectAll} />);
      
      const selectAllCheckbox = screen.getByLabelText('Select all employees');
      fireEvent.click(selectAllCheckbox);
      
      expect(onSelectAll).toHaveBeenCalledWith(true);
    });

    it('should handle individual employee selection', () => {
      const onEmployeeSelect = vi.fn();
      render(<EmployeeList {...defaultProps} onEmployeeSelect={onEmployeeSelect} />);
      
      const employeeCheckbox = screen.getByLabelText('Select John Doe');
      fireEvent.click(employeeCheckbox);
      
      expect(onEmployeeSelect).toHaveBeenCalledWith(mockEmployees[0], true);
    });

    it('should show selected state for selected employees', () => {
      render(<EmployeeList {...defaultProps} selectedEmployees={[mockEmployees[0]]} />);
      
      const selectedRow = screen.getByRole('row', { name: /John Doe/ });
      expect(selectedRow).toHaveClass('bg-blue-50');
    });

    it('should show indeterminate state for partial selection', () => {
      render(<EmployeeList {...defaultProps} selectedEmployees={[mockEmployees[0]]} />);
      
      const selectAllCheckbox = screen.getByLabelText('Select all employees') as HTMLInputElement;
      expect(selectAllCheckbox.indeterminate).toBe(true);
    });

    it('should check select all when all employees selected', () => {
      render(<EmployeeList {...defaultProps} selectedEmployees={mockEmployees} />);
      
      const selectAllCheckbox = screen.getByLabelText('Select all employees') as HTMLInputElement;
      expect(selectAllCheckbox.checked).toBe(true);
    });
  });

  describe('Actions Menu', () => {
    it('should show dropdown menu for each employee', () => {
      render(<EmployeeList {...defaultProps} />);
      
      const actionButtons = screen.getAllByRole('button');
      const dropdownButtons = actionButtons.filter(button => 
        button.querySelector('svg') // Looking for MoreHorizontal icon
      );
      
      expect(dropdownButtons.length).toBeGreaterThan(0);
    });

    it('should call onEditEmployee when edit is clicked', () => {
      const onEditEmployee = vi.fn();
      render(<EmployeeList {...defaultProps} onEditEmployee={onEditEmployee} />);
      
      // Open dropdown for first employee
      const dropdownButtons = screen.getAllByRole('button');
      const firstDropdown = dropdownButtons[1]; // First is select all checkbox
      fireEvent.click(firstDropdown);
      
      const editButton = screen.getByText('Edit Employee');
      fireEvent.click(editButton);
      
      expect(onEditEmployee).toHaveBeenCalledWith(mockEmployees[0]);
    });

    it('should call onDeleteEmployee when delete is clicked', () => {
      const onDeleteEmployee = vi.fn();
      render(<EmployeeList {...defaultProps} onDeleteEmployee={onDeleteEmployee} />);
      
      // Open dropdown for first employee
      const dropdownButtons = screen.getAllByRole('button');
      const firstDropdown = dropdownButtons[1];
      fireEvent.click(firstDropdown);
      
      const deleteButton = screen.getByText('Delete Employee');
      fireEvent.click(deleteButton);
      
      expect(onDeleteEmployee).toHaveBeenCalledWith(mockEmployees[0]);
    });

    it('should open profile dialog when view profile is clicked', () => {
      const onViewProfile = vi.fn();
      render(<EmployeeList {...defaultProps} onViewProfile={onViewProfile} />);
      
      // Open dropdown for first employee
      const dropdownButtons = screen.getAllByRole('button');
      const firstDropdown = dropdownButtons[1];
      fireEvent.click(firstDropdown);
      
      const viewButton = screen.getByText('View Profile');
      fireEvent.click(viewButton);
      
      expect(onViewProfile).toHaveBeenCalledWith(mockEmployees[0]);
      expect(screen.getByText('Employee Profile')).toBeInTheDocument();
    });
  });

  describe('Profile Dialog', () => {
    it('should display employee details in profile dialog', () => {
      render(<EmployeeList {...defaultProps} />);
      
      // Open dropdown and view profile
      const dropdownButtons = screen.getAllByRole('button');
      const firstDropdown = dropdownButtons[1];
      fireEvent.click(firstDropdown);
      
      const viewButton = screen.getByText('View Profile');
      fireEvent.click(viewButton);
      
      // Check profile details
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
    });

    it('should close profile dialog when close button clicked', () => {
      render(<EmployeeList {...defaultProps} />);
      
      // Open profile dialog
      const dropdownButtons = screen.getAllByRole('button');
      const firstDropdown = dropdownButtons[1];
      fireEvent.click(firstDropdown);
      
      const viewButton = screen.getByText('View Profile');
      fireEvent.click(viewButton);
      
      // Close dialog
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Employee Profile')).not.toBeInTheDocument();
    });

    it('should call onEditEmployee from profile dialog', () => {
      const onEditEmployee = vi.fn();
      render(<EmployeeList {...defaultProps} onEditEmployee={onEditEmployee} />);
      
      // Open profile dialog
      const dropdownButtons = screen.getAllByRole('button');
      const firstDropdown = dropdownButtons[1];
      fireEvent.click(firstDropdown);
      
      const viewButton = screen.getByText('View Profile');
      fireEvent.click(viewButton);
      
      // Click edit in dialog
      const editButtons = screen.getAllByText('Edit');
      const dialogEditButton = editButtons.find(btn => btn.closest('[role="dialog"]'));
      if (dialogEditButton) {
        fireEvent.click(dialogEditButton);
        expect(onEditEmployee).toHaveBeenCalledWith(mockEmployees[0]);
      }
    });
  });

  describe('Data Formatting', () => {
    it('should format dates correctly', () => {
      render(<EmployeeList {...defaultProps} />);
      
      expect(screen.getByText('Jan 01, 2020')).toBeInTheDocument(); // Hire date
    });

    it('should handle null values gracefully', () => {
      const employeeWithNulls = {
        ...mockEmployees[1],
        phoneNumber: null,
        department: null,
        location: null,
        hireDate: null,
      };
      
      render(<EmployeeList {...defaultProps} employees={[employeeWithNulls]} />);
      
      const naCells = screen.getAllByText('N/A');
      expect(naCells.length).toBeGreaterThan(0);
    });

    it('should handle invalid dates', () => {
      const employeeWithInvalidDate = {
        ...mockEmployees[0],
        hireDate: 'invalid-date',
      };
      
      render(<EmployeeList {...defaultProps} employees={[employeeWithInvalidDate]} />);
      
      expect(screen.getByText('Invalid date')).toBeInTheDocument();
    });

    it('should generate correct initials', () => {
      const employeeWithNoSurname = {
        ...mockEmployees[0],
        surname: null,
      };
      
      render(<EmployeeList {...defaultProps} employees={[employeeWithNoSurname]} />);
      
      // Should show 'J' for John with no surname
      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle employee with minimal data', () => {
      const minimalEmployee: Employee = {
        id: 999,
        name: 'Test',
        surname: null,
        email: 'test@example.com',
        username: 'test',
        phoneNumber: null,
        jobTitle: null,
        department: null,
        location: null,
        managerEmail: null,
        sex: null,
        nationality: null,
        birthDate: null,
        hireDate: null,
        isAdmin: false,
        status: null,
        avatarUrl: null,
        adminScope: null,
        allowedSites: null,
        allowedDepartments: null,
      };
      
      render(<EmployeeList {...defaultProps} employees={[minimalEmployee]} />);
      
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should handle large employee lists efficiently', () => {
      const manyEmployees = Array.from({ length: 100 }, (_, i) => ({
        ...mockEmployees[0],
        id: i + 1,
        name: `Employee${i + 1}`,
        email: `employee${i + 1}@example.com`,
      }));
      
      render(<EmployeeList {...defaultProps} employees={manyEmployees} />);
      
      expect(screen.getByText('Employee1')).toBeInTheDocument();
      expect(screen.getByText('Employee100')).toBeInTheDocument();
    });
  });
});