import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Filter, Users, Download, ArrowUpDown, ArrowUp, ArrowDown, Edit, MoreVertical, Building2, Settings, Upload, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { CreateEmployeeForm } from '@/components/admin/employee-management/CreateEmployeeForm';
import { EmployeeFormData } from '@/components/admin/employee-management/types';

interface Employee {
  id: number;
  name: string;
  surname?: string;
  email: string;
  jobTitle?: string;
  department?: string;
  status: string;
  avatarUrl?: string;
  hireDate?: string;
  location?: string;
  managerId?: number;
  managerEmail?: string;
  lastSeenAt?: string;
  job_title?: string;
  hire_date?: string;
  last_seen_at?: string;
  avatar_url?: string;
  phoneNumber?: string;
  phone_number?: string;
  birthDate?: string;
  birth_date?: string;
  nationality?: string;
  sex?: string;
  responsibilities?: string;
  aboutMe?: string;
  about_me?: string;
}

interface UpdateEmployeeData {
  name: string;
  surname?: string;
  email: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  status: string;
  hireDate?: string;
  birthDate?: string;
  managerEmail?: string;
  responsibilities?: string;
  aboutMe?: string;
  nationality?: string;
  sex?: string;
}

interface EmployeeFilters {
  search: string;
  department: string;
  status: string;
  location: string;
}

type SortField = 'name' | 'jobTitle' | 'department' | 'location' | 'status' | 'hireDate' | 'lastSeenAt';
type SortDirection = 'asc' | 'desc';

