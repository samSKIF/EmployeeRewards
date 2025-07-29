import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Users,
  Trash2,
  UserX,
  UserCheck,
  Download,
  Upload,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'wouter';
import BulkUploadWithApproval from '@/components/admin/employee-management/BulkUploadWithApproval';

interface Employee {
  id: number;
  name: string;
  surname?: string;
  email: string;
  jobTitle?: string;
  department?: string;
  status: string;
  avatarUrl?: string;
  location?: string;
}

interface BulkAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  action: 'activate' | 'deactivate' | 'terminate' | 'delete' | 'export';
  requiresConfirmation: boolean;
  destructive?: boolean;
}

const bulkActions: BulkAction[] = [
  {
    id: 'activate',
    label: 'Activate Employees',
    description: 'Set selected employees to active status',
    icon: UserCheck,
    action: 'activate',
    requiresConfirmation: false,
  },
  {
    id: 'deactivate',
    label: 'Deactivate Employees',
    description: 'Set selected employees to inactive status',
    icon: UserX,
    action: 'deactivate',
    requiresConfirmation: true,
  },
  {
    id: 'terminate',
    label: 'Terminate Employees',
    description: 'Mark selected employees as terminated',
    icon: UserX,
    action: 'terminate',
    requiresConfirmation: true,
    destructive: true,
  },
  {
    id: 'delete',
    label: 'Delete Employees',
    description: 'Permanently remove selected employees',
    icon: Trash2,
    action: 'delete',
    requiresConfirmation: true,
    destructive: true,
  },
  {
    id: 'export',
    label: 'Export Selected',
    description: 'Download data for selected employees',
    icon: Download,
    action: 'export',
    requiresConfirmation: false,
  },
];

export default function EmployeeBulkActions() {
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
  });

  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/users/departments'],
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ action, employeeIds }: { action: string; employeeIds: number[] }) => {
      return await apiRequest('/api/admin/users/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ action, employeeIds }),
      });
    },
    onSuccess: (_, variables) => {
      const actionLabels = {
        activate: 'activated',
        deactivate: 'deactivated',
        terminate: 'terminated',
        delete: 'deleted',
      };
      
      toast({
        title: 'Success',
        description: `${variables.employeeIds.length} employees ${actionLabels[variables.action as keyof typeof actionLabels]}`,
      });
      
      setSelectedEmployees([]);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform bulk action',
        variant: 'destructive',
      });
    },
  });

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const handleSelectEmployee = (employeeId: number) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedEmployees.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one employee',
        variant: 'destructive',
      });
      return;
    }

    if (action === 'export') {
      // Handle export logic
      const selectedData = filteredEmployees.filter(emp => 
        selectedEmployees.includes(emp.id)
      );
      
      const csv = [
        'Name,Email,Job Title,Department,Status',
        ...selectedData.map(emp => 
          `"${emp.name} ${emp.surname || ''}","${emp.email}","${emp.jobTitle || ''}","${emp.department || ''}","${emp.status}"`
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: `${selectedEmployees.length} employee records exported`,
      });
      return;
    }

    bulkUpdateMutation.mutate({ action, employeeIds: selectedEmployees });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isAllSelected = selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0;
  const isPartiallySelected = selectedEmployees.length > 0 && selectedEmployees.length < filteredEmployees.length;

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/employees">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Employee Bulk Operations</h1>
            <p className="text-muted-foreground">
              Upload new employees or perform bulk actions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'bulk-upload' ? 'default' : 'outline'}
            onClick={() => setActiveTab('bulk-upload')}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button
            variant={activeTab === 'bulk-actions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('bulk-actions')}
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Actions
          </Button>
        </div>
      </div>

      {/* Bulk Upload Tab */}
      {activeTab === 'bulk-upload' && (
        <BulkUploadWithApproval onUploadComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        }} />
      )}

      {/* Bulk Actions Tab */}
      {activeTab === 'bulk-actions' && (
        <>
          <div>
            <h2 className="text-xl font-semibold mb-4">Bulk Employee Actions</h2>
            <p className="text-muted-foreground mb-6">
              Select employees and perform actions on multiple employees at once
            </p>
          </div>

      {/* Selection Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selection Summary
          </CardTitle>
          <CardDescription>
            {selectedEmployees.length} of {filteredEmployees.length} employees selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {bulkActions.map((action) => {
              const IconComponent = action.icon;
              const ActionButton = (
                <Button
                  key={action.id}
                  variant={action.destructive ? "destructive" : "outline"}
                  disabled={selectedEmployees.length === 0 || bulkUpdateMutation.isPending}
                  onClick={() => handleBulkAction(action.action)}
                  className="flex items-center gap-2"
                >
                  <IconComponent className="h-4 w-4" />
                  {action.label}
                </Button>
              );

              if (action.requiresConfirmation) {
                return (
                  <AlertDialog key={action.id}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant={action.destructive ? "destructive" : "outline"}
                        disabled={selectedEmployees.length === 0 || bulkUpdateMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <IconComponent className="h-4 w-4" />
                        {action.label}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm {action.label}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {action.description} for {selectedEmployees.length} selected employees. 
                          {action.destructive && " This action cannot be undone."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleBulkAction(action.action)}
                          className={action.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                        >
                          Confirm {action.label}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                );
              }

              return ActionButton;
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Employees</CardTitle>
          <CardDescription>
            Use filters to find specific employees for bulk actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by department" />
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
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List ({filteredEmployees.length})</CardTitle>
          <CardDescription>
            Select employees to perform bulk actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8 w-8 p-0"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : isPartiallySelected ? (
                      <div className="h-4 w-4 bg-primary rounded-sm flex items-center justify-center">
                        <div className="h-2 w-2 bg-white rounded-sm" />
                      </div>
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => handleSelectEmployee(employee.id)}
                    />
                  </TableCell>
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
                  <TableCell>
                    <Badge
                      className={getStatusColor(employee.status)}
                      variant="secondary"
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{employee.location || 'Not specified'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Actions Help</CardTitle>
          <CardDescription>
            Understanding the available bulk operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bulkActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <div key={action.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <IconComponent className={`h-5 w-5 mt-0.5 ${action.destructive ? 'text-red-500' : 'text-blue-500'}`} />
                    <div>
                      <h4 className="font-medium">{action.label}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                      {action.destructive && (
                        <p className="text-xs text-red-600 mt-1">⚠️ This action is permanent</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Tips for Bulk Actions</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use filters to narrow down to specific groups of employees</li>
                <li>• Select all employees with the checkbox in the header</li>
                <li>• Export functionality creates a CSV file with selected employee data</li>
                <li>• Destructive actions (terminate, delete) require confirmation</li>
                <li>• Status changes are applied immediately to all selected employees</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}