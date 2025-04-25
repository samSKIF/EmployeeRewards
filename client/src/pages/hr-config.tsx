import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useFirebaseAuth } from "@/context/FirebaseAuthContext";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import MainLayout from "@/components/layout/MainLayout";
import { TemplateManager as FileTemplateManager } from "@/components/hr/TemplateManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Award, BadgeCheck, Gift, Medal, Star, TrendingUp } from "lucide-react";
import { Pencil, Trash2, Upload, Plus, RefreshCw, Users, Palette, FileDown, FileUp, Eye } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Employee, BrandingSetting, FileTemplate } from "@shared/schema";
import * as XLSX from "xlsx";

// Color theme presets
const COLOR_PRESETS = [
  { id: "default", name: "Default", primary: "#00A389", secondary: "#232E3E", accent: "#FFA500" },
  { id: "blue", name: "Blue", primary: "#1E40AF", secondary: "#1E3A8A", accent: "#60A5FA" },
  { id: "green", name: "Green", primary: "#15803D", secondary: "#166534", accent: "#4ADE80" },
  { id: "purple", name: "Purple", primary: "#7E22CE", secondary: "#6B21A8", accent: "#C084FC" },
  { id: "red", name: "Red", primary: "#DC2626", secondary: "#B91C1C", accent: "#FCA5A5" },
  { id: "custom", name: "Custom", primary: "", secondary: "", accent: "" }
];

