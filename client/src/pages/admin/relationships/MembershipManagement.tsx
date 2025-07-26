import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Search,
  UserPlus,
  UserMinus,
  Shield,
  Users,
  Crown,
  Eye,
  Settings,
} from 'lucide-react';

interface SpaceMembership {
  id: number;
  userId: number;
  spaceId: number;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  status: 'active' | 'pending' | 'suspended';
  user: {
    id: number;
    name: string;
    surname?: string;
    email: string;
    avatarUrl?: string;
    jobTitle?: string;
    department?: string;
  };
  space: {
    id: number;
    name: string;
    type: string;
    category: string;
  };
}

interface MembershipFilters {
  search: string;
  space: string;
  role: string;
  status: string;
}

export default function MembershipManagement() {
  const [filters, setFilters] = useState<MembershipFilters>({
    search: '',
    space: 'all',
    role: 'all',
    status: 'all',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: memberships = [], isLoading } = useQuery<SpaceMembership[]>({
    queryKey: ['/api/admin/memberships', filters],
  });

  const { data: spaces = [] } = useQuery<any[]>({
    queryKey: ['/api/channels'],
  });

  const updateMembershipMutation = useMutation({
    mutationFn: async ({ membershipId, updates }: { membershipId: number; updates: any }) => {
      return await apiRequest(`/api/admin/memberships/${membershipId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Membership updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/memberships'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update membership',
        variant: 'destructive',
      });
    },
  });

  const removeMembershipMutation = useMutation({
    mutationFn: async (membershipId: number) => {
      return await apiRequest(`/api/admin/memberships/${membershipId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/memberships'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
    },
  });

  const filteredMemberships = memberships.filter((membership) => {
    const searchTerm = filters.search.toLowerCase();
    const matchesSearch = 
      membership.user.name.toLowerCase().includes(searchTerm) ||
      membership.user.email.toLowerCase().includes(searchTerm) ||
      membership.space.name.toLowerCase().includes(searchTerm);

    const matchesSpace = filters.space === 'all' || membership.spaceId.toString() === filters.space;
    const matchesRole = filters.role === 'all' || membership.role === filters.role;
    const matchesStatus = filters.status === 'all' || membership.status === filters.status;

    return matchesSearch && matchesSpace && matchesRole && matchesStatus;
  });

  const handleFilterChange = (key: keyof MembershipFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRoleUpdate = (membershipId: number, newRole: string) => {
    updateMembershipMutation.mutate({
      membershipId,
      updates: { role: newRole },
    });
  };

  const handleStatusUpdate = (membershipId: number, newStatus: string) => {
    updateMembershipMutation.mutate({
      membershipId,
      updates: { status: newStatus },
    });
  };

  const handleRemoveMember = (membershipId: number) => {
    removeMembershipMutation.mutate(membershipId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'moderator': return Shield;
      case 'member': return Users;
      default: return Users;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'moderator': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalMemberships = memberships.length;
  const activeMemberships = memberships.filter(m => m.status === 'active').length;
  const pendingMemberships = memberships.filter(m => m.status === 'pending').length;
  const uniqueSpaces = new Set(memberships.map(m => m.spaceId)).size;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Membership Management</h1>
          <p className="text-muted-foreground">
            Manage space memberships, roles, and permissions across the organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Bulk Add Members
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Role Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Memberships</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMemberships}</div>
            <p className="text-xs text-muted-foreground">
              Across all spaces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMemberships}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMemberships}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Spaces</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSpaces}</div>
            <p className="text-xs text-muted-foreground">
              With memberships
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Memberships</CardTitle>
          <CardDescription>
            Search and filter space memberships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members or spaces..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.space}
              onValueChange={(value) => handleFilterChange('space', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Spaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Spaces</SelectItem>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id.toString()}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.role}
              onValueChange={(value) => handleFilterChange('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Memberships Table */}
      <Card>
        <CardHeader>
          <CardTitle>Memberships ({filteredMemberships.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Space</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMemberships.map((membership) => {
                const RoleIcon = getRoleIcon(membership.role);
                return (
                  <TableRow key={membership.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={membership.user.avatarUrl} />
                          <AvatarFallback>
                            {membership.user.name.charAt(0)}
                            {membership.user.surname?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {membership.user.name} {membership.user.surname}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {membership.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{membership.space.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {membership.space.category} • {membership.space.type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={membership.role}
                        onValueChange={(value) => handleRoleUpdate(membership.id, value)}
                        disabled={updateMembershipMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <div className="flex items-center gap-2">
                            <RoleIcon className="h-4 w-4" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={membership.status}
                        onValueChange={(value) => handleStatusUpdate(membership.id, value)}
                        disabled={updateMembershipMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(membership.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {membership.user.name} from {membership.space.name}? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(membership.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove Member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}