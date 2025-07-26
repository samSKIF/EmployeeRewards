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
    queryKey: ['/api/users', filters],
  });

  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/users/departments'],
  });

  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ['/api/users/locations'],
  });

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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Employee Directory</h1>
          <p className="text-muted-foreground">
            Manage your team members and their information
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/people/employee-onboarding">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployeeCount}</div>
            <p className="text-xs text-muted-foreground">
              All employees in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployeeCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently active team members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">
              Active departments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find specific employees or filter by criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.department}
              onValueChange={(value) => handleFilterChange('department', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.location}
              onValueChange={(value) => handleFilterChange('location', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatarUrl} />
                        <AvatarFallback>
                          {employee.name.charAt(0)}
                          {employee.surname?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {employee.name} {employee.surname}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.jobTitle || 'Not specified'}</TableCell>
                  <TableCell>{employee.department || 'Not assigned'}</TableCell>
                  <TableCell>{employee.location || 'Not specified'}</TableCell>
                  <TableCell>
                    <Badge
                      className={getStatusColor(employee.status)}
                      variant="secondary"
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.hireDate 
                      ? formatDate(new Date(employee.hireDate), 'MMM dd, yyyy')
                      : 'Not specified'
                    }
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/people/employee-profile/${employee.id}`}>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}