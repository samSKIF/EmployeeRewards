import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';
import { EmployeeFilters as FiltersType } from './types';

interface EmployeeFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  departments: string[];
  locations: string[];
  totalEmployees: number;
  filteredCount: number;
}

export function EmployeeFilters({
  filters,
  onFiltersChange,
  departments,
  locations,
  totalEmployees,
  filteredCount,
}: EmployeeFiltersProps) {
  const handleFilterChange = (key: keyof FiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      department: '',
      location: '',
      status: '',
      isAdmin: null,
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.department || 
    filters.location || 
    filters.status || 
    filters.isAdmin !== null;

  const activeFilterCount = [
    filters.search,
    filters.department,
    filters.location,
    filters.status,
    filters.isAdmin,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search employees by name, email, or username..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500">Filters:</span>
        </div>

        {/* Department Filter */}
        <Select 
          value={filters.department} 
          onValueChange={(value) => handleFilterChange('department', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location Filter */}
        <Select 
          value={filters.location} 
          onValueChange={(value) => handleFilterChange('location', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select 
          value={filters.status} 
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>

        {/* Admin Filter */}
        <Select 
          value={filters.isAdmin === null ? '' : filters.isAdmin.toString()} 
          onValueChange={(value) => 
            handleFilterChange('isAdmin', value === '' ? null : value === 'true')
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Roles</SelectItem>
            <SelectItem value="true">Admins Only</SelectItem>
            <SelectItem value="false">Regular Users</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>
          Showing {filteredCount} of {totalEmployees} employees
        </span>
        
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}