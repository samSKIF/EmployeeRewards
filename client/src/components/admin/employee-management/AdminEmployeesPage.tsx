import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

import { EmployeeFilters } from './EmployeeFilters';
import { EmployeeList } from './EmployeeList';
import { BulkActions } from './BulkActions';
import { CreateEmployeeForm } from './CreateEmployeeForm';
import { Employee, EmployeeFormData, BulkAction, EmployeeFilters as FiltersType } from './types';

export function AdminEmployeesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<FiltersType>({
    search: '',
    department: '',
    location: '',
    status: '',
    isAdmin: null,
  });

  // Data fetching
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
  });

  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/departments'],
  });

  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ['/api/locations'],
  });

  // Mutations
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: EmployeeFormData) => {
      return apiRequest('POST', '/api/users', employeeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: t('employeeManagement.success'),
        description: t('employeeManagement.employeeCreatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('employeeManagement.error'),
        description: error.message || t('employeeManagement.failedToCreateEmployee'),
        variant: 'destructive',
      });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async (action: BulkAction) => {
      switch (action.type) {
        case 'delete':
          return apiRequest('DELETE', '/api/users/bulk', { ids: action.employeeIds });
        case 'updateStatus':
          return apiRequest('PUT', '/api/users/bulk/status', { 
            ids: action.employeeIds, 
            status: action.value 
          });
        case 'updateDepartment':
          return apiRequest('PUT', '/api/users/bulk/department', { 
            ids: action.employeeIds, 
            department: action.value 
          });
        case 'export':
          // Handle export logic
          const employeeData = selectedEmployees.map(emp => ({
            name: `${emp.name} ${emp.surname}`,
            email: emp.email,
            department: emp.department,
            location: emp.location,
            status: emp.status,
            hireDate: emp.hireDate,
          }));
          
          const csv = [
            [
              t('employeeManagement.csvHeaders.name'), 
              t('employeeManagement.csvHeaders.email'), 
              t('employeeManagement.csvHeaders.department'), 
              t('employeeManagement.csvHeaders.location'), 
              t('employeeManagement.csvHeaders.status'), 
              t('employeeManagement.csvHeaders.hireDate')
            ],
            ...employeeData.map(emp => Object.values(emp))
          ].map(row => row.join(',')).join('\n');
          
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'employees.csv';
          a.click();
          window.URL.revokeObjectURL(url);
          return Promise.resolve();
        default:
          throw new Error('Unknown action type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setSelectedEmployees([]);
      toast({
        title: t('employeeManagement.success'),
        description: t('employeeManagement.bulkActionCompleted'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('employeeManagement.error'),
        description: error.message || t('employeeManagement.failedToBulkAction'),
        variant: 'destructive',
      });
    },
  });

  // Filter employees based on current filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee: Employee) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          employee.name?.toLowerCase().includes(searchTerm) ||
          employee.surname?.toLowerCase().includes(searchTerm) ||
          employee.email?.toLowerCase().includes(searchTerm) ||
          employee.username?.toLowerCase().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // Department filter
      if (filters.department && employee.department !== filters.department) {
        return false;
      }

      // Location filter
      if (filters.location && employee.location !== filters.location) {
        return false;
      }

      // Status filter
      if (filters.status && employee.status !== filters.status) {
        return false;
      }

      // Admin filter
      if (filters.isAdmin !== null && employee.isAdmin !== filters.isAdmin) {
        return false;
      }

      return true;
    });
  }, [employees, filters]);

  // Event handlers
  const handleEmployeeSelect = (employee: Employee, selected: boolean) => {
    if (selected) {
      setSelectedEmployees(prev => [...prev, employee]);
    } else {
      setSelectedEmployees(prev => prev.filter(emp => emp.id !== employee.id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedEmployees(filteredEmployees);
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    // Navigate to edit page or open edit modal
    toast({
      title: t('employeeManagement.editEmployee'),
      description: t('employeeManagement.editEmployeeDescription', { name: `${employee.name} ${employee.surname}` }),
    });
  };

  const handleDeleteEmployee = (employee: Employee) => {
    // Handle single employee deletion
    bulkActionMutation.mutate({
      type: 'delete',
      employeeIds: [employee.id],
    });
  };

  const handleViewProfile = (employee: Employee) => {
    // Handle profile view
    console.log('Viewing profile for:', employee);
  };

  const handleCreateEmployee = async (formData: EmployeeFormData) => {
    await createEmployeeMutation.mutateAsync(formData);
  };

  const handleBulkAction = async (action: BulkAction) => {
    await bulkActionMutation.mutateAsync(action);
  };

  const handleClearSelection = () => {
    setSelectedEmployees([]);
  };

  // Get unique values for filters
  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(employees.map((emp: Employee) => emp.department).filter((dept): dept is string => Boolean(dept))));
  }, [employees]);

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(employees.map((emp: Employee) => emp.location).filter((loc): loc is string => Boolean(loc))));
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('employeeManagement.title')}</h1>
          <p className="text-gray-600">{t('employeeManagement.subtitle')}</p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('employeeManagement.importCSV')}
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('employeeManagement.addEmployee')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('employeeManagement.totalEmployees')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{employees.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('employeeManagement.active')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-2xl font-bold">
                {employees.filter((emp: Employee) => emp.status === 'active').length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('employeeManagement.departments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{uniqueDepartments.length}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{t('employeeManagement.locations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{uniqueLocations.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t('employeeManagement.teamMembers')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <EmployeeFilters
            filters={filters}
            onFiltersChange={setFilters}
            departments={uniqueDepartments}
            locations={uniqueLocations}
            totalEmployees={employees.length}
            filteredCount={filteredEmployees.length}
          />

          {/* Bulk Actions */}
          <BulkActions
            selectedEmployees={selectedEmployees}
            onBulkAction={handleBulkAction}
            onClearSelection={handleClearSelection}
            departments={uniqueDepartments}
            isLoading={bulkActionMutation.isPending}
          />

          {/* Employee List */}
          <EmployeeList
            employees={filteredEmployees}
            selectedEmployees={selectedEmployees}
            onEmployeeSelect={handleEmployeeSelect}
            onSelectAll={handleSelectAll}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onViewProfile={handleViewProfile}
            isLoading={employeesLoading}
          />
        </CardContent>
      </Card>

      {/* Create Employee Form */}
      <CreateEmployeeForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateEmployee}
        departments={departments}
        locations={locations}
        isLoading={createEmployeeMutation.isPending}
      />
    </div>
  );
}