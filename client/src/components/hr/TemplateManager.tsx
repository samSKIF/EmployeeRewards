import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileTemplate } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, FileText, Download, Edit, RefreshCw } from 'lucide-react';

interface TemplateManagerProps {
  readOnly: boolean;
}

export function TemplateManager({ readOnly }: TemplateManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<FileTemplate | null>(
    null
  );
  const [templateForm, setTemplateForm] = useState({
    name: '',
    fileName: '',
    contentType: 'text/plain',
    content: '',
    description: '',
  });

  const { toast } = useToast();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<FileTemplate[]>({
    queryKey: ['/api/file-templates'],
    enabled: !readOnly, // Only fetch if not in read-only mode
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (
      template: Omit<
        FileTemplate,
        'id' | 'createdAt' | 'updatedAt' | 'createdBy'
      >
    ) => {
      const res = await fetch('/api/file-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firebaseToken')}`,
        },
        body: JSON.stringify(template),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create template');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      setIsAddDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/file-templates'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Partial<FileTemplate> & { name: string }) => {
      const res = await fetch(`/api/file-templates/${template.name}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('firebaseToken')}`,
        },
        body: JSON.stringify(template),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update template');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
      setIsEditDialogOpen(false);
      setCurrentTemplate(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/file-templates'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
    },
  });

  // Reset form
  const resetForm = () => {
    setTemplateForm({
      name: '',
      fileName: '',
      contentType: 'text/plain',
      content: '',
      description: '',
    });
  };

  // Handle form input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTemplateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission for creating a template
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplateMutation.mutate(templateForm);
  };

  // Handle form submission for updating a template
  const handleUpdateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentTemplate) {
      updateTemplateMutation.mutate({
        ...templateForm,
        name: currentTemplate.name, // Keep original name for lookup
      });
    }
  };

  // Handle edit template
  const handleEditTemplate = (template: FileTemplate) => {
    setCurrentTemplate(template);
    setTemplateForm({
      name: template.name,
      fileName: template.fileName,
      contentType: template.contentType,
      content: template.content,
      description: template.description || '',
    });
    setIsEditDialogOpen(true);
  };

  // Handle download template using native browser download
  const handleDownloadTemplate = (templateName: string) => {
    const token = localStorage.getItem('firebaseToken');
    const downloadUrl = `/api/file-templates/${templateName}/download?token=${encodeURIComponent(token)}`;
    window.location.href = downloadUrl;

    toast({
      title: 'Download Started',
      description: `Download of ${templateName} initiated`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">File Templates</CardTitle>
        <CardDescription>
          Manage your organization's file templates for imports and exports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center p-4 border rounded-md bg-muted/20">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                No templates have been created yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell>{template.fileName}</TableCell>
                    <TableCell>
                      {template.description || (
                        <span className="text-muted-foreground italic">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadTemplate(template.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {!readOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {!readOnly && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Template
          </Button>
        )}
      </CardFooter>

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Template</DialogTitle>
            <DialogDescription>
              Create a new file template for your organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTemplate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={templateForm.name}
                    onChange={handleInputChange}
                    placeholder="employee_import"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier (e.g., "employee_import")
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    name="fileName"
                    value={templateForm.fileName}
                    onChange={handleInputChange}
                    placeholder="employee_template.txt"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Name of the file when downloaded
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type</Label>
                <Input
                  id="contentType"
                  name="contentType"
                  value={templateForm.contentType}
                  onChange={handleInputChange}
                  placeholder="text/plain"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  MIME type (e.g., "text/plain" or "text/csv")
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={templateForm.description}
                  onChange={handleInputChange}
                  placeholder="Template for employee imports"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Template Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={templateForm.content}
                  onChange={handleInputChange}
                  placeholder="name,surname,email,jobTitle,department..."
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the actual template content (e.g., CSV headers)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplateMutation.isPending}>
                {createTemplateMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />{' '}
                    Creating...
                  </>
                ) : (
                  <>Create Template</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update an existing file template.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTemplate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Template Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={templateForm.name}
                    onChange={handleInputChange}
                    required
                    disabled // Don't allow changing the name as it's used as the key
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fileName">File Name</Label>
                  <Input
                    id="edit-fileName"
                    name="fileName"
                    value={templateForm.fileName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contentType">Content Type</Label>
                <Input
                  id="edit-contentType"
                  name="contentType"
                  value={templateForm.contentType}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={templateForm.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Template Content</Label>
                <Textarea
                  id="edit-content"
                  name="content"
                  value={templateForm.content}
                  onChange={handleInputChange}
                  rows={6}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setCurrentTemplate(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTemplateMutation.isPending}>
                {updateTemplateMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />{' '}
                    Updating...
                  </>
                ) : (
                  <>Update Template</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
