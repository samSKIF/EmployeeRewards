import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeeCard from '../EmployeeCard';

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('Employee Card Component - Frontend Coverage', () => {
  let queryClient: QueryClient;

  const mockEmployee = {
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
    avatar_url: 'https://example.com/avatar.jpg',
    phone_number: '+1234567890'
  };

  const defaultProps = {
    employee: mockEmployee,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    isAdmin: true
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (props = defaultProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EmployeeCard {...props} />
      </QueryClientProvider>
    );
  };

  it('should render employee information correctly', () => {
    renderWithProviders();

    // Verify employee name display
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
  });

  it('should display avatar with proper fallback', () => {
    renderWithProviders();

    const avatar = screen.getByRole('img', { name: /john doe/i });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', mockEmployee.avatar_url);
  });

  it('should show fallback avatar when no avatar_url provided', () => {
    const employeeWithoutAvatar = { ...mockEmployee, avatar_url: null };
    renderWithProviders({ ...defaultProps, employee: employeeWithoutAvatar });

    // Should show initials fallback
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should display status badge with correct styling', () => {
    renderWithProviders();

    const statusBadge = screen.getByText('active');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('should show different status colors for different statuses', () => {
    const inactiveEmployee = { ...mockEmployee, status: 'inactive' };
    renderWithProviders({ ...defaultProps, employee: inactiveEmployee });

    const statusBadge = screen.getByText('inactive');
    expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('should show admin actions when user is admin', () => {
    renderWithProviders();

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('should hide admin actions when user is not admin', () => {
    renderWithProviders({ ...defaultProps, isAdmin: false });

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('should handle edit button click', () => {
    const mockOnEdit = jest.fn();
    renderWithProviders({ ...defaultProps, onEdit: mockOnEdit });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockEmployee);
  });

  it('should handle delete button click', () => {
    const mockOnDelete = jest.fn();
    renderWithProviders({ ...defaultProps, onDelete: mockOnDelete });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockEmployee);
  });

  it('should format hire date correctly', () => {
    renderWithProviders();

    // Should display formatted date
    expect(screen.getByText(/jan 15, 2023/i)).toBeInTheDocument();
  });

  it('should show last seen information', () => {
    renderWithProviders();

    // Should show last seen with relative time
    expect(screen.getByText(/last seen/i)).toBeInTheDocument();
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalEmployee = {
      ...mockEmployee,
      phone_number: null,
      location: null,
      avatar_url: null
    };

    renderWithProviders({ ...defaultProps, employee: minimalEmployee });

    // Should still render without errors
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('+1234567890')).not.toBeInTheDocument();
  });

  it('should be accessible with proper ARIA attributes', () => {
    renderWithProviders();

    const card = screen.getByRole('article');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('aria-labelledby');
    
    const nameHeading = screen.getByRole('heading', { level: 3 });
    expect(nameHeading).toBeInTheDocument();
    expect(nameHeading).toHaveAttribute('id');
  });

  it('should support keyboard navigation for actions', () => {
    renderWithProviders();

    const editButton = screen.getByRole('button', { name: /edit/i });
    const deleteButton = screen.getByRole('button', { name: /delete/i });

    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();

    // Should be focusable
    editButton.focus();
    expect(editButton).toHaveFocus();

    deleteButton.focus();
    expect(deleteButton).toHaveFocus();
  });

  it('should handle long names and text gracefully', () => {
    const longNameEmployee = {
      ...mockEmployee,
      name: 'VeryLongFirstNameThatMightCauseLayoutIssues',
      surname: 'AndAnEquallyLongLastNameThatCouldBreakTheLayout',
      job_title: 'Senior Principal Distinguished Software Engineering Manager Level IV'
    };

    renderWithProviders({ ...defaultProps, employee: longNameEmployee });

    // Should render without layout breaking
    expect(screen.getByText(/VeryLongFirstNameThatMightCauseLayoutIssues/)).toBeInTheDocument();
    expect(screen.getByText(/Senior Principal Distinguished/)).toBeInTheDocument();
  });
});