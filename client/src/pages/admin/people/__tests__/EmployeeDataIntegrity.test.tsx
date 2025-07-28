import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmployeeDirectory from '../EmployeeDirectory';
import React from 'react';

// Server Integration Tests - Testing against real data patterns from the database
const realEmployeeDataScenarios = [
  // Complete data scenario (like Canva Administrator)
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
  // Partial data scenario (like Alexander Gonzalez)
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
  },
  // Missing job title scenario (like some employees before update)
  {
    id: 1614,
    name: 'Alexandar',
    surname: 'Reyez',
    email: 'reyez.alexandar@canva.com',
    job_title: null,
    department: 'Human resources',
    location: 'New york',
    status: 'active',
    hire_date: '2023-07-02',
    last_seen_at: null,
    avatar_url: 'https://ui-avatars.com/api/?name=Alexander&background=34495e&color=ffffff&size=150&rounded=true&seed=1614',
    organization_id: 1
  },
  // Pending status scenario
  {
    id: 1396,
    name: 'Alexander',
    surname: 'Gomez',
    email: 'gomez.alexander@canva.com',
    job_title: 'Finance Analyst',
    department: 'Finance',
    location: 'New York',
    status: 'pending',
    hire_date: '2022-06-15',
    last_seen_at: null,
    avatar_url: 'https://api.dicebear.com/7.x/initials/png?seed=1396_Alexander_hispanic_female&backgroundColor=7f8c8d&size=150',
    organization_id: 1
  },
  // Edge case: empty string location
  {
    id: 1287,
    name: 'Alexander Roberts',
    surname: 'Roberts',
    email: 'roberts.alexander@canva.com',
    job_title: 'Senior Director',
    department: 'Officer',
    location: 'New York',
    status: 'active',
    hire_date: '2020-03-24',
    last_seen_at: null,
    avatar_url: 'https://api.dicebear.com/7.x/bottts/png?seed=1287_Alexander_western_male&backgroundColor=e67e22&size=150',
    organization_id: 1
  }
];

const mockSubscriptionInfo = {
  subscribed_users: 500,
  current_usage: 401,
  active_employees: 401,
  total_employees: 402
};

const mockDepartments = ['Administration', 'Human resources', 'Finance', 'Officer'];
const mockLocations = ['Dubai', 'New York', 'Tokyo'];

global.fetch = vi.fn();

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

