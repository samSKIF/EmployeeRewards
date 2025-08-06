import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeeDirectory from '../EmployeeDirectory';
import React from 'react';

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

// Critical validation tests to ensure table values ALWAYS show
const realEmployeeData = [
  {
    id: 869,
    name: 'Canva',
    surname: 'Administrator',
    email: 'admin@canva.com',
    job_title: 'Platform Administrator',
    department: 'Administration',
    location: '',
    status: 'active',
    hire_date: '2023-04-07',
    last_seen_at: '2025-07-28T08:54:34.271Z',
    avatar_url: null,
    organization_id: 1
  },
  {
    id: 1510,
    name: 'Alexander',
    surname: 'Gonzalez',
    email: 'gonzalez.alexander@canva.com',
    job_title: 'Chief HR Officer',
    department: 'Human resources',
    location: 'Dubai',
    status: 'active',
    hire_date: '2021-12-14',
    last_seen_at: '2025-07-24T13:04:11.256Z',
    avatar_url: 'https://ui-avatars.com/api/?name=Alexander&background=27ae60&color=ffffff&size=150&rounded=true&seed=1510',
    organization_id: 1
  }
];

const mockSubscriptionInfo = {
  subscribed_users: 500,
  current_usage: 2,
  active_employees: 2,
  total_employees: 2
};

