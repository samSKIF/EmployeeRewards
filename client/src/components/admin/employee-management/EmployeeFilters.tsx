import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  
  const handleFilterChange = (key: keyof FiltersType, value: any) => {
    // Convert "all" back to empty string for filtering logic
    const processedValue = value === 'all' ? '' : value;
    onFiltersChange({
      ...filters,
      [key]: processedValue,
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
          placeholder={t('employeeManagement.searchEmployees')}
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500">{t('employeeManagement.filters')}:</span>
        </div>

        {/* Department Filter */}
        <Select 
          value={filters.department || 'all'} 
          onValueChange={(value) => handleFilterChange('department', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('employeeManagement.allDepartments')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('employeeManagement.allDepartments')}</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location Filter */}
        <Select 
          value={filters.location || 'all'} 
          onValueChange={(value) => handleFilterChange('location', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('employeeManagement.allLocations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('employeeManagement.allLocations')}</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select 
          value={filters.status || 'all'} 
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('employeeManagement.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('employeeManagement.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('employeeManagement.active')}</SelectItem>
            <SelectItem value="inactive">{t('employeeManagement.inactive')}</SelectItem>
            <SelectItem value="pending">{t('employeeManagement.pending')}</SelectItem>
            <SelectItem value="terminated">{t('employeeManagement.terminated')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Admin Filter */}
        <Select 
          value={filters.isAdmin === null ? 'all' : filters.isAdmin.toString()} 
          onValueChange={(value) => 
            handleFilterChange('isAdmin', value === 'all' ? null : value === 'true')
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('employeeManagement.allRoles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('employeeManagement.allRoles')}</SelectItem>
            <SelectItem value="true">{t('employeeManagement.adminsOnly')}</SelectItem>
            <SelectItem value="false">{t('employeeManagement.regularUsers')}</SelectItem>
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
            {t('employeeManagement.clearFilters')}
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>
          {t('employeeManagement.showingResults', { count: filteredCount, total: totalEmployees })}
        </span>
        
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {t('employeeManagement.filtersActive', { count: activeFilterCount })}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}