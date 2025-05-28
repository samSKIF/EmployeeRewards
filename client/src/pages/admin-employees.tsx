import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, User, UserPlus, FileText, Trash, PenSquare, Upload } from "lucide-react";
import { format } from "date-fns";

// Define employee form data type
interface EmployeeFormData {
  password: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  jobTitle: string;
  department: string;
  location: string;
  managerEmail: string;
  sex: string;
  nationality: string;
  birthDate: string;
  hireDate: string;
  isAdmin: boolean;
  status: string;
  avatarUrl: string;
}

// Define our user type
interface Employee {
  id: number;
  name: string;
  surname: string | null;
  email: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  managerEmail: string | null;
  sex: string | null;
  nationality: string | null;
  birthDate: string | null;
  hireDate: string | null;
  isAdmin: boolean;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
}

const defaultEmployeeFormData: EmployeeFormData = {
  password: "changeme123",
  name: "",
  surname: "",
  email: "",
  phoneNumber: "",
  jobTitle: "",
  department: "",
  location: "",
  managerEmail: "",
  sex: "",
  nationality: "",
  birthDate: "",
  hireDate: "",
  isAdmin: false,
  status: "active",
  avatarUrl: ""
};

export default function AdminEmployeesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(defaultEmployeeFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);

  // Download template function
  const downloadTemplate = () => {
    // Get Firebase token first, then fallback to JWT token (matching queryClient.ts approach)
    const firebaseToken = localStorage.getItem("firebaseToken");
    const jwtToken = localStorage.getItem("token");
    const token = firebaseToken || jwtToken;
    
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "You need to be logged in to download the template",
        variant: "destructive"
      });
      return;
    }
    
    // Use direct window location navigation for the download
    window.location.href = `/api/file-templates/employee_import/download?token=${token}`;
    
    // Show success message
    toast({
      title: "Template Downloading",
      description: "Employee template is being downloaded to your device"
    });
  };

  // Fetch employees
  const { data: employees, isLoading } = useQuery({
    queryKey: ['/api/admin/employees'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/employees');
      return await response.json() as Employee[];
    }
  });

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      // Generate a username from the email address (take everything before the @ symbol)
      const emailParts = data.email.split('@');
      const baseUsername = emailParts[0].toLowerCase().replace(/[^a-z0-9]/g, '.');
      
      // Add the username field to the data
      const dataWithUsername = {
        ...data,
        username: baseUsername
      };
      
      // Use the specific HR employees endpoint to ensure Firebase user creation
      const response = await apiRequest('POST', '/api/hr/employees', dataWithUsername);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    }
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number, data: Partial<EmployeeFormData> }) => {
      // If we have an email, also generate a username
      if (data.data.email) {
        const emailParts = data.data.email.split('@');
        const baseUsername = emailParts[0].toLowerCase().replace(/[^a-z0-9]/g, '.');
        
        // Add the username field to the data
        data.data = {
          ...data.data,
          username: baseUsername
        };
      }
      
      const response = await apiRequest('PATCH', `/api/admin/employees/${data.id}`, data.data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    }
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/employees/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive",
      });
    }
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Get Firebase token first, then fallback to JWT token
      const firebaseToken = localStorage.getItem("firebaseToken");
      const jwtToken = localStorage.getItem("token");
      const token = firebaseToken || jwtToken;
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      // Add token to the formData instead of using headers for multipart/form-data
      formData.append('token', token);
      
      const response = await fetch('/api/admin/employees/bulk-upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with correct boundary for multipart/form-data
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Invalid authentication token');
        }
        const error = await response.json();
        throw new Error(error.message || 'Bulk upload failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Uploaded ${data.count} employees successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/employees'] });
      setIsUploadDialogOpen(false);
      setBulkUploadFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to bulk upload employees",
        variant: "destructive",
      });
    }
  });

  function resetForm() {
    setFormData(defaultEmployeeFormData);
    setCurrentEmployee(null);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleCheckboxChange(name: string, checked: boolean) {
    setFormData(prev => ({ ...prev, [name]: checked }));
  }

  function openEditDialog(employee: Employee) {
    setCurrentEmployee(employee);
    setFormData({
      password: "", // We don't show or set the password when editing
      name: employee.name,
      surname: employee.surname || "",
      email: employee.email,
      phoneNumber: employee.phoneNumber || "",
      jobTitle: employee.jobTitle || "",
      department: employee.department || "",
      location: employee.location || "",
      managerEmail: employee.managerEmail || "",
      sex: employee.sex || "",
      nationality: employee.nationality || "",
      birthDate: employee.birthDate ? format(new Date(employee.birthDate), 'yyyy-MM-dd') : "",
      hireDate: employee.hireDate ? format(new Date(employee.hireDate), 'yyyy-MM-dd') : "",
      isAdmin: employee.isAdmin,
      status: employee.status,
      avatarUrl: employee.avatarUrl || ""
    });
    setIsEditDialogOpen(true);
  }

  function openDeleteDialog(employee: Employee) {
    setCurrentEmployee(employee);
    setIsDeleteDialogOpen(true);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      setBulkUploadFile(event.target.files[0]);
    }
  }

  function handleBulkUpload() {
    if (!bulkUploadFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', bulkUploadFile);
    bulkUploadMutation.mutate(formData);
  }

  function getInitials(name: string, surname: string | null) {
    return `${name.charAt(0)}${surname ? surname.charAt(0) : ''}`.toUpperCase();
  }
  
  // Filter employees based on search query
  const filteredEmployees = employees?.filter(employee => {
    const searchLower = searchQuery.toLowerCase();
    return (
      employee.name.toLowerCase().includes(searchLower) ||
      (employee.surname && employee.surname.toLowerCase().includes(searchLower)) ||
      employee.email.toLowerCase().includes(searchLower) ||
      (employee.jobTitle && employee.jobTitle.toLowerCase().includes(searchLower)) ||
      (employee.department && employee.department.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Employee Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsUploadDialogOpen(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>
            Manage all employees in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>A list of all employees in your organization</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee, index) => (
                    <TableRow key={`employee-${employee.id}-${employee.email}-${index}`}>
                      <TableCell className="font-medium flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={employee.avatarUrl || undefined} alt={employee.name} />
                          <AvatarFallback>{getInitials(employee.name, employee.surname)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div>{employee.name} {employee.surname}</div>
                          <div className="text-sm text-muted-foreground">{employee.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.jobTitle || "—"}</TableCell>
                      <TableCell>{employee.department || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isAdmin ? "destructive" : "outline"}>
                          {employee.isAdmin ? "Admin" : "User"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee)}>
                          <PenSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(employee)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No employees found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Employee Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">First Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="surname">Last Name *</Label>
              <Input
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="managerEmail">Manager's Email</Label>
              <Input
                id="managerEmail"
                name="managerEmail"
                type="email"
                value={formData.managerEmail}
                onChange={handleInputChange}
                placeholder="manager@company.com"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password">Default Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="New York Office"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="sex">Gender</Label>
              <Select name="sex" value={formData.sex} onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="birthDate">Date of Birth</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                name="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="avatarUrl">Profile Picture URL</Label>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                value={formData.avatarUrl}
                onChange={handleInputChange}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            
            <div className="flex items-center space-x-2 mt-8">
              <Checkbox 
                id="isAdmin" 
                checked={formData.isAdmin}
                onCheckedChange={(checked) => handleCheckboxChange("isAdmin", checked as boolean)}
              />
              <Label htmlFor="isAdmin">Admin privileges</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information. Leave password blank to keep the current password.
            </DialogDescription>
          </DialogHeader>
          
          {/* Same form fields as Create Dialog but with current values */}
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">First Name *</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-surname">Last Name *</Label>
              <Input
                id="edit-surname"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-managerEmail">Manager's Email</Label>
              <Input
                id="edit-managerEmail"
                name="managerEmail"
                type="email"
                value={formData.managerEmail}
                onChange={handleInputChange}
                placeholder="manager@company.com"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Leave blank to keep current password"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-phoneNumber">Phone Number</Label>
              <Input
                id="edit-phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-jobTitle">Job Title</Label>
              <Input
                id="edit-jobTitle"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="New York Office"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-sex">Gender</Label>
              <Select name="sex" value={formData.sex} onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-nationality">Nationality</Label>
              <Input
                id="edit-nationality"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-birthDate">Date of Birth</Label>
              <Input
                id="edit-birthDate"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-hireDate">Hire Date</Label>
              <Input
                id="edit-hireDate"
                name="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select name="status" value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-avatarUrl">Profile Picture URL</Label>
              <Input
                id="edit-avatarUrl"
                name="avatarUrl"
                value={formData.avatarUrl}
                onChange={handleInputChange}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            
            <div className="flex items-center space-x-2 mt-8">
              <Checkbox 
                id="edit-isAdmin" 
                checked={formData.isAdmin}
                onCheckedChange={(checked) => handleCheckboxChange("isAdmin", checked as boolean)}
              />
              <Label htmlFor="edit-isAdmin">Admin privileges</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (currentEmployee) {
                  // Remove password if empty to avoid changing it
                  const updatedData = {...formData};
                  if (!updatedData.password) {
                    delete updatedData.password;
                  }
                  
                  updateMutation.mutate({
                    id: currentEmployee.id, 
                    data: updatedData
                  });
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {currentEmployee?.name} {currentEmployee?.surname}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (currentEmployee) {
                  deleteMutation.mutate(currentEmployee.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Upload Employees</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing employee information. Download a template to see the required format.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={downloadTemplate}>
              <FileText className="mr-2 h-4 w-4" />
              Download template CSV
            </Button>
            
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="file-upload">Upload CSV</Label>
              <Input 
                id="file-upload" 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
              />
            </div>
            
            {bulkUploadFile && (
              <p className="text-sm text-muted-foreground">
                Selected file: {bulkUploadFile.name}
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsUploadDialogOpen(false);
                setBulkUploadFile(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkUpload}
              disabled={bulkUploadMutation.isPending || !bulkUploadFile}
            >
              {bulkUploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}