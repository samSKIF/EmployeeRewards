import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmployeeFilters } from './EmployeeFilters';
import { EmployeeFilters as FiltersType } from './types';

const mockFilters: FiltersType = {
  search: '',
  department: '',
  location: '',
  status: '',
  isAdmin: null,
};

const mockDepartments = ['Engineering', 'Marketing', 'Sales'];
const mockLocations = ['New York', 'London', 'Tokyo'];

const defaultProps = {
  filters: mockFilters,
  onFiltersChange: vi.fn(),
  departments: mockDepartments,
  locations: mockLocations,
  totalEmployees: 100,
  filteredCount: 100,
};

describe('EmployeeFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<EmployeeFilters {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search employees by name, email, or username...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render all filter selects', () => {
      render(<EmployeeFilters {...defaultProps} />);
      
      expect(screen.getByText('All Departments')).toBeInTheDocument();
      expect(screen.getByText('All Locations')).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
      expect(screen.getByText('All Roles')).toBeInTheDocument();
    });

    it('should show employee count', () => {
      render(<EmployeeFilters {...defaultProps} />);
      
      expect(screen.getByText('Showing 100 of 100 employees')).toBeInTheDocument();
    });

    it('should not show clear filters button when no filters are active', () => {
      render(<EmployeeFilters {...defaultProps} />);
      
      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onFiltersChange when search input changes', () => {
      const onFiltersChange = vi.fn();
      render(<EmployeeFilters {...defaultProps} onFiltersChange={onFiltersChange} />);
      
      const searchInput = screen.getByPlaceholderText('Search employees by name, email, or username...');
      fireEvent.change(searchInput, { target: { value: 'john' } });
      
      expect(onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        search: 'john',
      });
    });

    it('should show clear filters button when filters are active', () => {
      const filtersWithSearch = { ...mockFilters, search: 'john' };
      render(<EmployeeFilters {...defaultProps} filters={filtersWithSearch} />);
      
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('should clear all filters when clear button is clicked', () => {
      const onFiltersChange = vi.fn();
      const filtersWithData = {
        search: 'john',
        department: 'Engineering',
        location: 'New York',
        status: 'active',
        isAdmin: true,
      };
      
      render(
        <EmployeeFilters 
          {...defaultProps} 
          filters={filtersWithData} 
          onFiltersChange={onFiltersChange} 
        />
      );
      
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      expect(onFiltersChange).toHaveBeenCalledWith({
        search: '',
        department: '',
        location: '',
        status: '',
        isAdmin: null,
      });
    });

    it('should show filtered count correctly', () => {
      render(<EmployeeFilters {...defaultProps} filteredCount={25} />);
      
      expect(screen.getByText('Showing 25 of 100 employees')).toBeInTheDocument();
    });
  });

  describe('Filter States', () => {
    it('should show active filter count badge', () => {
      const filtersWithMultiple = {
        search: 'john',
        department: 'Engineering',
        location: '',
        status: 'active',
        isAdmin: null,
      };
      
      render(<EmployeeFilters {...defaultProps} filters={filtersWithMultiple} />);
      
      expect(screen.getByText('3 filters active')).toBeInTheDocument();
    });

    it('should show singular filter text for one filter', () => {
      const filtersWithOne = {
        search: 'john',
        department: '',
        location: '',
        status: '',
        isAdmin: null,
      };
      
      render(<EmployeeFilters {...defaultProps} filters={filtersWithOne} />);
      
      expect(screen.getByText('1 filter active')).toBeInTheDocument();
    });

    it('should render with pre-selected filter values', () => {
      const filtersWithValues = {
        search: 'john doe',
        department: 'Engineering',
        location: 'New York',
        status: 'active',
        isAdmin: true,
      };
      
      render(<EmployeeFilters {...defaultProps} filters={filtersWithValues} />);
      
      const searchInput = screen.getByDisplayValue('john doe');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty departments list', () => {
      render(<EmployeeFilters {...defaultProps} departments={[]} />);
      
      expect(screen.getByText('All Departments')).toBeInTheDocument();
    });

    it('should handle empty locations list', () => {
      render(<EmployeeFilters {...defaultProps} locations={[]} />);
      
      expect(screen.getByText('All Locations')).toBeInTheDocument();
    });

    it('should handle zero employee counts', () => {
      render(<EmployeeFilters {...defaultProps} totalEmployees={0} filteredCount={0} />);
      
      expect(screen.getByText('Showing 0 of 0 employees')).toBeInTheDocument();
    });

    it('should handle isAdmin filter correctly', () => {
      const onFiltersChange = vi.fn();
      render(<EmployeeFilters {...defaultProps} onFiltersChange={onFiltersChange} />);
      
      // This test would need to interact with the Select component
      // Implementation depends on your Select component's test interface
    });
  });
});