// Fetch already mocked above with auth middleware pattern

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Employee Table Value Validation - Guaranteed Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(realEmployeeData),
        });
      }
      if (url.includes('/api/admin/subscription/usage')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubscriptionInfo),
        });
      }
      if (url.includes('/api/users/departments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['Administration', 'Human resources']),
        });
      }
      if (url.includes('/api/users/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['Dubai']),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  describe('MANDATORY: Values Must Always Show', () => {
    it('ensures ALL employee names are ALWAYS visible in table', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // These names MUST ALWAYS be present
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
        expect(screen.getByText('Alexander Gonzalez')).toBeInTheDocument();
      });

      // Validate NO empty name cells exist anywhere in the table
      const table = screen.getByRole('table');
      const nameColumnCells = table.querySelectorAll('tbody tr td:nth-child(1)');
      
      nameColumnCells.forEach((cell, index) => {
        const nameText = cell.querySelector('p')?.textContent;
        expect(nameText, `Row ${index + 1} name must not be empty`).toBeTruthy();
        expect(nameText?.trim(), `Row ${index + 1} name must not be whitespace`).not.toBe('');
        expect(nameText, `Row ${index + 1} name must not be null`).not.toContain('null');
        expect(nameText, `Row ${index + 1} name must not be undefined`).not.toContain('undefined');
      });
    });

    it('ensures ALL email addresses are ALWAYS visible', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('admin@canva.com')).toBeInTheDocument();
        expect(screen.getByText('gonzalez.alexander@canva.com')).toBeInTheDocument();
      });

      // Validate every row has a valid email
      const table = screen.getByRole('table');
      const nameColumnCells = table.querySelectorAll('tbody tr td:nth-child(1)');
      
      nameColumnCells.forEach((cell, index) => {
        const emailText = cell.querySelector('p:nth-child(2)')?.textContent;
        expect(emailText, `Row ${index + 1} must have email`).toBeTruthy();
        expect(emailText, `Row ${index + 1} email must be valid`).toContain('@');
        expect(emailText, `Row ${index + 1} email must not be empty`).not.toBe('');
      });
    });

    it('ensures ALL job titles have content (title or dash)', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Platform Administrator')).toBeInTheDocument();
        expect(screen.getByText('Chief HR Officer')).toBeInTheDocument();
      });

      // Validate every job title cell has content
      const table = screen.getByRole('table');
      const jobTitleCells = table.querySelectorAll('tbody tr td:nth-child(2)');
      
      jobTitleCells.forEach((cell, index) => {
        const content = cell.textContent?.trim();
        expect(content, `Row ${index + 1} job title must have content`).toBeTruthy();
        expect(content, `Row ${index + 1} job title must not be empty`).not.toBe('');
        expect(content, `Row ${index + 1} job title must not be null text`).not.toBe('null');
        expect(content, `Row ${index + 1} job title must not be undefined text`).not.toBe('undefined');
        
        // Must be either a valid job title or a dash
        expect(
          content === '-' || content.length > 0,
          `Row ${index + 1} job title must be valid title or dash: "${content}"`
        ).toBe(true);
      });
    });

    it('ensures ALL departments are ALWAYS visible', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Administration')).toBeInTheDocument();
        expect(screen.getByText('Human resources')).toBeInTheDocument();
      });

      // Validate every department cell has content
      const table = screen.getByRole('table');
      const departmentCells = table.querySelectorAll('tbody tr td:nth-child(3)');
      
      departmentCells.forEach((cell, index) => {
        const content = cell.textContent?.trim();
        expect(content, `Row ${index + 1} department must exist`).toBeTruthy();
        expect(content, `Row ${index + 1} department must not be empty`).not.toBe('');
        expect(content, `Row ${index + 1} department must not be dash`).not.toBe('-');
        expect(content, `Row ${index + 1} department must be valid`).toMatch(/^[A-Za-z\s]+$/);
      });
    });

    it('ensures ALL locations have content (location or dash)', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Dubai')).toBeInTheDocument();
      });

      // Validate every location cell has content
      const table = screen.getByRole('table');
      const locationCells = table.querySelectorAll('tbody tr td:nth-child(4)');
      
      locationCells.forEach((cell, index) => {
        const content = cell.textContent?.trim();
        expect(content, `Row ${index + 1} location must have content`).toBeTruthy();
        expect(content, `Row ${index + 1} location must not be empty`).not.toBe('');
        expect(content, `Row ${index + 1} location must not be null`).not.toBe('null');
        
        // Must be either a valid location or a dash
        expect(
          content === '-' || content.length > 0,
          `Row ${index + 1} location must be valid or dash: "${content}"`
        ).toBe(true);
      });
    });

    it('ensures ALL status badges are ALWAYS present', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const statusBadges = screen.getAllByText('active');
        expect(statusBadges.length).toBeGreaterThanOrEqual(2);
      });

      // Validate every status cell has a badge
      const table = screen.getByRole('table');
      const statusCells = table.querySelectorAll('tbody tr td:nth-child(5)');
      
      statusCells.forEach((cell, index) => {
        const badge = cell.querySelector('[class*="bg-"]');
        const content = badge?.textContent?.trim();
        
        expect(badge, `Row ${index + 1} must have status badge`).toBeTruthy();
        expect(content, `Row ${index + 1} status must have text`).toBeTruthy();
        expect(
          ['active', 'inactive', 'pending', 'terminated'].includes(content || ''),
          `Row ${index + 1} status must be valid: "${content}"`
        ).toBe(true);
      });
    });

    it('ensures ALL hire dates have content (date or dash)', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Apr 07, 2023')).toBeInTheDocument();
        expect(screen.getByText('Dec 14, 2021')).toBeInTheDocument();
      });

      // Validate every hire date cell has content
      const table = screen.getByRole('table');
      const hireDateCells = table.querySelectorAll('tbody tr td:nth-child(6)');
      
      hireDateCells.forEach((cell, index) => {
        const content = cell.textContent?.trim();
        expect(content, `Row ${index + 1} hire date must have content`).toBeTruthy();
        expect(content, `Row ${index + 1} hire date must not be empty`).not.toBe('');
        expect(content, `Row ${index + 1} hire date must not show error`).not.toContain('Invalid Date');
        
        // Must be either a formatted date or a dash
        if (content !== '-') {
          expect(content, `Row ${index + 1} hire date format invalid: "${content}"`).toMatch(/^[A-Z][a-z]{2} \d{2}, \d{4}$/);
        }
      });
    });

    it('ensures ALL last connected have content (time or Never)', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should have either relative time or "Never"
        const timeOrNever = screen.getByText(/ago$|^Never$/);
        expect(timeOrNever).toBeInTheDocument();
      });

      // Validate every last connected cell has content
      const table = screen.getByRole('table');
      const lastConnectedCells = table.querySelectorAll('tbody tr td:nth-child(7)');
      
      lastConnectedCells.forEach((cell, index) => {
        const content = cell.textContent?.trim();
        expect(content, `Row ${index + 1} last connected must have content`).toBeTruthy();
        expect(content, `Row ${index + 1} last connected must not be empty`).not.toBe('');
        expect(content, `Row ${index + 1} last connected must not show error`).not.toContain('Invalid Date');
        
        // Must be either relative time or "Never"
        expect(
          content === 'Never' || content.endsWith('ago'),
          `Row ${index + 1} last connected format invalid: "${content}"`
        ).toBe(true);
      });
    });

    it('ensures ALL action buttons are present', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const actionButtons = screen.getAllByText('View Profile');
        expect(actionButtons.length).toBe(2); // One for each employee
      });

      // Validate every action cell has button
      const table = screen.getByRole('table');
      const actionCells = table.querySelectorAll('tbody tr td:nth-child(8)');
      
      actionCells.forEach((cell, index) => {
        const button = cell.querySelector('button');
        expect(button, `Row ${index + 1} must have action button`).toBeTruthy();
        expect(button?.textContent?.trim(), `Row ${index + 1} button must have text`).toBe('View Profile');
      });
    });
  });

  describe('MANDATORY: Data Persistence Under Operations', () => {
    it('maintains ALL values after sorting', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
      });

      // Sort by name
      const nameButton = screen.getByRole('button', { name: /Employee/i });
      fireEvent.click(nameButton);

      // Verify ALL data still present after sort
      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
        expect(screen.getByText('Alexander Gonzalez')).toBeInTheDocument();
        expect(screen.getByText('admin@canva.com')).toBeInTheDocument();
        expect(screen.getByText('gonzalez.alexander@canva.com')).toBeInTheDocument();
        expect(screen.getByText('Platform Administrator')).toBeInTheDocument();
        expect(screen.getByText('Chief HR Officer')).toBeInTheDocument();
      });

      // Validate table structure integrity after sort
      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length, 'Table must maintain all rows after sorting').toBe(2);
    });

    it('maintains ALL values after filtering', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
      });

      // Apply search filter
      const searchInput = screen.getByPlaceholderText('Search employees...');
      fireEvent.change(searchInput, { target: { value: 'Alexander' } });

      // Verify filtered employee data is complete
      await waitFor(() => {
        expect(screen.getByText('Alexander Gonzalez')).toBeInTheDocument();
        expect(screen.getByText('gonzalez.alexander@canva.com')).toBeInTheDocument();
        expect(screen.getByText('Chief HR Officer')).toBeInTheDocument();
        expect(screen.getByText('Human resources')).toBeInTheDocument();
        expect(screen.getByText('Dubai')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('Dec 14, 2021')).toBeInTheDocument();
      });

      // Clear filter and verify all data returns
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
        expect(screen.getByText('Alexander Gonzalez')).toBeInTheDocument();
      });
    });

    it('maintains ALL values after multiple operations', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      // Initial load
      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
      });

      // Sort by job title
      const jobTitleButton = screen.getByRole('button', { name: /Job Title/i });
      fireEvent.click(jobTitleButton);

      await waitFor(() => {
        expect(screen.getByText('Platform Administrator')).toBeInTheDocument();
      });

      // Then sort by department
      const departmentButton = screen.getByRole('button', { name: /Department/i });
      fireEvent.click(departmentButton);

      await waitFor(() => {
        expect(screen.getByText('Administration')).toBeInTheDocument();
        expect(screen.getByText('Human resources')).toBeInTheDocument();
      });

      // Apply filter while sorted
      const searchInput = screen.getByPlaceholderText('Search employees...');
      fireEvent.change(searchInput, { target: { value: 'admin' } });

      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
        expect(screen.getByText('admin@canva.com')).toBeInTheDocument();
      });

      // Verify complete data integrity throughout operations
      const table = screen.getByRole('table');
      const visibleRows = table.querySelectorAll('tbody tr');
      
      visibleRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        expect(cells.length, `Row ${index + 1} must have all 8 columns`).toBe(8);
        
        cells.forEach((cell, cellIndex) => {
          expect(
            cell.textContent?.trim(),
            `Row ${index + 1}, Column ${cellIndex + 1} must have content`
          ).toBeTruthy();
        });
      });
    });
  });

  describe('MANDATORY: No Empty Cells Policy', () => {
    it('NEVER allows empty table cells', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const allCells = table.querySelectorAll('tbody tr td');
        
        allCells.forEach((cell, index) => {
          const content = cell.textContent?.trim();
          const cellContext = `Cell ${index + 1} (${Math.floor(index / 8) + 1}, ${(index % 8) + 1})`;
          
          expect(content, `${cellContext} must not be empty`).toBeTruthy();
          expect(content, `${cellContext} must not be whitespace only`).not.toBe('');
          expect(content, `${cellContext} must not be null string`).not.toBe('null');
          expect(content, `${cellContext} must not be undefined string`).not.toBe('undefined');
          expect(content, `${cellContext} must not be NaN string`).not.toBe('NaN');
          expect(content, `${cellContext} must not contain error text`).not.toContain('Error');
          expect(content, `${cellContext} must not contain loading text`).not.toContain('Loading');
        });
      });
    });

    it('NEVER allows broken date displays', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const hireDateCells = table.querySelectorAll('tbody tr td:nth-child(6)');
        const lastConnectedCells = table.querySelectorAll('tbody tr td:nth-child(7)');
        
        [...hireDateCells, ...lastConnectedCells].forEach((cell, index) => {
          const content = cell.textContent?.trim();
          const cellType = index < hireDateCells.length ? 'Hire Date' : 'Last Connected';
          
          expect(content, `${cellType} must not show Invalid Date`).not.toContain('Invalid Date');
          expect(content, `${cellType} must not show NaN`).not.toContain('NaN');
          expect(content, `${cellType} must not show error`).not.toMatch(/error/i);
        });
      });
    });

    it('NEVER allows missing status badges', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const statusCells = table.querySelectorAll('tbody tr td:nth-child(5)');
        
        statusCells.forEach((cell, index) => {
          const badge = cell.querySelector('[class*="bg-"]');
          const badgeText = badge?.textContent?.trim();
          
          expect(badge, `Row ${index + 1} must have status badge element`).toBeTruthy();
          expect(badgeText, `Row ${index + 1} status badge must have text`).toBeTruthy();
          expect(badgeText, `Row ${index + 1} status badge must not be empty`).not.toBe('');
          
          // Must be a valid status
          const validStatuses = ['active', 'inactive', 'pending', 'terminated'];
          expect(
            validStatuses.includes(badgeText || ''),
            `Row ${index + 1} status must be valid: "${badgeText}"`
          ).toBe(true);
        });
      });
    });

    it('NEVER allows broken avatar displays', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const nameColumnCells = table.querySelectorAll('tbody tr td:nth-child(1)');
        
        nameColumnCells.forEach((cell, index) => {
          const avatarFallback = cell.querySelector('[class*="AvatarFallback"]');
          const fallbackText = avatarFallback?.textContent?.trim();
          
          expect(avatarFallback, `Row ${index + 1} must have avatar fallback`).toBeTruthy();
          expect(fallbackText, `Row ${index + 1} avatar fallback must have text`).toBeTruthy();
          expect(fallbackText, `Row ${index + 1} avatar fallback must not be empty`).not.toBe('');
          expect(
            fallbackText?.match(/^[A-Z]{1,2}$/),
            `Row ${index + 1} avatar fallback must be initials: "${fallbackText}"`
          ).toBeTruthy();
        });
      });
    });
  });
});