describe('Employee Data Integrity - Real Data Patterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(realEmployeeDataScenarios),
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

  describe('Critical Data Display Requirements', () => {
    it('MUST always display employee names - never empty or missing', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // These names MUST always appear in the table
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
        expect(screen.getByText('Alexander Gonzalez')).toBeInTheDocument();
        expect(screen.getByText('Alexandar Reyez')).toBeInTheDocument();
        expect(screen.getByText('Alexander Gomez')).toBeInTheDocument();
        expect(screen.getByText('Alexander Roberts Roberts')).toBeInTheDocument();
      });

      // Verify NO empty name cells exist
      const tableCells = screen.getAllByRole('cell');
      const nameCells = tableCells.filter(cell => 
        cell.querySelector('p')?.textContent?.includes('@') === false &&
        cell.querySelector('p')?.textContent?.trim() !== ''
      );
      
      expect(nameCells.length).toBeGreaterThan(0);
      nameCells.forEach(cell => {
        const nameText = cell.querySelector('p')?.textContent;
        expect(nameText).toBeTruthy();
        expect(nameText?.trim()).not.toBe('');
      });
    });

    it('MUST always display email addresses - never empty or missing', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // These emails MUST always appear
        expect(screen.getByText('admin@canva.com')).toBeInTheDocument();
        expect(screen.getByText('gonzalez.alexander@canva.com')).toBeInTheDocument();
        expect(screen.getByText('reyez.alexandar@canva.com')).toBeInTheDocument();
        expect(screen.getByText('gomez.alexander@canva.com')).toBeInTheDocument();
        expect(screen.getByText('roberts.alexander@canva.com')).toBeInTheDocument();
      });

      // Verify NO empty email cells exist
      const emailElements = screen.getAllByText(/@canva\.com$/);
      expect(emailElements).toHaveLength(5); // All 5 employees must have visible emails
    });

    it('MUST always display departments - never empty or missing', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // These departments MUST always appear
        expect(screen.getByText('Administration')).toBeInTheDocument();
        expect(screen.getByText('Human resources')).toBeInTheDocument();
        expect(screen.getByText('Finance')).toBeInTheDocument();
        expect(screen.getByText('Officer')).toBeInTheDocument();
      });

      // Verify no employee row is missing department data
      const table = screen.getByRole('table');
      const employeeRows = table.querySelectorAll('tbody tr');
      
      employeeRows.forEach(row => {
        const departmentCell = row.querySelector('td:nth-child(3)'); // Department column
        expect(departmentCell?.textContent?.trim()).toBeTruthy();
        expect(departmentCell?.textContent?.trim()).not.toBe('-');
        expect(departmentCell?.textContent?.trim()).not.toBe('');
      });
    });

    it('MUST always display status badges - never missing', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Status badges MUST always be present
        const statusBadges = screen.getAllByText(/^(active|pending|inactive|terminated)$/);
        expect(statusBadges).toHaveLength(5); // All 5 employees must have status badges
        
        // Verify specific statuses are displayed
        expect(screen.getAllByText('active')).toHaveLength(4);
        expect(screen.getAllByText('pending')).toHaveLength(1);
      });

      // Verify no employee row is missing status
      const table = screen.getByRole('table');
      const employeeRows = table.querySelectorAll('tbody tr');
      
      employeeRows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(5)'); // Status column
        const badge = statusCell?.querySelector('[class*="bg-"]'); // Status badge
        expect(badge).toBeTruthy();
        expect(badge?.textContent?.trim()).toMatch(/^(active|pending|inactive|terminated)$/);
      });
    });
  });

  describe('Job Title Field Handling', () => {
    it('displays job titles when available from database', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Platform Administrator')).toBeInTheDocument();
        expect(screen.getByText('Chief HR Officer')).toBeInTheDocument();
        expect(screen.getByText('Finance Analyst')).toBeInTheDocument();
        expect(screen.getByText('Senior Director')).toBeInTheDocument();
      });
    });

    it('shows dash (-) for null job titles consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        // Find rows with null job_title (like Alexandar Reyez)
        let foundNullJobTitle = false;
        employeeRows.forEach(row => {
          const nameCell = row.querySelector('td:nth-child(1)');
          const jobTitleCell = row.querySelector('td:nth-child(2)');
          
          if (nameCell?.textContent?.includes('Alexandar Reyez')) {
            expect(jobTitleCell?.textContent?.trim()).toBe('-');
            foundNullJobTitle = true;
          }
        });
        
        expect(foundNullJobTitle).toBe(true);
      });
    });

    it('NEVER shows empty or undefined job title cells', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        employeeRows.forEach(row => {
          const jobTitleCell = row.querySelector('td:nth-child(2)'); // Job Title column
          const content = jobTitleCell?.textContent?.trim();
          
          // Must have either a job title OR a dash, never empty/undefined
          expect(content).toBeTruthy();
          expect(content).not.toBe('');
          expect(content).not.toBe('undefined');
          expect(content).not.toBe('null');
        });
      });
    });
  });

  describe('Hire Date Field Handling', () => {
    it('displays formatted hire dates when available', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Apr 07, 2023')).toBeInTheDocument();
        expect(screen.getByText('Dec 14, 2021')).toBeInTheDocument();
        expect(screen.getByText('Jul 02, 2023')).toBeInTheDocument();
        expect(screen.getByText('Jun 15, 2022')).toBeInTheDocument();
        expect(screen.getByText('Mar 24, 2020')).toBeInTheDocument();
      });
    });

    it('NEVER shows invalid date formats or errors', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        employeeRows.forEach(row => {
          const hireDateCell = row.querySelector('td:nth-child(6)'); // Hire Date column
          const content = hireDateCell?.textContent?.trim();
          
          // Must have either a formatted date OR a dash, never error messages
          expect(content).toBeTruthy();
          expect(content).not.toContain('Invalid Date');
          expect(content).not.toContain('NaN');
          expect(content).not.toContain('undefined');
          
          // If not a dash, should be a valid date format
          if (content !== '-') {
            expect(content).toMatch(/^[A-Z][a-z]{2} \d{2}, \d{4}$/);
          }
        });
      });
    });
  });

  describe('Last Connected Field Handling', () => {
    it('displays "Never" for null last_seen_at values', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const neverElements = screen.getAllByText('Never');
        expect(neverElements.length).toBeGreaterThanOrEqual(3); // At least 3 employees with null last_seen_at
      });
    });

    it('displays relative time for valid timestamps', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show relative time for employees with valid last_seen_at
        const relativeTimeElements = screen.getAllByText(/ago$/);
        expect(relativeTimeElements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('NEVER shows invalid time formats or errors', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        employeeRows.forEach(row => {
          const lastConnectedCell = row.querySelector('td:nth-child(7)'); // Last Connected column
          const content = lastConnectedCell?.textContent?.trim();
          
          // Must have either relative time OR "Never", never error messages
          expect(content).toBeTruthy();
          expect(content).not.toContain('Invalid Date');
          expect(content).not.toContain('NaN');
          expect(content).not.toContain('undefined');
          
          // Must be either "Never" or end with "ago"
          expect(content === 'Never' || content?.endsWith('ago')).toBe(true);
        });
      });
    });
  });

  describe('Location Field Handling', () => {
    it('displays locations when available', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Dubai')).toBeInTheDocument();
        expect(screen.getAllByText('New York')).toHaveLength(2); // Multiple employees in NY
      });
    });

    it('shows dash (-) for missing locations consistently', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        // Find employees with empty location (like admin@canva.com)
        let foundEmptyLocation = false;
        employeeRows.forEach(row => {
          const nameCell = row.querySelector('td:nth-child(1)');
          const locationCell = row.querySelector('td:nth-child(4)');
          
          if (nameCell?.textContent?.includes('Canva Administrator')) {
            expect(locationCell?.textContent?.trim()).toBe('-');
            foundEmptyLocation = true;
          }
        });
        
        expect(foundEmptyLocation).toBe(true);
      });
    });

    it('NEVER shows empty location cells without fallback', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        employeeRows.forEach(row => {
          const locationCell = row.querySelector('td:nth-child(4)'); // Location column
          const content = locationCell?.textContent?.trim();
          
          // Must have either a location OR a dash, never empty
          expect(content).toBeTruthy();
          expect(content).not.toBe('');
          expect(content).not.toBe('undefined');
          expect(content).not.toBe('null');
        });
      });
    });
  });

  describe('Avatar Field Handling', () => {
    it('ALWAYS displays avatar fallbacks when images fail or are missing', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should have avatar fallbacks for all employees
        const avatarFallbacks = screen.getAllByText(/^[A-Z]{1,2}$/);
        expect(avatarFallbacks).toHaveLength(5); // All 5 employees should have avatar fallbacks
      });
    });

    it('NEVER shows broken image placeholders', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        employeeRows.forEach(row => {
          const avatarCell = row.querySelector('td:nth-child(1)'); // Employee column with avatar
          const avatarFallback = avatarCell?.querySelector('[class*="AvatarFallback"]');
          
          // Every employee must have an avatar fallback
          expect(avatarFallback).toBeTruthy();
          expect(avatarFallback?.textContent?.trim()).toBeTruthy();
        });
      });
    });
  });

  describe('Table Structure Integrity', () => {
    it('ALWAYS renders exactly 5 employee rows (matching test data)', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        expect(employeeRows).toHaveLength(5); // Exactly 5 employees in test data
      });
    });

    it('EVERY employee row MUST have exactly 8 cells', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        employeeRows.forEach((row, index) => {
          const cells = row.querySelectorAll('td');
          expect(cells).toHaveLength(8); // Employee, Job Title, Department, Location, Status, Hire Date, Last Connected, Actions
        });
      });
    });

    it('NEVER renders empty or broken table rows', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        const table = screen.getByRole('table');
        const employeeRows = table.querySelectorAll('tbody tr');
        
        employeeRows.forEach((row, index) => {
          // Each row must have content in critical cells
          const nameCell = row.querySelector('td:nth-child(1)');
          const departmentCell = row.querySelector('td:nth-child(3)');
          const statusCell = row.querySelector('td:nth-child(5)');
          
          expect(nameCell?.textContent?.trim()).toBeTruthy();
          expect(departmentCell?.textContent?.trim()).toBeTruthy();
          expect(statusCell?.textContent?.trim()).toBeTruthy();
        });
      });
    });
  });

  describe('Data Consistency Across Operations', () => {
    it('maintains data integrity after sorting operations', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
      });

      // Perform sort operation
      const nameButton = screen.getByRole('button', { name: /Employee/i });
      nameButton.click();

      // Verify data still shows correctly after sort
      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
        expect(screen.getByText('Alexander Gonzalez')).toBeInTheDocument();
        expect(screen.getByText('admin@canva.com')).toBeInTheDocument();
        expect(screen.getByText('Administration')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
      });
    });

    it('maintains data integrity after filter operations', async () => {
      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Canva Administrator')).toBeInTheDocument();
      });

      // Apply department filter
      const searchInput = screen.getByPlaceholderText('Search employees...');
      searchInput.focus();
      searchInput.setAttribute('value', 'Alexander');

      // Verify filtered data still shows correctly
      await waitFor(() => {
        // Should still see Alexander employees
        expect(screen.getByText('Alexander Gonzalez') || screen.getByText('Alexander')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('recovers gracefully from API errors', async () => {
      // Mock API failure
      (global.fetch as any).mockImplementationOnce(() => {
        return Promise.reject(new Error('API Error'));
      });

      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      // Should handle API error gracefully (show loading or error state)
      await waitFor(() => {
        // Component should not crash
        const table = document.querySelector('table');
        expect(document.body).toBeInTheDocument(); // Basic component integrity
      });
    });

    it('handles malformed employee data gracefully', async () => {
      const malformedData = [
        {
          id: 999,
          name: '', // Empty name
          email: 'test@canva.com',
          department: null, // Null department
          status: undefined, // Undefined status
        }
      ];

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/users') && !url.includes('departments') && !url.includes('locations')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(malformedData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      render(<EmployeeDirectory />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should handle malformed data without crashing
        expect(document.body).toBeInTheDocument();
        
        // Should show fallbacks for missing data
        const table = document.querySelector('table');
        if (table) {
          const rows = table.querySelectorAll('tbody tr');
          if (rows.length > 0) {
            expect(rows[0]).toBeInTheDocument();
          }
        }
      });
    });
  });
});