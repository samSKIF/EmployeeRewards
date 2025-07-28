import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Search, Plus, Filter, Users, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDate, formatDistanceToNow } from 'date-fns';

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
  }>({
    queryKey: ['/api/admin/subscription/usage'],
  });

  // Calculate stats
  const totalEmployees = subscriptionInfo?.total_employees || employees.length;
  const activeEmployees = subscriptionInfo?.active_employees || employees.filter(emp => emp.status === 'active').length;
  const totalDepartments = new Set(employees.map(emp => emp.department).filter(Boolean)).size;
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

  const activeEmployeeCount = employees.filter(emp => emp.status === 'active').length;
  const totalEmployeeCount = employees.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <Button onClick={handleExport} variant="outline" className="border-2 border-gray-300">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="text-3xl font-bold text-gray-900">{activeEmployees}</p>
              <p className="text-xs text-gray-500 mt-1">
                {activeEmployees} active • {totalEmployees - activeEmployees} inactive • {totalEmployees} total
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
              <p className="text-2xl font-bold text-gray-900">{activeEmployees}/{subscriptionLimit}</p>
              <p className="text-xs text-gray-500 mt-1">{usagePercentage}% capacity used • {subscriptionLimit - activeEmployees} seats available</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{totalDepartments}</p>
              </div>
              <div className={`p-3 rounded-full ${usagePercentage > 90 ? 'bg-red-50' : usagePercentage > 75 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                <Users className={`h-6 w-6 ${usagePercentage > 90 ? 'text-red-500' : usagePercentage > 75 ? 'text-yellow-500' : 'text-green-500'}`} />
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
                      formatDate(new Date(employee.hireDate || employee.hire_date), 'MMM dd, yyyy') : 
                      '-'
                    }
                  </TableCell>
                  <TableCell className="text-gray-900 text-sm">
                    {employee.lastSeenAt || employee.last_seen_at ? 
                      formatDistanceToNow(new Date(employee.lastSeenAt || employee.last_seen_at), { addSuffix: true }) : 
                      'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="text-xs">
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}