export default function EmployeeDirectory() {
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: '',
    department: 'all',
    status: 'all',
    location: 'all',
  });

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Debug dialog state
  useEffect(() => {
    console.log('Edit dialog state changed:', isEditDialogOpen);
  }, [isEditDialogOpen]);
  const [formData, setFormData] = useState<UpdateEmployeeData>({
    name: '',
    surname: '',
    email: '',
    phoneNumber: '',
    jobTitle: '',
    department: '',
    location: '',
    status: 'active',
    hireDate: '',
    birthDate: '',
    managerEmail: '',
    responsibilities: '',
    aboutMe: '',
    nationality: '',
    sex: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Edit employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: UpdateEmployeeData) => {
      if (!editingEmployee) throw new Error('No employee selected');
      const response = await fetch(`/api/users/${editingEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      setEditingEmployee(null);
      toast({
        title: 'Success',
        description: 'Employee updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee',
        variant: 'destructive',
      });
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/users/${employeeId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDeleteDialogOpen(false);
      setDeleteEmployee(null);
      toast({
        title: 'Success',
        description: 'Employee deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete employee',
        variant: 'destructive',
      });
    },
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const response = await apiRequest('POST', '/api/users', data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Employee created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create employee',
        variant: 'destructive',
      });
    },
  });

  // Handle creating employee
  const handleCreateEmployee = async (data: EmployeeFormData) => {
    await createEmployeeMutation.mutateAsync(data);
  };

  // Handle opening edit dialog
  const handleEditEmployee = (employee: Employee) => {
    try {
      const normalizedEmployee = normalizeEmployee(employee);
      setEditingEmployee(employee);
      
      // Robust location matching - handles case insensitivity, trimming, and fallbacks
      const employeeLocation = (normalizedEmployee.location || '').trim();
      let matchedLocation = employeeLocation;
      
      if (locations && locations.length > 0 && employeeLocation) {
        // Try exact match first
        const exactMatch = locations.find(loc => loc === employeeLocation);
        if (exactMatch) {
          matchedLocation = exactMatch;
        } else {
          // Try case-insensitive match
          const caseInsensitiveMatch = locations.find(loc => 
            loc.toLowerCase().trim() === employeeLocation.toLowerCase().trim()
          );
          if (caseInsensitiveMatch) {
            matchedLocation = caseInsensitiveMatch;
          }
          // If no match found, keep original value but log warning
          else if (employeeLocation) {
            console.warn(`Location "${employeeLocation}" not found in available locations:`, locations);
          }
        }
      }

      const formDataToSet = {
        name: normalizedEmployee.name || '',
        surname: normalizedEmployee.surname || '',
        email: normalizedEmployee.email || '',
        phoneNumber: normalizedEmployee.phoneNumber || normalizedEmployee.phone_number || '',
        jobTitle: normalizedEmployee.jobTitle || normalizedEmployee.job_title || '',
        department: normalizedEmployee.department || '',
        location: matchedLocation,
        status: normalizedEmployee.status || 'active',
        hireDate: normalizedEmployee.hireDate || normalizedEmployee.hire_date || '',
        birthDate: normalizedEmployee.birthDate || normalizedEmployee.birth_date || '',
        managerEmail: normalizedEmployee.managerEmail || '',
        nationality: normalizedEmployee.nationality || '',
        sex: normalizedEmployee.sex || '',
      };
      setFormData(formDataToSet);
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error opening edit dialog:', error);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof UpdateEmployeeData, value: string) => {
    // Convert UI values to database values
    let dbValue = value;
    if (value === 'none' || value === 'prefer_not_to_say') {
      dbValue = '';
    }
    
    setFormData(prev => ({ ...prev, [field]: dbValue }));
  };

  // Handle form submission
  const handleSaveEmployee = () => {
    updateEmployeeMutation.mutate(formData);
  };

  // Handle delete employee
  const handleDeleteEmployee = (employee: Employee) => {
    setDeleteEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (deleteEmployee) {
      deleteEmployeeMutation.mutate(deleteEmployee.id);
    }
  };

  // Sorting functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Helper function to normalize employee data
  const normalizeEmployee = (employee: Employee) => ({
    ...employee,
    jobTitle: employee.jobTitle || employee.job_title || '',
    hireDate: employee.hireDate || employee.hire_date,
    lastSeenAt: employee.lastSeenAt || employee.last_seen_at,
    avatarUrl: employee.avatarUrl || employee.avatar_url,
    phoneNumber: employee.phoneNumber || employee.phone_number || '',
    birthDate: employee.birthDate || employee.birth_date || '',
    aboutMe: employee.aboutMe || employee.about_me || '',
    managerEmail: employee.managerEmail || '',
  });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
  });

  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/users/departments'],
  });

  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ['/api/users/locations'],
  });

  // Get subscription information
  const { data: subscriptionInfo } = useQuery<{
    subscribed_users: number;
    current_usage: number;
    active_employees: number;
    total_employees: number;
    billable_users?: number;
  }>({
    queryKey: ['/api/admin/subscription/usage'],
  });

  // Calculate stats - Use API data for consistency, fallback to frontend calculation only if API unavailable
  const totalEmployees = subscriptionInfo?.total_employees || employees.length;
  const activeEmployees = subscriptionInfo?.active_employees || employees.filter(emp => emp.status === 'active').length;
  const totalDepartments = departments.length; // Use actual departments count, not employee departments
  const subscriptionLimit = subscriptionInfo?.subscribed_users || 500;
  const usagePercentage = subscriptionLimit > 0 ? Math.round((activeEmployees / subscriptionLimit) * 100) : 0;

  // Filter and sort employees
  const filteredAndSortedEmployees = (() => {
    // First normalize and filter
    const normalized = employees.map(normalizeEmployee);
    
    const filtered = normalized.filter((employee) => {
      const searchMatch = 
        employee.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        employee.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        (employee.surname && employee.surname.toLowerCase().includes(filters.search.toLowerCase())) ||
        (employee.jobTitle && employee.jobTitle.toLowerCase().includes(filters.search.toLowerCase())) ||
        (employee.department && employee.department.toLowerCase().includes(filters.search.toLowerCase()));

      const departmentMatch = filters.department === 'all' || employee.department === filters.department;
      const statusMatch = filters.status === 'all' || employee.status === filters.status;
      const locationMatch = filters.location === 'all' || employee.location === filters.location;

      return searchMatch && departmentMatch && statusMatch && locationMatch;
    });

    // Then sort
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'jobTitle':
          aValue = a.jobTitle || '';
          bValue = b.jobTitle || '';
          break;
        case 'department':
          aValue = a.department || '';
          bValue = b.department || '';
          break;
        case 'location':
          aValue = a.location || '';
          bValue = b.location || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'hireDate':
          aValue = a.hireDate ? new Date(a.hireDate).getTime() : 0;
          bValue = b.hireDate ? new Date(b.hireDate).getTime() : 0;
          break;
        case 'lastSeenAt':
          aValue = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
          bValue = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  })();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFilterChange = (key: keyof EmployeeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    console.log('Exporting employee data...');
  };

  // Remove duplicate calculations - use API-consistent values throughout
  // const activeEmployeeCount = employees.filter(emp => emp.status === 'active').length;
  // const totalEmployeeCount = employees.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" data-testid="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
        <p className="text-gray-600 text-base">Manage your team members and their information</p>
        <div className="flex gap-3">
          <Button onClick={handleExport} variant="outline" className="border-2 border-gray-300 hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/employees/mass-upload">
            <Button variant="outline" className="border-2 border-green-300 text-green-700 hover:bg-green-50">
              <Upload className="h-4 w-4 mr-2" />
              Mass Upload
            </Button>
          </Link>
          <Link href="/admin/settings/departments">
            <Button variant="outline" className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50">
              <Building2 className="h-4 w-4 mr-2" />
              Manage Departments
            </Button>
          </Link>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Department Quick Info */}
      {totalDepartments === 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">No Departments Set Up</h3>
                  <p className="text-sm text-gray-600">Create departments to organize your team members</p>
                </div>
              </div>
              <Link href="/admin/settings/departments">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Departments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="text-3xl font-bold text-gray-900">{subscriptionInfo?.total_employees || totalEmployees}</p>
              <p className="text-xs text-gray-500 mt-1">
                {subscriptionInfo?.active_employees || activeEmployees} active • {(subscriptionInfo?.total_employees || totalEmployees) - (subscriptionInfo?.active_employees || activeEmployees)} pending • {subscriptionInfo?.total_employees || totalEmployees} total
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Users className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Subscription Usage Card - Enhanced */}
        <div className="bg-white rounded-lg p-6 border shadow-sm col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Subscription Usage</p>
              <p className="text-2xl font-bold text-gray-900">{subscriptionInfo?.total_employees || activeEmployees}/{subscriptionLimit}</p>
              <p className="text-xs text-gray-500 mt-1">{Math.round(((subscriptionInfo?.total_employees || activeEmployees) / subscriptionLimit) * 100)}% capacity used • {subscriptionLimit - (subscriptionInfo?.total_employees || activeEmployees)} seats available</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{totalDepartments}</p>
              </div>
              <div className={`p-3 rounded-full ${Math.round(((subscriptionInfo?.total_employees || activeEmployees) / subscriptionLimit) * 100) > 90 ? 'bg-red-50' : Math.round(((subscriptionInfo?.total_employees || activeEmployees) / subscriptionLimit) * 100) > 75 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                <Users className={`h-6 w-6 ${Math.round(((subscriptionInfo?.total_employees || activeEmployees) / subscriptionLimit) * 100) > 90 ? 'text-red-500' : Math.round(((subscriptionInfo?.total_employees || activeEmployees) / subscriptionLimit) * 100) > 75 ? 'text-yellow-500' : 'text-green-500'}`} />
              </div>
            </div>
          </div>
          {/* Usage Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                usagePercentage > 90 ? 'bg-red-500' : 
                usagePercentage > 75 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Active employees using subscription seats</span>
            <span>{100 - usagePercentage}% capacity remaining</span>
          </div>
        </div>
      </div>

      {/* Usage Alert */}
      {usagePercentage >= 90 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-400 mr-3">⚠️</div>
            <div>
              <h4 className="text-yellow-800 font-medium">Subscription Usage Notice</h4>
              <p className="text-yellow-700 text-sm">
                You're using {usagePercentage}% of your subscription capacity ({activeEmployees}/{subscriptionLimit}). You have {subscriptionLimit - activeEmployees} employee slots remaining.
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Search & Filter Section */}
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
          <p className="text-sm text-gray-600">Find specific employees or filter by criteria</p>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Employee List ({filteredAndSortedEmployees.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-700">
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                  >
                    Employee
                    {getSortIcon('name')}
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <button 
                    onClick={() => handleSort('jobTitle')}
                    className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                  >
                    Job Title
                    {getSortIcon('jobTitle')}
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <button 
                    onClick={() => handleSort('department')}
                    className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                  >
                    Department
                    {getSortIcon('department')}
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <button 
                    onClick={() => handleSort('location')}
                    className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                  >
                    Location
                    {getSortIcon('location')}
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                  >
                    Status
                    {getSortIcon('status')}
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <button 
                    onClick={() => handleSort('hireDate')}
                    className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                  >
                    Hire Date
                    {getSortIcon('hireDate')}
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <button 
                    onClick={() => handleSort('lastSeenAt')}
                    className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                  >
                    Last Connected
                    {getSortIcon('lastSeenAt')}
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.avatarUrl || employee.avatar_url} />
                        <AvatarFallback className="bg-teal-100 text-teal-600 font-medium">
                          {employee.name?.substring(0, 2)?.toUpperCase() || 'NA'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">
                          {employee.name} {employee.surname || ''}
                        </p>
                        <p className="text-sm text-gray-500">{employee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {employee.jobTitle || employee.job_title || '-'}
                  </TableCell>
                  <TableCell className="text-gray-900">{employee.department || '-'}</TableCell>
                  <TableCell className="text-gray-900">{employee.location || '-'}</TableCell>
                  <TableCell>
                    <Badge 
                      className={`${getStatusColor(employee.status)} border-0 text-xs font-medium px-2 py-1`}
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {employee.hireDate || employee.hire_date ? 
                      formatDate(new Date(employee.hireDate || employee.hire_date!), 'MMM dd, yyyy') : 
                      '-'
                    }
                  </TableCell>
                  <TableCell className="text-gray-900 text-sm">
                    {employee.lastSeenAt || employee.last_seen_at ? 
                      formatDistanceToNow(new Date(employee.lastSeenAt || employee.last_seen_at!), { addSuffix: true }) : 
                      'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/people/employee-profile/${employee.id}`}>
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Employee
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteEmployee(employee)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">First Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="First name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="surname">Last Name</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => handleInputChange('surname', e.target.value)}
                placeholder="Last name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                placeholder="Software Engineer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department || 'none'} onValueChange={(value) => handleInputChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={formData.location || 'none'} onValueChange={(value) => handleInputChange('location', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Location</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={(e) => handleInputChange('hireDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerEmail">Manager Email</Label>
              <Input
                id="managerEmail"
                type="email"
                value={formData.managerEmail}
                onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                placeholder="manager@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
                placeholder="e.g., American"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">Gender</Label>
              <Select value={formData.sex || 'prefer_not_to_say'} onValueChange={(value) => handleInputChange('sex', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>


          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateEmployeeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmployee}
              disabled={updateEmployeeMutation.isPending}
            >
              {updateEmployeeMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteEmployee?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteEmployeeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Employee Form */}
      <CreateEmployeeForm
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateEmployee}
        departments={departments}
        locations={locations}
        isLoading={createEmployeeMutation.isPending}
      />
    </div>
  );
}