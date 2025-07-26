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
import { Search, Plus, Filter, Users, Download } from 'lucide-react';
import { formatDate } from 'date-fns';

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
}

interface EmployeeFilters {
  search: string;
  department: string;
  status: string;
  location: string;
}

export default function EmployeeDirectory() {
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: '',
    department: 'all',
    status: 'all',
    location: 'all',
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

  // Calculate stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === 'active').length;
  const totalDepartments = new Set(employees.map(emp => emp.department).filter(Boolean)).size;

  // Filter employees based on search and filters
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      employee.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      employee.jobTitle?.toLowerCase().includes(filters.search.toLowerCase()) ||
      employee.department?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesDepartment = 
      filters.department === 'all' || employee.department === filters.department;

    const matchesStatus = 
      filters.status === 'all' || employee.status === filters.status;

    const matchesLocation = 
      filters.location === 'all' || employee.location === filters.location;

    return matchesSearch && matchesDepartment && matchesStatus && matchesLocation;
  });

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
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900">{totalEmployees}</p>
              <p className="text-xs text-gray-500 mt-1">All employees in the system</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-full">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Employees</p>
              <p className="text-3xl font-bold text-gray-900">{activeEmployees}</p>
              <p className="text-xs text-gray-500 mt-1">Currently active team members</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-full">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-3xl font-bold text-gray-900">{totalDepartments}</p>
              <p className="text-xs text-gray-500 mt-1">Active departments</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-full">
              <Filter className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

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
          <h3 className="text-lg font-semibold text-gray-900">Employee List ({filteredEmployees.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-700">Employee</TableHead>
                <TableHead className="font-semibold text-gray-700">Job Title</TableHead>
                <TableHead className="font-semibold text-gray-700">Department</TableHead>
                <TableHead className="font-semibold text-gray-700">Location</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Hire Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.avatarUrl} />
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
                  <TableCell className="text-gray-900">{employee.jobTitle || '-'}</TableCell>
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
                    {employee.hireDate ? formatDate(new Date(employee.hireDate), 'MMM dd, yyyy') : '-'}
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