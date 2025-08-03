import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, MoreVertical, Edit, Trash2, Building } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Location {
  id: number;
  name: string;
  address?: string;
  timezone?: string;
  is_active: boolean;
  created_at: string;
  employee_count?: number;
}

export default function LocationManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    timezone: '',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch employees (same as Department Management)
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Fetch locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/locations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch locations:', response.status, response.statusText);
        setLocations([]);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/admin/locations', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Location created successfully' });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchLocations(); // Refresh the locations list
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create location',
        variant: 'destructive',
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/locations/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Location updated successfully' });
      setIsEditDialogOpen(false);
      setEditingLocation(null);
      resetForm();
      fetchLocations(); // Refresh the locations list
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update location',
        variant: 'destructive',
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/locations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Location deleted successfully' });
      fetchLocations(); // Refresh the locations list
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete location',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      timezone: '',
    });
  };

  const handleCreateLocation = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
      timezone: location.timezone || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    const submitData = {
      name: formData.name,
      address: formData.address || null,
      timezone: formData.timezone || null,
    };
    createLocationMutation.mutate(submitData);
  };

  const handleSubmitEdit = () => {
    if (!editingLocation) return;

    const submitData = {
      name: formData.name,
      address: formData.address || null,
      timezone: formData.timezone || null,
    };
    updateLocationMutation.mutate({ id: editingLocation.id, data: submitData });
  };

  const handleDeleteLocation = (location: Location) => {
    if (window.confirm(`Are you sure you want to delete the "${location.name}" location? This action cannot be undone.`)) {
      deleteLocationMutation.mutate(location.id);
    }
  };

  // Calculate stats (same logic as Department Management)
  const totalEmployees = employees.length; // Use actual employee count
  const activeLocations = locations.filter(loc => loc.is_active).length;

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Location Management</h1>
          <p className="text-gray-600">Manage your organization's locations and offices</p>
        </div>
        <Button 
          onClick={handleCreateLocation} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 shadow-lg"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Location
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Locations</p>
              <p className="text-2xl font-bold">{locations.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-green-100 rounded-lg mr-4">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold">{totalEmployees}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="p-2 bg-purple-100 rounded-lg mr-4">
              <Building className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Locations</p>
              <p className="text-2xl font-bold">{activeLocations}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Locations Message */}
      {locations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Locations Yet</h3>
            <p className="text-gray-600 text-center mb-6">
              Get started by creating your first location to organize your workforce by office or region.
            </p>
            <Button onClick={handleCreateLocation}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Location
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Locations Table */}
      {locations.length > 0 && (
        <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>Manage and organize your company locations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-500 mr-3" />
                      <span className="font-medium">{location.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-600">{location.address || 'No address'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-600">{location.timezone || 'Not set'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {employees.filter(emp => emp.location === location.name && emp.status === 'active').length} employees
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={location.is_active ? "default" : "secondary"}>
                      {location.is_active ? 'Active' : 'Inactive'}
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
                        <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteLocation(location)}
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
        </CardContent>
        </Card>
      )}

      {/* Create Location Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Location</DialogTitle>
            <DialogDescription>Add a new location to organize your workforce</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., New York Office, London HQ"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g., 123 Main St, New York, NY 10001"
              />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                placeholder="e.g., America/New_York, Europe/London"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitCreate}
              disabled={!formData.name.trim() || createLocationMutation.isPending}
            >
              {createLocationMutation.isPending ? 'Creating...' : 'Create Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update location information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Location Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., New York Office, London HQ"
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g., 123 Main St, New York, NY 10001"
              />
            </div>
            <div>
              <Label htmlFor="edit-timezone">Timezone</Label>
              <Input
                id="edit-timezone"
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                placeholder="e.g., America/New_York, Europe/London"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEdit}
              disabled={!formData.name.trim() || updateLocationMutation.isPending}
            >
              {updateLocationMutation.isPending ? 'Updating...' : 'Update Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}