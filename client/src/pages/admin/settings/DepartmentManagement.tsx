import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Plus, Edit, Trash2, Users, MoreVertical, Building2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Department {
  id: number;
  name: string;
  description: string | null;
  manager_id: number | null;
  color: string;
  is_active: boolean;
  created_at: string;
  employee_count?: number;
  manager_name?: string;
}

interface Employee {
  id: number;
  name: string;
  surname: string;
  email: string;
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
    description: '',
    manager_id: '',
    color: '#6B7280',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch departments
  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ['/api/admin/departments'],
  });

  // Fetch employees for manager selection
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
  });

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/departments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Department created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/departments'] });
      setIsCreateDialogOpen(false);
      resetForm();
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
      return apiRequest(`/api/admin/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Department updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/departments'] });
      setIsEditDialogOpen(false);
      setEditingDepartment(null);
      resetForm();
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
      return apiRequest(`/api/admin/departments/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Department deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/departments'] });
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
      description: '',
      manager_id: '',
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
      description: department.description || '',
      manager_id: department.manager_id?.toString() || '',
      color: department.color,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    const submitData = {
      name: formData.name,
      description: formData.description || null,
      manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
      color: formData.color,
    };
    createDepartmentMutation.mutate(submitData);
  };

  const handleSubmitEdit = () => {
    if (!editingDepartment) return;
    
    const submitData = {
      name: formData.name,
      description: formData.description || null,
      manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
      color: formData.color,
    };
    updateDepartmentMutation.mutate({ id: editingDepartment.id, data: submitData });
  };

  const handleDeleteDepartment = (department: Department) => {
    if (window.confirm(`Are you sure you want to delete the "${department.name}" department? This action cannot be undone.`)) {
      deleteDepartmentMutation.mutate(department.id);
    }
  };

  const totalEmployees = departments.reduce((sum, dept) => sum + (dept.employee_count || 0), 0);
  const activeDepartments = departments.filter(dept => dept.is_active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-600">Manage your organization's departments and structure</p>
        </div>
        <Button onClick={handleCreateDepartment} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
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

      {/* Departments Table */}
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
                <TableHead>Description</TableHead>
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
                  <TableCell className="max-w-xs">
                    <span className="text-sm text-gray-600">
                      {department.description || 'No description'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {department.manager_name || 'No manager assigned'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {department.employee_count || 0} employees
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the department"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="manager">Department Manager</Label>
              <Select 
                value={formData.manager_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, manager_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No manager</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name} {employee.surname} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the department"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-manager">Department Manager</Label>
              <Select 
                value={formData.manager_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, manager_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No manager</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name} {employee.surname} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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