import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  Plus,
  Save,
  Users,
  Building,
  MapPin,
  Crown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  adminScope: string;
  allowedSites: string[];
  allowedDepartments: string[];
  location: string;
  department: string;
}

export default function AdminPermissions() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newSite, setNewSite] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch admin users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAdminPermissions = async (
    userId: number,
    updates: Partial<AdminUser>
  ) => {
    try {
      const response = await fetch(`/api/admin/permissions/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Admin permissions updated successfully',
        });
        fetchAdminUsers();
        setEditingUser(null);
      } else {
        throw new Error('Failed to update permissions');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update admin permissions',
        variant: 'destructive',
      });
    }
  };

  const addSiteToUser = (user: AdminUser) => {
    if (newSite && !user.allowedSites.includes(newSite)) {
      const updatedUser = {
        ...user,
        allowedSites: [...user.allowedSites, newSite],
      };
      setEditingUser(updatedUser);
      setNewSite('');
    }
  };

  const addDepartmentToUser = (user: AdminUser) => {
    if (newDepartment && !user.allowedDepartments.includes(newDepartment)) {
      const updatedUser = {
        ...user,
        allowedDepartments: [...user.allowedDepartments, newDepartment],
      };
      setEditingUser(updatedUser);
      setNewDepartment('');
    }
  };

  const removeSiteFromUser = (user: AdminUser, site: string) => {
    const updatedUser = {
      ...user,
      allowedSites: user.allowedSites.filter((s) => s !== site),
    };
    setEditingUser(updatedUser);
  };

  const removeDepartmentFromUser = (user: AdminUser, department: string) => {
    const updatedUser = {
      ...user,
      allowedDepartments: user.allowedDepartments.filter(
        (d) => d !== department
      ),
    };
    setEditingUser(updatedUser);
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'super':
        return <Crown className="h-4 w-4" />;
      case 'site':
        return <Building className="h-4 w-4" />;
      case 'department':
        return <Users className="h-4 w-4" />;
      case 'hybrid':
        return <MapPin className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'super':
        return 'bg-red-100 text-red-800';
      case 'site':
        return 'bg-blue-100 text-blue-800';
      case 'department':
        return 'bg-green-100 text-green-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Permission Management</h1>
        <p className="text-muted-foreground">
          Manage site and department-based access control for administrators
        </p>
      </div>

      <div className="grid gap-6">
        {adminUsers.map((user) => (
          <Card key={user.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getScopeIcon(user.adminScope)}
                    {user.name}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getScopeColor(user.adminScope)}>
                    {user.adminScope.toUpperCase()} ADMIN
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUser(user)}
                  >
                    Edit Permissions
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Allowed Sites</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.allowedSites?.map((site) => (
                      <Badge key={site} variant="secondary">
                        <Building className="h-3 w-3 mr-1" />
                        {site}
                      </Badge>
                    ))}
                    {(!user.allowedSites || user.allowedSites.length === 0) && (
                      <span className="text-sm text-muted-foreground">
                        All sites
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Allowed Departments
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.allowedDepartments?.map((dept) => (
                      <Badge key={dept} variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {dept}
                      </Badge>
                    ))}
                    {(!user.allowedDepartments ||
                      user.allowedDepartments.length === 0) && (
                      <span className="text-sm text-muted-foreground">
                        All departments
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Permission Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Admin Permissions - {editingUser.name}</CardTitle>
              <CardDescription>{editingUser.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Admin Scope</Label>
                <Select
                  value={editingUser.adminScope}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, adminScope: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super">
                      Super Admin (Full Company Access)
                    </SelectItem>
                    <SelectItem value="site">
                      Site Admin (Multiple Sites Management)
                    </SelectItem>
                    <SelectItem value="department">
                      Department Admin (Multiple Departments Management)
                    </SelectItem>
                    <SelectItem value="hybrid">
                      Hybrid Admin (Sites + Departments)
                    </SelectItem>
                    <SelectItem value="none">No Admin Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(editingUser.adminScope === 'site' ||
                editingUser.adminScope === 'hybrid') && (
                <div>
                  <Label>Allowed Sites</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingUser.allowedSites?.map((site) => (
                      <Badge
                        key={site}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {site}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => removeSiteFromUser(editingUser, site)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new site"
                      value={newSite}
                      onChange={(e) => setNewSite(e.target.value)}
                    />
                    <Button onClick={() => addSiteToUser(editingUser)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {(editingUser.adminScope === 'department' ||
                editingUser.adminScope === 'hybrid') && (
                <div>
                  <Label>Allowed Departments</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingUser.allowedDepartments?.map((dept) => (
                      <Badge
                        key={dept}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {dept}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() =>
                            removeDepartmentFromUser(editingUser, dept)
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new department"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                    />
                    <Button onClick={() => addDepartmentToUser(editingUser)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    updateAdminPermissions(editingUser.id, editingUser)
                  }
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