const EmployeeDialog = ({ 
  employee, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  employee?: Employee, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: any) => void 
}) => {
  const isNewEmployee = !employee;
  const [formData, setFormData] = useState({
    name: employee?.name || "",
    surname: employee?.surname || "",
    email: employee?.email || "",
    password: "",
    dateOfBirth: employee?.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : "",
    dateJoined: employee?.dateJoined ? new Date(employee.dateJoined).toISOString().split('T')[0] : "",
    jobTitle: employee?.jobTitle || "",
    isManager: employee?.isManager || false,
    managerEmail: employee?.managerEmail || "",
    status: employee?.status || "active",
    sex: employee?.sex || "",
    nationality: employee?.nationality || "",
    phoneNumber: employee?.phoneNumber || ""
  });

  // Add effect to make emails unique for new employees
  useEffect(() => {
    if (isNewEmployee && formData.name && formData.surname) {
      // If creating a new employee, generate a unique email based on name and timestamp
      if (!formData.email || formData.email === "") {
        const cleanName = formData.name.toLowerCase().replace(/\s+/g, '');
        const cleanSurname = formData.surname.toLowerCase().replace(/\s+/g, '');
        const timestamp = Date.now().toString().slice(-4);
        const uniqueEmail = `${cleanName}.${cleanSurname}${timestamp}@company.com`;
        setFormData(prev => ({ ...prev, email: uniqueEmail }));
      }
    }
  }, [isNewEmployee, formData.name, formData.surname]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>{isNewEmployee ? "Add New Employee" : "Edit Employee"}</DialogTitle>
        <DialogDescription>
          {isNewEmployee 
            ? "Create a new employee account. Employees will be able to access the shop and social platform."
            : "Update the employee account details."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">First Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surname">Last Name</Label>
          <Input
            id="surname"
            name="surname"
            value={formData.surname}
            onChange={handleChange}
            placeholder="Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john.doe@company.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">
            {isNewEmployee ? "Password" : "New Password (leave blank to keep current)"}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isNewEmployee ? "Required" : "Optional"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateJoined">Date Joined Company</Label>
          <Input
            id="dateJoined"
            name="dateJoined"
            type="date"
            value={formData.dateJoined}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title / Role Name</Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleChange}
            placeholder="Software Engineer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            placeholder="American"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sex">Gender</Label>
          <Select 
            value={formData.sex} 
            onValueChange={(value) => handleSelectChange('sex', value)}
          >
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
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => handleSelectChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 pt-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="isManager" 
              name="isManager"
              checked={formData.isManager}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isManager: checked }))}
            />
            <Label htmlFor="isManager">Is Manager</Label>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="managerEmail">Direct Manager's Email</Label>
          <Input
            id="managerEmail"
            name="managerEmail"
            type="email"
            value={formData.managerEmail}
            onChange={handleChange}
            placeholder="manager@company.com"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(formData)}>
          {isNewEmployee ? "Create Employee" : "Update Employee"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

const EmployeeManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadStatus, setBulkUploadStatus] = useState<{total: number; processed: number; success: number; errors: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch employees
  const { 
    data: employees = [] as Employee[], 
    isLoading,
    isError,
    refetch 
  } = useQuery<Employee[]>({
    queryKey: ["/api/hr/employees"],
    retry: 1
  });

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/hr/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
        },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create employee");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive"
      });
    }
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await fetch(`/api/hr/employees/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
        },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update employee");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive"
      });
    }
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/hr/employees/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
        }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete employee");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive"
      });
    }
  });

  const handleAddEmployee = () => {
    setSelectedEmployee(undefined);
    setIsDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleDeleteEmployee = (id: number) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveEmployee = (data: any) => {
    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (employees: any[]) => {
      const res = await fetch("/api/admin/employees/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
        },
        body: JSON.stringify({ employees })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload employees");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.success} employees created successfully`,
      });
      setIsBulkUploadOpen(false);
      setBulkUploadStatus(null);
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload employees",
        variant: "destructive"
      });
      setBulkUploadStatus(null);
    }
  });
  
  // Handle Excel file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await readExcelFile(file);
      if (data && data.length > 0) {
        setBulkUploadStatus({
          total: data.length,
          processed: 0,
          success: 0,
          errors: 0
        });
        
        // Process the data and create employees
        bulkUploadMutation.mutate(data);
      } else {
        toast({
          title: "Error",
          description: "No valid data found in the Excel file",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to read Excel file",
        variant: "destructive"
      });
    }
  };
  
  // Function to read Excel or CSV file
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error("Failed to read file"));
            return;
          }
          
          // XLSX.read can parse both Excel and CSV formats
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          
          // Map columns to employee fields
          const employees = json.map((row: any) => {
            // Generate unique email if not provided
            let email = row.email;
            if (!email) {
              const name = row.name || '';
              const surname = row.surname || '';
              const cleanName = name.toLowerCase().replace(/\s+/g, '');
              const cleanSurname = surname.toLowerCase().replace(/\s+/g, '');
              const timestamp = Date.now().toString().slice(-4);
              email = `${cleanName}.${cleanSurname}${timestamp}@company.com`;
            }
            
            return {
              name: row.name || '',
              surname: row.surname || '',
              email: email,
              password: row.password || 'password123', // Default password
              dateOfBirth: row.dateOfBirth || null,
              dateJoined: row.dateJoined || new Date().toISOString().split('T')[0],
              jobTitle: row.jobTitle || '',
              isManager: row.isManager === 'Yes' || row.isManager === true || false,
              managerEmail: row.managerEmail || '',
              status: row.status || 'active',
              sex: row.sex || '',
              nationality: row.nationality || '',
              phoneNumber: row.phoneNumber || ''
            };
          });
          
          resolve(employees);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsBinaryString(file);
    });
  };
  
  // State for showing the template dialog
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  // Template content display instead of download
  const templateCSVContent = `name,surname,email,password,dateOfBirth,dateJoined,jobTitle,isManager,managerEmail,status,sex,nationality,phoneNumber
John,Doe,john.doe@company.com,password123,1990-01-01,2023-01-01,Software Engineer,No,manager@company.com,active,male,American,+1 (555) 123-4567`;

  // Function to generate and download CSV directly from client-side
  const downloadTemplate = () => {
    // Default employee template CSV content
    const headers = "name,surname,email,password,dateOfBirth,dateJoined,jobTitle,isManager,managerEmail,status,sex,nationality,phoneNumber";
    const sampleData = "John,Doe,john.doe@company.com,password123,1990-01-01,2023-01-01,Software Engineer,No,manager@company.com,active,male,American,+1 (555) 123-4567";
    const csvContent = `${headers}\n${sampleData}`;
    
    // Create CSV blob with proper encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Check if browser supports download attribute
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, "employee_template.csv");
    } else {
      // Create a download link
      const link = document.createElement('a');
      
      // Create object URL
      const url = URL.createObjectURL(blob);
      
      // Setup link properties
      link.href = url;
      link.download = "employee_template.csv";
      link.style.visibility = 'hidden';
      
      // Add link to DOM, click it, and remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    }
    
    // Show success message
    toast({
      title: "Template Downloaded",
      description: "Employee CSV template has been downloaded to your device"
    });
  };
  
  // Function to show template content as fallback
  const showTemplate = () => {
    setShowTemplateDialog(true);
  };

  if (isError) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Error loading employees. Please try again.</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Employee Management</h2>
          <p className="text-muted-foreground">Manage employee accounts in your organization</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleAddEmployee}>
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
          <div className="relative">
            <input
              type="file"
              id="fileUpload"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
            />
            <Button 
              variant="outline" 
              onClick={() => setIsBulkUploadOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" /> Bulk Upload
            </Button>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>View and manage all employees in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No employees found. Click "Add Employee" to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee: Employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        {employee.name} {employee.surname}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.jobTitle || "-"}</TableCell>
                      <TableCell>{employee.isManager ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          employee.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {employee.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <EmployeeDialog
          employee={selectedEmployee}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSaveEmployee}
        />
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Employees</DialogTitle>
            <DialogDescription>
              Upload multiple employees at once using a CSV or Excel file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadTemplate}>
                  <FileDown className="mr-2 h-4 w-4" /> Download CSV Template
                </Button>
                <Button variant="outline" onClick={showTemplate}>
                  <Eye className="mr-2 h-4 w-4" /> View Template Format
                </Button>
              </div>
              
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 w-full">
                <p className="font-medium">About the CSV template:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>The template is a standard CSV file with employee data fields</li>
                  <li>Open the file with Excel, Google Sheets or any spreadsheet software</li>
                  <li>Fill in employee details following the format of the sample row</li>
                </ul>
              </div>
              
              <div className="text-center space-y-2 w-full">
                <p className="text-sm text-muted-foreground">
                  Fill in the template with your employee data and upload it here
                </p>
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={bulkUploadMutation.isPending}
                  className="w-full"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {bulkUploadMutation.isPending ? "Uploading..." : "Choose File (.csv, .txt or Excel)"}
                </Button>
              </div>
              
              {bulkUploadStatus && (
                <div className="w-full bg-muted rounded-md p-4">
                  <h4 className="font-medium mb-2">Upload Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{bulkUploadStatus.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processed:</span>
                      <span>{bulkUploadStatus.processed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success:</span>
                      <span className="text-green-600">{bulkUploadStatus.success}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Errors:</span>
                      <span className="text-red-600">{bulkUploadStatus.errors}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Template Display Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Template Format</DialogTitle>
            <DialogDescription>
              Copy this template and paste it into a spreadsheet application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
              <pre className="text-xs whitespace-pre-wrap">{templateCSVContent}</pre>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(templateCSVContent);
                  toast({
                    title: "Template copied",
                    description: "The template has been copied to your clipboard"
                  });
                }}
              >
                <FileUp className="h-4 w-4 mr-2" /> Copy to Clipboard
              </Button>
              <Button 
                onClick={downloadTemplate}
                variant="outline"
              >
                <FileDown className="h-4 w-4 mr-2" /> Download CSV Template
              </Button>
            </div>
            <div className="text-sm border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 rounded-sm">
              <p className="font-medium text-blue-900">Instructions:</p>
              <ol className="list-decimal pl-5 mt-2 space-y-1 text-blue-800">
                <li>Download the CSV template</li>
                <li>Open it in Excel, Google Sheets or any spreadsheet application</li>
                <li>Fill in your employee data following the format in the example row</li>
                <li>Save the file as CSV</li>
                <li>Upload the file using the bulk upload button</li>
              </ol>
              <p className="mt-2 text-blue-800 text-xs">Tip: For best results, ensure all dates are in YYYY-MM-DD format and leave the password field blank for existing employees.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
};

const BrandingSettings = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [brandingData, setBrandingData] = useState({
    organizationName: "",
    colorScheme: "default",
    primaryColor: COLOR_PRESETS[0].primary,
    secondaryColor: COLOR_PRESETS[0].secondary,
    accentColor: COLOR_PRESETS[0].accent,
    logoUrl: ""
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Fetch branding settings
  const { data: branding, isLoading, error } = useQuery<BrandingSetting>({
    queryKey: ["/api/hr/branding"],
  });
  
  // Update branding settings
  const updateBrandingMutation = useMutation({
    mutationFn: async (data: Partial<BrandingSetting>) => {
      const res = await fetch("/api/hr/branding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
        },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update branding settings");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Branding settings updated successfully",
      });
      // Invalidate the branding query to trigger a refresh of the theme
      queryClient.invalidateQueries({ queryKey: ["/api/hr/branding"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update branding settings",
        variant: "destructive"
      });
    }
  });

  // Upload logo
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;
            
            const res = await fetch("/api/hr/branding/logo", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
              },
              body: JSON.stringify({ logoUrl: base64Data })
            });
            
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.message || "Failed to upload logo");
            }
            
            const data = await res.json();
            resolve(data.logoUrl);
          } catch (error: any) {
            reject(error);
          }
        };
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
        reader.readAsDataURL(file);
      });
    },
    onSuccess: (logoUrl) => {
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
      setBrandingData(prev => ({ ...prev, logoUrl }));
      queryClient.invalidateQueries({ queryKey: ["/api/hr/branding"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive"
      });
    }
  });
  
  // Handle color scheme change
  const handleColorSchemeChange = (value: string) => {
    const preset = COLOR_PRESETS.find(p => p.id === value);
    if (preset) {
      setBrandingData(prev => ({
        ...prev,
        colorScheme: value,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        accentColor: preset.accent
      }));
    }
  };
  
  // Handle color input change
  const handleColorChange = (field: string, value: string) => {
    setBrandingData(prev => ({
      ...prev,
      [field]: value,
      colorScheme: "custom" // Set to custom when any color is manually changed
    }));
  };
  
  // Handle logo upload
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle save branding
  const handleSaveBranding = () => {
    updateBrandingMutation.mutate(brandingData);
    
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };
  
  // Effect to update form data when branding data is loaded
  useEffect(() => {
    if (branding) {
      setBrandingData({
        organizationName: branding.organizationName || "",
        colorScheme: branding.colorScheme || "default",
        primaryColor: branding.primaryColor || COLOR_PRESETS[0].primary,
        secondaryColor: branding.secondaryColor || COLOR_PRESETS[0].secondary,
        accentColor: branding.accentColor || COLOR_PRESETS[0].accent,
        logoUrl: branding.logoUrl || ""
      });
      
      if (branding.logoUrl) {
        setLogoPreview(branding.logoUrl);
      }
    }
  }, [branding]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
          <CardDescription>Customize your organization's appearance in the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                value={brandingData.organizationName}
                onChange={(e) => setBrandingData(prev => ({ ...prev, organizationName: e.target.value }))}
                placeholder="Company, Inc."
                disabled={readOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="colorScheme">Color Scheme</Label>
              <Select 
                value={brandingData.colorScheme} 
                onValueChange={handleColorSchemeChange}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color scheme" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_PRESETS.map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    className="w-12 p-1 h-10"
                    value={brandingData.primaryColor}
                    onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                    disabled={readOnly || brandingData.colorScheme !== "custom"}
                  />
                  <Input
                    type="text"
                    value={brandingData.primaryColor}
                    onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                    disabled={readOnly || brandingData.colorScheme !== "custom"}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    className="w-12 p-1 h-10"
                    value={brandingData.secondaryColor}
                    onChange={(e) => handleColorChange("secondaryColor", e.target.value)}
                    disabled={readOnly || brandingData.colorScheme !== "custom"}
                  />
                  <Input
                    type="text"
                    value={brandingData.secondaryColor}
                    onChange={(e) => handleColorChange("secondaryColor", e.target.value)}
                    disabled={readOnly || brandingData.colorScheme !== "custom"}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="accentColor"
                    type="color"
                    className="w-12 p-1 h-10"
                    value={brandingData.accentColor}
                    onChange={(e) => handleColorChange("accentColor", e.target.value)}
                    disabled={readOnly || brandingData.colorScheme !== "custom"}
                  />
                  <Input
                    type="text"
                    value={brandingData.accentColor}
                    onChange={(e) => handleColorChange("accentColor", e.target.value)}
                    disabled={readOnly || brandingData.colorScheme !== "custom"}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo</Label>
              <div className="flex flex-col space-y-4">
                {(logoPreview || brandingData.logoUrl) && (
                  <div className="flex justify-center p-4 bg-gray-50 rounded-md">
                    <img 
                      src={logoPreview || brandingData.logoUrl} 
                      alt="Company Logo" 
                      className="max-h-40 object-contain"
                    />
                  </div>
                )}
                
                {!readOnly && (
                  <div className="flex items-center">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById("logo")?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" /> Upload Logo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          {!readOnly && (
            <Button 
              onClick={handleSaveBranding}
              disabled={updateBrandingMutation.isPending}
              className="ml-auto"
            >
              {updateBrandingMutation.isPending ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <>Save Branding Settings</>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

// Legacy template manager - keeping for reference
const LegacyTemplateManager = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { toast } = useToast();
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    fileName: '',
    contentType: 'text/plain',
    content: '',
    description: ''
  });
  
  // Fetch templates
  const { 
    data: templates = [], 
    isLoading,
    isError,
    refetch 
  } = useQuery<FileTemplate[]>({
    queryKey: ["/api/file-templates"],
    retry: 1
  });
  
  // Create/update template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/file-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("firebaseToken")}`
        },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save template");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
      setIsCreateTemplateOpen(false);
      setTemplateFormData({
        name: '',
        fileName: '',
        contentType: 'text/plain',
        content: '',
        description: ''
      });
      queryClient.invalidateQueries({ queryKey: ["/api/file-templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    }
  });
  
  // Download template function
  const downloadTemplate = (template: FileTemplate) => {
    const token = localStorage.getItem("firebaseToken");
    
    fetch(`/api/file-templates/${template.name}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return response.blob();
    })
    .then(blob => {
      // Create a download link for the blob
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Template Downloaded",
        description: `${template.fileName} has been downloaded to your device`
      });
    })
    .catch(error => {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the template. Please try again.",
        variant: "destructive"
      });
    });
  };
  
  // Handle form change
  const handleTemplateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle content type change
  const handleContentTypeChange = (value: string) => {
    setTemplateFormData(prev => ({
      ...prev,
      contentType: value
    }));
  };
  
  // Handle edit template
  const handleEditTemplate = (template: FileTemplate) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      name: template.name,
      fileName: template.fileName,
      contentType: template.contentType,
      content: template.content,
      description: template.description || ''
    });
    setIsCreateTemplateOpen(true);
  };
  
  // Handle save template
  const handleSaveTemplate = () => {
    saveTemplateMutation.mutate(templateFormData);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>File Templates</CardTitle>
              <CardDescription>
                Manage file templates for your organization. These templates can be used for data import/export operations.
              </CardDescription>
            </div>
            {!readOnly && (
              <Button onClick={() => {
                setSelectedTemplate(null);
                setTemplateFormData({
                  name: '',
                  fileName: '',
                  contentType: 'text/plain',
                  content: '',
                  description: ''
                });
                setIsCreateTemplateOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" /> Create Template
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full" />
            </div>
          ) : isError ? (
            <div className="text-center py-6 text-destructive">
              Failed to load templates. Please try again.
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No templates found. Create your first template to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.fileName}</TableCell>
                      <TableCell>{template.contentType}</TableCell>
                      <TableCell>{template.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadTemplate(template)}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          {!readOnly && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            <DialogDescription>
              {selectedTemplate 
                ? 'Edit an existing file template.' 
                : 'Create a new file template for your organization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={templateFormData.name}
                  onChange={handleTemplateFormChange}
                  placeholder="employee_import"
                  disabled={!!selectedTemplate}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for the template. Cannot be changed after creation.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileName">File Name</Label>
                <Input
                  id="fileName"
                  name="fileName"
                  value={templateFormData.fileName}
                  onChange={handleTemplateFormChange}
                  placeholder="employee_template.txt"
                />
                <p className="text-xs text-muted-foreground">
                  Name of the file when downloaded by users.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select 
                value={templateFormData.contentType} 
                onValueChange={handleContentTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text/plain">Text (plain)</SelectItem>
                  <SelectItem value="text/csv">CSV</SelectItem>
                  <SelectItem value="text/csv; charset=utf-8">CSV with UTF-8 BOM</SelectItem>
                  <SelectItem value="application/json">JSON</SelectItem>
                  <SelectItem value="text/html">HTML</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Content type determines how browsers and applications will handle the file.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={templateFormData.description}
                onChange={handleTemplateFormChange}
                placeholder="Template for importing employee data"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Template Content</Label>
              <textarea
                id="content"
                name="content"
                value={templateFormData.content}
                onChange={handleTemplateFormChange}
                placeholder="Enter the template content here..."
                className="w-full h-64 p-2 border rounded-md font-mono text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The content of the template file. This will be the actual data downloaded by users.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={!templateFormData.name || !templateFormData.fileName || !templateFormData.content}
            >
              {selectedTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PeerToPeerConfig = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { toast } = useToast();
  const [badgeSettings, setBadgeSettings] = useState({
    enablePeerRecognition: true,
    defaultBadgePoints: 50,
    maxPointsPerMonth: 1000,
    requireManagerApproval: false,
    enableCustomBadges: true
  });
  
  const badgeTypes = [
    { id: "teamwork", name: "Team Player", icon: <Users className="h-5 w-5 text-blue-500" />, points: 50 },
    { id: "innovation", name: "Innovator", icon: <TrendingUp className="h-5 w-5 text-purple-500" />, points: 100 },
    { id: "excellence", name: "Excellence", icon: <Star className="h-5 w-5 text-yellow-500" />, points: 75 },
    { id: "leadership", name: "Leadership", icon: <Award className="h-5 w-5 text-red-500" />, points: 150 },
    { id: "achievement", name: "Achievement", icon: <Medal className="h-5 w-5 text-green-500" />, points: 125 },
    { id: "helpfulness", name: "Helper", icon: <Gift className="h-5 w-5 text-indigo-500" />, points: 50 }
  ];
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  
  const handleSaveSettings = () => {
    setSaveStatus("saving");
    
    // Simulate API call
    setTimeout(() => {
      setSaveStatus("success");
      toast({
        title: "Success",
        description: "Peer to peer settings saved successfully",
      });
      
      // Reset status after a delay
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 1000);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Peer Recognition Settings</CardTitle>
          <CardDescription>Configure how employees can recognize each other</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enablePeerRecognition" className="text-base">Enable Peer Recognition</Label>
                  <p className="text-sm text-muted-foreground">Allow employees to recognize each other</p>
                </div>
                <Switch 
                  id="enablePeerRecognition" 
                  checked={badgeSettings.enablePeerRecognition}
                  onCheckedChange={(checked) => setBadgeSettings(prev => ({ ...prev, enablePeerRecognition: checked }))}
                  disabled={readOnly}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireManagerApproval" className="text-base">Require Manager Approval</Label>
                  <p className="text-sm text-muted-foreground">Recognitions need manager approval before points are awarded</p>
                </div>
                <Switch 
                  id="requireManagerApproval" 
                  checked={badgeSettings.requireManagerApproval}
                  onCheckedChange={(checked) => setBadgeSettings(prev => ({ ...prev, requireManagerApproval: checked }))}
                  disabled={readOnly}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableCustomBadges" className="text-base">Enable Custom Badges</Label>
                  <p className="text-sm text-muted-foreground">Allow employees to create custom badges</p>
                </div>
                <Switch 
                  id="enableCustomBadges" 
                  checked={badgeSettings.enableCustomBadges}
                  onCheckedChange={(checked) => setBadgeSettings(prev => ({ ...prev, enableCustomBadges: checked }))}
                  disabled={readOnly}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultBadgePoints">Default Badge Points</Label>
                <Input
                  id="defaultBadgePoints"
                  type="number"
                  value={badgeSettings.defaultBadgePoints}
                  onChange={(e) => setBadgeSettings(prev => ({ ...prev, defaultBadgePoints: parseInt(e.target.value) || 0 }))}
                  min={0}
                  max={1000}
                  disabled={readOnly}
                />
                <p className="text-xs text-muted-foreground">Default points awarded for new badges</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxPointsPerMonth">Maximum Points Per Month</Label>
                <Input
                  id="maxPointsPerMonth"
                  type="number"
                  value={badgeSettings.maxPointsPerMonth}
                  onChange={(e) => setBadgeSettings(prev => ({ ...prev, maxPointsPerMonth: parseInt(e.target.value) || 0 }))}
                  min={0}
                  disabled={readOnly}
                />
                <p className="text-xs text-muted-foreground">Maximum points an employee can award per month</p>
              </div>
            </div>
          </div>
        </CardContent>
        {!readOnly && (
          <CardFooter>
            <Button 
              onClick={handleSaveSettings}
              disabled={saveStatus === "saving"}
              className="ml-auto"
            >
              {saveStatus === "saving" ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <>Save Settings</>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recognition Badges</CardTitle>
          <CardDescription>Manage the badges that employees can award to each other</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {badgeTypes.map(badge => (
              <Card key={badge.id} className="border-2 hover:border-primary/50 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      {badge.icon}
                      <CardTitle className="ml-2 text-lg">{badge.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{badge.points} pts</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground">
                    Award this badge to recognize colleagues for their {badge.name.toLowerCase()} skills and contributions.
                  </p>
                </CardContent>
                {!readOnly && (
                  <CardFooter className="border-t pt-3 flex justify-end">
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
            
            {!readOnly && (
              <Card className="border-2 border-dashed hover:border-primary transition-all flex flex-col items-center justify-center h-40 cursor-pointer">
                <Plus className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Add New Badge</p>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const HRConfig = () => {
  const { user } = useAuth();
  const { currentUser } = useFirebaseAuth();
  
  // Check if the current user is an admin based on their email
  const isAdmin = useMemo(() => {
    if (user?.isAdmin) return true;
    
    // Special case: always grant admin access to admin@demo.io
    const userEmail = currentUser?.email || user?.email;
    return userEmail === "admin@demo.io";
  }, [user, currentUser]);
  
  console.log("HR Config - User status:", { 
    userFromContext: user,
    firebaseUser: currentUser?.email,
    isAdmin
  });
  
  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">HR Configuration</h1>
            <p className="text-muted-foreground">
              Manage employee accounts and customize your organization's branding
            </p>
          </div>
          
          {isAdmin && (
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
              Admin Access
            </Badge>
          )}
        </div>
        
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="team" className="text-base py-3">
              <Users className="mr-2 h-5 w-5" /> Team Management
            </TabsTrigger>
            <TabsTrigger value="branding" className="text-base py-3">
              <Palette className="mr-2 h-5 w-5" /> Branding
            </TabsTrigger>
            <TabsTrigger value="peer" className="text-base py-3">
              <RefreshCw className="mr-2 h-5 w-5" /> Peer to Peer Config
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="team">
            <EmployeeManagement />
          </TabsContent>
          
          <TabsContent value="branding">
            <BrandingSettings readOnly={!isAdmin} />
          </TabsContent>
          
          <TabsContent value="peer">
            <PeerToPeerConfig readOnly={!isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default HRConfig;