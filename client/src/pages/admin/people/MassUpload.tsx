import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  FileText,
  X,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface UploadResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    email?: string;
  }>;
  createdUsers: Array<{
    name: string;
    email: string;
    department: string;
  }>;
}

interface PreviewEmployee {
  name: string;
  surname: string;
  email: string;
  department: string;
  job_title: string;
  location: string;
  phone_number: string;
  manager_email: string;
  hire_date: string;
  birth_date: string;
  nationality: string;
  sex: string;
}

interface DepartmentAnalysis {
  name: string;
  action: 'existing' | 'new' | 'typo';
  suggestion?: string;
  confidence?: number;
  rows: number[];
}

interface EnhancedPreviewData {
  employees: PreviewEmployee[];
  departmentAnalysis: {
    new: DepartmentAnalysis[];
    typos: DepartmentAnalysis[];
    existing: DepartmentAnalysis[];
    total: number;
  };
  employeeCount: number;
  validation: {
    hasErrors: boolean;
    errors: string[];
    warnings: string[];
    needsReview: boolean;
  };
}

export default function MassUpload() {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewEmployee[]>([]);
  const [enhancedPreview, setEnhancedPreview] = useState<EnhancedPreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // CSV template data
  const csvTemplate = `name,surname,email,department,job_title,location,phone_number,manager_email,hire_date,birth_date,nationality,sex
John,Doe,john.doe@company.com,Engineering,Software Engineer,New York Office,+1-555-0123,manager@company.com,2024-01-15,1990-05-20,American,Male
Jane,Smith,jane.smith@company.com,Marketing,Marketing Manager,London Office,+44-20-7946-0958,director@company.com,2023-11-10,1988-12-03,British,Female`;

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: 'Template Downloaded',
      description: 'CSV template has been downloaded successfully',
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV or Excel file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 10MB',
          variant: 'destructive',
        });
        return;
      }

      setUploadFile(file);
      setUploadResult(null);
      setPreviewData([]);
      setShowPreview(false);
    }
  };

  // Preview file before upload
  const previewFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/admin/employees/preview', formData);
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewData(data.employees || []);
      setEnhancedPreview(data);
      setShowPreview(true);
      
      // Check if department review is needed
      if (data.validation?.needsReview) {
        setShowDepartmentDialog(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Preview Failed',
        description: error.message || 'Failed to preview file',
        variant: 'destructive',
      });
    },
  });

  // Upload employees
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsProcessing(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      try {
        const response = await apiRequest('POST', '/api/admin/employees/bulk-upload', formData);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        return response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (result: UploadResult) => {
      setUploadResult(result);
      setIsProcessing(false);
      setUploadFile(null);
      setShowPreview(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: 'Upload Complete',
        description: `${result.successCount} employees uploaded successfully, ${result.errorCount} errors`,
        variant: result.errorCount > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload employees',
        variant: 'destructive',
      });
    },
  });

  const handlePreview = () => {
    if (uploadFile) {
      previewFileMutation.mutate(uploadFile);
    }
  };

  const handleUpload = () => {
    if (uploadFile) {
      uploadMutation.mutate(uploadFile);
    }
  };

  const clearFile = () => {
    setUploadFile(null);
    setUploadResult(null);
    setPreviewData([]);
    setEnhancedPreview(null);
    setShowPreview(false);
    setShowDepartmentDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDepartmentConfirm = () => {
    setShowDepartmentDialog(false);
    // Proceed with upload after user confirms departments
    if (uploadFile) {
      uploadMutation.mutate(uploadFile);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <Link href="/admin/employees" className="flex items-center hover:text-blue-600 transition-colors">
          <Users className="h-4 w-4 mr-1" />
          Employee Directory
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Mass Upload</span>
      </div>

      {/* Enhanced Header with Back Button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/admin/employees">
            <Button variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employees
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mass Employee Upload</h1>
            <p className="text-gray-600">Upload multiple employees at once using CSV or Excel files</p>
          </div>
        </div>
        <Button onClick={downloadTemplate} variant="outline" className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Upload Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Required Fields</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• <strong>name</strong> - First name (required)</li>
                <li>• <strong>email</strong> - Email address (required, must be unique)</li>
                <li>• <strong>department</strong> - Department name</li>
                <li>• <strong>job_title</strong> - Job title</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Optional Fields</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• <strong>surname</strong> - Last name</li>
                <li>• <strong>location</strong> - Office location</li>
                <li>• <strong>phone_number</strong> - Phone number</li>
                <li>• <strong>manager_email</strong> - Manager's email</li>
                <li>• <strong>hire_date</strong> - Format: YYYY-MM-DD</li>
                <li>• <strong>birth_date</strong> - Format: YYYY-MM-DD</li>
                <li>• <strong>nationality</strong> - Nationality</li>
                <li>• <strong>sex</strong> - Gender (Male/Female/Other)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Select a CSV or Excel file containing employee data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="file-upload">Choose File</Label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>
            {uploadFile && (
              <Button variant="outline" size="sm" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {uploadFile && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">{uploadFile.name}</span>
              <Badge variant="secondary">
                {(uploadFile.size / 1024).toFixed(1)} KB
              </Badge>
            </div>
          )}

          {uploadFile && !isProcessing && (
            <div className="flex space-x-3">
              <Button 
                onClick={handlePreview} 
                variant="outline"
                disabled={previewFileMutation.isPending}
              >
                {previewFileMutation.isPending ? 'Loading...' : 'Preview Data'}
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadMutation.isPending ? 'Uploading...' : 'Upload Employees'}
              </Button>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Employee Data</DialogTitle>
            <DialogDescription>
              Review the data before uploading ({previewData.length} employees)
            </DialogDescription>
          </DialogHeader>
          
          {previewData.length > 0 && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((employee, index) => (
                    <TableRow key={index}>
                      <TableCell>{employee.name} {employee.surname}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.job_title}</TableCell>
                      <TableCell>{employee.location}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewData.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 10 of {previewData.length} employees
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload {previewData.length} Employees
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Results */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {uploadResult.errorCount === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{uploadResult.totalRows}</div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{uploadResult.successCount}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{uploadResult.errorCount}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            {/* Success List */}
            {uploadResult.createdUsers.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-700 mb-2">Successfully Created Employees</h4>
                <div className="max-h-32 overflow-y-auto">
                  {uploadResult.createdUsers.map((user, index) => (
                    <div key={index} className="text-sm p-2 bg-green-50 rounded mb-1">
                      <strong>{user.name}</strong> - {user.email} ({user.department})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error List */}
            {uploadResult.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">Errors</h4>
                <div className="max-h-32 overflow-y-auto">
                  {uploadResult.errors.map((error, index) => (
                    <div key={index} className="text-sm p-2 bg-red-50 rounded mb-1">
                      <strong>Row {error.row}:</strong> {error.message}
                      {error.email && <span className="text-gray-600"> ({error.email})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Department Review Dialog */}
      {showDepartmentDialog && enhancedPreview && (
        <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Department Review Required
              </DialogTitle>
              <DialogDescription>
                We found some departments that need your attention before proceeding with the upload.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Typo Suggestions */}
              {enhancedPreview.departmentAnalysis.typos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-amber-700 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Possible Typos Detected
                  </h3>
                  <p className="text-sm text-gray-600">
                    These departments look similar to existing ones. Please review:
                  </p>
                  <div className="space-y-2">
                    {enhancedPreview.departmentAnalysis.typos.map((dept, index) => (
                      <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-amber-800">"{dept.name}"</p>
                            <p className="text-sm text-amber-600">
                              Found in rows: {dept.rows.join(', ')}
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              💡 Did you mean: "<strong>{dept.suggestion}</strong>"? 
                              <span className="text-gray-500 ml-1">({dept.confidence}% match)</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Tip:</strong> Typos will create duplicate departments. 
                      Consider fixing them in your file before uploading.
                    </p>
                  </div>
                </div>
              )}

              {/* New Departments */}
              {enhancedPreview.departmentAnalysis.new.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    New Departments to Create
                  </h3>
                  <p className="text-sm text-gray-600">
                    These departments will be automatically created:
                  </p>
                  <div className="space-y-2">
                    {enhancedPreview.departmentAnalysis.new.map((dept, index) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-blue-800">"{dept.name}"</p>
                            <p className="text-sm text-blue-600">
                              Found in rows: {dept.rows.join(', ')}
                            </p>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDepartmentDialog(false)}
              >
                Cancel & Fix File
              </Button>
              <Button 
                onClick={handleDepartmentConfirm}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Proceed with Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}