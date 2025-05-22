import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as LucideIcons from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash, Edit, Paintbrush } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Type definition for status types
type StatusType = {
  id: number;
  name: string;
  iconName: string;
  description: string | null;
  color: string;
  durationDays: number | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  createdBy: number | null;
};

// Create a new type that excludes server-generated fields for creating/updating
type StatusTypeInput = Omit<StatusType, 'id' | 'isSystem' | 'createdAt' | 'updatedAt' | 'createdBy'>;

// Component to manage status types
const AdminStatusTypes: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State for the selected status type to edit
  const [selectedStatusType, setSelectedStatusType] = useState<StatusType | null>(null);

  // State for the dialog visibility
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // State for the form inputs
  const [formData, setFormData] = useState<StatusTypeInput>({
    name: '',
    iconName: 'Info',
    description: '',
    color: '#6366F1',
    durationDays: null,
    isActive: true,
  });

  // Fetch status types
  const { data: statusTypes, isLoading, error } = useQuery({
    queryKey: ['/api/employee-status/status-types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/employee-status/status-types');
      if (!response.ok) {
        throw new Error('Failed to fetch status types');
      }
      return response.json();
    },
  });

  // Create a new status type
  const createMutation = useMutation({
    mutationFn: async (data: StatusTypeInput) => {
      const response = await apiRequest('POST', '/api/employee-status/status-types', data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to create status type');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('statusTypes.createSuccess', 'Status type created successfully'),
        description: t('statusTypes.createSuccessDescription', 'The new status type has been added to the system.'),
      });
      // Invalidate the status types query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/employee-status/status-types'] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('statusTypes.createError', 'Error creating status type'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update an existing status type
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<StatusTypeInput> }) => {
      const response = await apiRequest('PATCH', `/api/employee-status/status-types/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update status type');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('statusTypes.updateSuccess', 'Status type updated successfully'),
        description: t('statusTypes.updateSuccessDescription', 'The status type has been updated.'),
      });
      // Invalidate the status types query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/employee-status/status-types'] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('statusTypes.updateError', 'Error updating status type'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete a status type
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/employee-status/status-types/${id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to delete status type');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('statusTypes.deleteSuccess', 'Status type deleted successfully'),
        description: t('statusTypes.deleteSuccessDescription', 'The status type has been removed from the system.'),
      });
      // Invalidate the status types query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/employee-status/status-types'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('statusTypes.deleteError', 'Error deleting status type'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reset form state
  const resetForm = () => {
    setFormData({
      name: '',
      iconName: 'Info',
      description: '',
      color: '#6366F1',
      durationDays: null,
      isActive: true,
    });
    setSelectedStatusType(null);
  };

  // Handle form input changes
  const handleInputChange = (key: keyof StatusTypeInput, value: any) => {
    setFormData({
      ...formData,
      [key]: value,
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStatusType) {
      // Update existing status type
      updateMutation.mutate({
        id: selectedStatusType.id,
        data: formData,
      });
    } else {
      // Create new status type
      createMutation.mutate(formData);
    }
  };

  // Handle edit click
  const handleEditClick = (statusType: StatusType) => {
    setSelectedStatusType(statusType);
    setFormData({
      name: statusType.name,
      iconName: statusType.iconName,
      description: statusType.description || '',
      color: statusType.color,
      durationDays: statusType.durationDays,
      isActive: statusType.isActive,
    });
    setIsDialogOpen(true);
  };

  // Handle add new click
  const handleAddClick = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (id: number) => {
    if (window.confirm(t('statusTypes.confirmDelete', 'Are you sure you want to delete this status type? This action cannot be undone.'))) {
      deleteMutation.mutate(id);
    }
  };

  // Get all Lucide icon names for the dropdown
  const iconNames = ['Cake', 'PalmTree', 'Home', 'GraduationCap', 'Stethoscope', 'Calendar'];

  // Render status icon using emojis
  const renderIcon = (iconName: string) => {
    const iconMap: Record<string, string> = {
      'Cake': '🍰',
      'PalmTree': '🌴', 
      'Home': '🏠',
      'GraduationCap': '🎓',
      'Stethoscope': '🩺',
      'Calendar': '📅'
    };
    return <span className="mr-2">{iconMap[iconName] || '📌'}</span>;
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>{t('statusTypes.title', 'Employee Status Types')}</CardTitle>
            <CardDescription>
              {t('statusTypes.description', 'Configure status indicators that appear next to employee avatars')}
            </CardDescription>
          </div>
          <Button onClick={handleAddClick} className="mt-0">
            <Plus className="mr-1 h-4 w-4" />
            {t('statusTypes.addNew', 'Add New')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center p-8 text-red-500">
              {t('statusTypes.fetchError', 'Error fetching status types')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('statusTypes.statusName', 'Name')}</TableHead>
                  <TableHead>{t('statusTypes.icon', 'Icon')}</TableHead>
                  <TableHead>{t('statusTypes.duration', 'Duration')}</TableHead>
                  <TableHead>{t('statusTypes.isActive', 'Active')}</TableHead>
                  <TableHead>{t('statusTypes.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusTypes?.length > 0 ? (
                  statusTypes.map((statusType: StatusType) => (
                    <TableRow key={statusType.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full mr-2" 
                            style={{ backgroundColor: statusType.color }}
                          ></div>
                          {statusType.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {renderIcon(statusType.iconName)}
                          {statusType.iconName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {statusType.durationDays 
                          ? t('statusTypes.days', '{{count}} days', { count: statusType.durationDays }) 
                          : t('statusTypes.indefinite', 'Indefinite')}
                      </TableCell>
                      <TableCell>
                        {statusType.isActive 
                          ? <span className="text-green-500">{t('statusTypes.active', 'Active')}</span> 
                          : <span className="text-gray-400">{t('statusTypes.inactive', 'Inactive')}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditClick(statusType)}
                            disabled={deleteMutation.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick(statusType.id)}
                            disabled={statusType.isSystem || deleteMutation.isPending}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {t('statusTypes.noDataMessage', 'No status types found. Click "Add New" to create one.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog for adding/editing status types */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedStatusType 
                ? t('statusTypes.editTitle', 'Edit Status Type') 
                : t('statusTypes.addTitle', 'Add New Status Type')}
            </DialogTitle>
            <DialogDescription>
              {t('statusTypes.dialogDescription', 'Configure how this status will appear next to employee avatars.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  {t('statusTypes.name', 'Name')}
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  {t('statusTypes.description', 'Description')}
                </Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="iconName" className="text-right">
                  {t('statusTypes.icon', 'Icon')}
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={formData.iconName} 
                    onValueChange={(value) => handleInputChange('iconName', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectGroup>
                        {iconNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            <div className="flex items-center">
                              <span className="mr-2">
                                {name === 'Cake' ? '🍰' : 
                                 name === 'PalmTree' ? '🌴' : 
                                 name === 'Home' ? '🏠' : 
                                 name === 'GraduationCap' ? '🎓' : 
                                 name === 'Stethoscope' ? '🩺' : 
                                 name === 'Calendar' ? '📅' : '📌'}
                              </span>
                              {name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color" className="text-right">
                  {t('statusTypes.color', 'Color')}
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-8 h-8 p-0">
                        <div 
                          className="w-6 h-6 rounded-full" 
                          style={{ backgroundColor: formData.color }}
                        ></div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="grid grid-cols-8 gap-2">
                        {[
                          '#ef4444', '#f97316', '#f59e0b', '#eab308', 
                          '#84cc16', '#22c55e', '#10b981', '#14b8a6', 
                          '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
                          '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', 
                          '#f43f5e', '#6b7280'
                        ].map((color) => (
                          <Button 
                            key={color}
                            variant="outline"
                            className="w-6 h-6 p-0 m-0"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              handleInputChange('color', color);
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center mt-4">
                        <Input
                          id="colorInput"
                          type="text"
                          value={formData.color}
                          onChange={(e) => handleInputChange('color', e.target.value)}
                          className="flex-1"
                        />
                        <Paintbrush className="ml-2 h-4 w-4" />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div 
                    className="w-8 h-8 rounded-full border" 
                    style={{ backgroundColor: formData.color }}
                  ></div>
                  <span className="text-sm">{formData.color}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="durationDays" className="text-right">
                  {t('statusTypes.duration', 'Duration (days)')}
                </Label>
                <Input
                  id="durationDays"
                  type="number"
                  min="0"
                  value={formData.durationDays !== null ? formData.durationDays : ''}
                  onChange={(e) => handleInputChange(
                    'durationDays', 
                    e.target.value === '' ? null : parseInt(e.target.value)
                  )}
                  className="col-span-3"
                  placeholder={t('statusTypes.indefinitePlaceholder', 'Leave empty for indefinite')}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">
                  {t('statusTypes.isActive', 'Active')}
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive" className="text-sm">
                    {formData.isActive 
                      ? t('statusTypes.statusActive', 'Status is active') 
                      : t('statusTypes.statusInactive', 'Status is inactive')}
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedStatusType 
                  ? t('common.save', 'Save Changes') 
                  : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStatusTypes;