import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Users, Building2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PreviewData {
  employees: Array<{
    name: string;
    surname: string;
    email: string;
    department: string;
    location?: string;
    jobTitle?: string;
    phoneNumber?: string;
  }>;
  newDepartments: string[];
  existingDepartments: string[];
  employeeCount: number;
  validation: {
    hasErrors: boolean;
    errors: string[];
    warnings: string[];
  };
}

interface BulkUploadWithApprovalProps {
  onUploadComplete?: () => void;
}

export default function BulkUploadWithApproval({ onUploadComplete }: BulkUploadWithApprovalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // File analysis mutation
  const analyzeFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest('POST', '/api/admin/employees/preview', formData);
      return response.json();
    },
    onSuccess: (data: PreviewData) => {
      setPreviewData(data);
      setUploadStep('preview');
      setIsPreviewDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze the uploaded file',
        variant: 'destructive',
      });
    },
  });

  // Bulk upload execution mutation
  const executeBulkUploadMutation = useMutation({
    mutationFn: async (uploadData: any) => {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      const response = await apiRequest('POST', '/api/admin/employees/bulk-upload', formData);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: 'Success',
        description: `Successfully created ${result.successCount || 0} employees, updated ${result.updateCount || 0}, and created ${result.departmentsCreated || 0} departments`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/departments'] });
      setIsPreviewDialogOpen(false);
      setFile(null);
      setPreviewData(null);
      setUploadStep('upload');
      onUploadComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to process the bulk upload',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleAnalyzeFile = () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to upload',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    analyzeFileMutation.mutate(formData);
  };

  const handleApproveAndExecute = () => {
    if (!previewData || !file) return;
    
    setUploadStep('processing');
    executeBulkUploadMutation.mutate({
      file: file,
      employees: previewData.employees,
      createDepartments: previewData.newDepartments,
    });
  };

  const handleCancelUpload = () => {
    setIsPreviewDialogOpen(false);
    setPreviewData(null);
    setUploadStep('upload');
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Bulk Employee Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV file to create multiple employees at once. The system will analyze your data and ask for approval before creating new departments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div>
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* CSV Format Guide */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV Format Requirements:</strong>
              <br />
              Required columns: name, surname, email, department
              <br />
              Optional columns: location, jobTitle, phoneNumber, birthDate, hireDate
              <br />
              The first row should contain column headers.
            </AlertDescription>
          </Alert>

          {/* Analyze Button */}
          <Button 
            onClick={handleAnalyzeFile}
            disabled={!file || analyzeFileMutation.isPending}
            className="w-full"
          >
            {analyzeFileMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analyzing File...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Analyze & Preview
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview and Approval Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Preview & Approval</DialogTitle>
            <DialogDescription>
              Review the data analysis and approve the creation of new departments and employees
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6">
              {/* Validation Errors */}
              {previewData.validation.hasErrors && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Validation Errors Found:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {previewData.validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation Warnings */}
              {previewData.validation.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {previewData.validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Department Creation Approval */}
              {previewData.newDepartments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Building2 className="h-5 w-5 mr-2" />
                      New Departments to Create
                    </CardTitle>
                    <CardDescription>
                      This request will create the following {previewData.newDepartments.length} new departments:
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {previewData.newDepartments.map((dept, index) => (
                        <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Do you approve the creation of these {previewData.newDepartments.length} departments?</strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Employee Creation Approval */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Users className="h-5 w-5 mr-2" />
                    Employee Creation Summary
                  </CardTitle>
                  <CardDescription>
                    This request will create {previewData.employeeCount} new employees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-700">Total Employees</p>
                      <p className="text-2xl font-bold text-green-800">{previewData.employeeCount}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-700">Departments Used</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {previewData.newDepartments.length + previewData.existingDepartments.length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      <strong>Do you approve the creation of these {previewData.employeeCount} employees?</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Preview (First 5) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employee Preview</CardTitle>
                  <CardDescription>
                    Showing first 5 employees from your upload
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {previewData.employees.slice(0, 5).map((employee, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{employee.name} {employee.surname}</p>
                          <p className="text-sm text-gray-600">{employee.email}</p>
                          <p className="text-sm text-gray-500">{employee.department} • {employee.jobTitle || 'No title'}</p>
                        </div>
                        <Badge variant="outline">{employee.location || 'No location'}</Badge>
                      </div>
                    ))}
                    {previewData.employees.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        ...and {previewData.employees.length - 5} more employees
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="space-x-2">
            <Button 
              variant="outline" 
              onClick={handleCancelUpload}
              disabled={uploadStep === 'processing'}
            >
              Cancel
            </Button>
            
            {previewData && !previewData.validation.hasErrors && (
              <Button 
                onClick={handleApproveAndExecute}
                disabled={uploadStep === 'processing'}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploadStep === 'processing' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Create All
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}