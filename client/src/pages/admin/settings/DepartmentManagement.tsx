import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, MoreVertical, Building2, ArrowLeft, ChevronRight, Home, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Department {
  id: number;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
  employee_count?: number;
}

const DEPARTMENT_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16'
];

export default function DepartmentManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#6B7280',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch employees (same as Employee Directory)
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Fetch departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/departments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch departments:', response.status, response.statusText);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/departments', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Department created successfully' });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchDepartments(); // Refresh the departments list
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create department',
        variant: 'destructive',
      });
    },
  });

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/departments/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Department updated successfully' });
      setIsEditDialogOpen(false);
      setEditingDepartment(null);
      resetForm();
      fetchDepartments(); // Refresh the departments list
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update department',
        variant: 'destructive',
      });
    },
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/departments/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Department deleted successfully' });
      fetchDepartments(); // Refresh the departments list
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete department',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#6B7280',
    });
  };

  const handleCreateDepartment = () => {
    setIsCreateDialogOpen(true);
    resetForm();
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      color: department.color,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    const submitData = {
      name: formData.name,
      color: formData.color,
    };
    createDepartmentMutation.mutate(submitData);
  };

  const handleSubmitEdit = () => {
    if (!editingDepartment) return;

    const submitData = {
      name: formData.name,
      color: formData.color,
    };
    updateDepartmentMutation.mutate({ id: editingDepartment.id, data: submitData });
  };

  const handleDeleteDepartment = (department: Department) => {
    if (window.confirm(`Are you sure you want to delete the "${department.name}" department? This action cannot be undone.`)) {
      deleteDepartmentMutation.mutate(department.id);
    }
  };

  // Calculate stats (same logic as Employee Directory)
  const totalEmployees = employees.length; // Use actual employee count like Employee Directory
  const activeDepartments = departments.filter(dept => dept.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <Link href="/admin/people" className="flex items-center hover:text-blue-600 transition-colors">
          <Users className="h-4 w-4 mr-1" />
          Employee Directory
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Department Management</span>
      </div>

      {/* Enhanced Header with Back Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/admin/people">
            <Button variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employees
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
            <p className="text-gray-600">Organize your workforce by departments and manage organizational structure</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/people/mass-upload">
            <Button variant="outline" className="border-2 border-green-300 text-green-700 hover:bg-green-50">
              <Upload className="h-4 w-4 mr-2" />
              Mass Upload
            </Button>
          </Link>
          <Button 
            onClick={handleCreateDepartment} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 shadow-lg"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Department
          </Button>
        </div>
      </div>



      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Departments</p>
                <p className="text-2xl font-bold">{departments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Departments</p>
                <p className="text-2xl font-bold">{activeDepartments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Empty State */}
      {departments.length === 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <Building2 className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Departments Yet</h3>
            <p className="text-gray-600 mb-6">Start organizing your company by creating your first department</p>
            <Button 
              onClick={handleCreateDepartment} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Department
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Departments Table */}
      {departments.length > 0 && (
        <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Manage and organize your company departments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: department.color }}
                      />
                      <span className="font-medium">{department.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    No manager assigned
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {employees.filter(emp => emp.department === department.name && emp.status === 'active').length} employees
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={department.is_active ? "default" : "secondary"}>
                      {department.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditDepartment(department)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteDepartment(department)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {departments.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first department</p>
              <Button onClick={handleCreateDepartment}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>
          )}
        </CardContent>
        </Card>
      )}

      {/* Create Department Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>
              Add a new department to your organization structure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Engineering, Marketing, Sales"
              />
            </div>





            <div>
              <Label htmlFor="color">Department Color</Label>
              <div className="flex gap-2 mt-2">
                {DEPARTMENT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitCreate}
              disabled={!formData.name || createDepartmentMutation.isPending}
            >
              {createDepartmentMutation.isPending ? 'Creating...' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Modify department information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Engineering, Marketing, Sales"
              />
            </div>





            <div>
              <Label htmlFor="edit-color">Department Color</Label>
              <div className="flex gap-2 mt-2">
                {DEPARTMENT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEdit}
              disabled={!formData.name || updateDepartmentMutation.isPending}
            >
              {updateDepartmentMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}