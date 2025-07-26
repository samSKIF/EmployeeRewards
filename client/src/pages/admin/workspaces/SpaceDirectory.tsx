import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Search,
  Plus,
  Users,
  MessageSquare,
  TrendingUp,
  Settings,
  Eye,
  Calendar,
} from 'lucide-react';
import { formatDate } from 'date-fns';

interface Space {
  id: number;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'restricted';
  category: string;
  memberCount: number;
  postCount: number;
  lastActivity?: string;
  createdAt: string;
  createdBy: number;
  isActive: boolean;
  avatarUrl?: string;
  tags?: string[];
}

interface SpaceFilters {
  search: string;
  type: string;
  category: string;
  status: string;
}

const spaceCategories = [
  'Teams',
  'Projects',
  'Interests',
  'Departments',
  'Locations',
  'Learning',
  'Social',
  'Other',
];

export default function SpaceDirectory() {
  const [filters, setFilters] = useState<SpaceFilters>({
    search: '',
    type: 'all',
    category: 'all',
    status: 'all',
  });

  const { data: spaces = [], isLoading } = useQuery<Space[]>({
    queryKey: ['/api/channels', filters],
  });

  const filteredSpaces = spaces.filter((space) => {
    const matchesSearch = 
      space.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      space.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
      space.category.toLowerCase().includes(filters.search.toLowerCase());

    const matchesType = filters.type === 'all' || space.type === filters.type;
    const matchesCategory = filters.category === 'all' || space.category === filters.category;
    const matchesStatus = 
      filters.status === 'all' || 
      (filters.status === 'active' && space.isActive) ||
      (filters.status === 'inactive' && !space.isActive);

    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  const handleFilterChange = (key: keyof SpaceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'private': return 'bg-blue-100 text-blue-800';
      case 'restricted': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  const totalSpaces = spaces.length;
  const activeSpaces = spaces.filter(space => space.isActive).length;
  const totalMembers = spaces.reduce((sum, space) => sum + space.memberCount, 0);
  const averageEngagement = totalSpaces > 0 
    ? Math.round(spaces.reduce((sum, space) => sum + space.postCount, 0) / totalSpaces)
    : 0;

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
          <h1 className="text-3xl font-bold">Space Directory</h1>
          <p className="text-muted-foreground">
            Manage all spaces and their engagement across your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/workspaces/space-analytics">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/workspaces/space-management">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Space
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spaces</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSpaces}</div>
            <p className="text-xs text-muted-foreground">
              All spaces in organization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Spaces</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSpaces}</div>
            <p className="text-xs text-muted-foreground">
              Currently active spaces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Across all spaces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageEngagement}</div>
            <p className="text-xs text-muted-foreground">
              Posts per space
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Spaces</CardTitle>
          <CardDescription>
            Find specific spaces or filter by criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search spaces..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Space Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.category}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {spaceCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Spaces Table */}
      <Card>
        <CardHeader>
          <CardTitle>Spaces List ({filteredSpaces.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Space</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSpaces.map((space) => (
                <TableRow key={space.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={space.avatarUrl} />
                        <AvatarFallback>
                          {space.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{space.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {space.description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getTypeColor(space.type)}
                      variant="secondary"
                    >
                      {space.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{space.category}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{space.memberCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>{space.postCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {space.lastActivity 
                      ? formatDate(new Date(space.lastActivity), 'MMM dd, yyyy')
                      : 'No activity'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getStatusColor(space.isActive)}
                      variant="secondary"
                    >
                      {space.isActive ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/spaces/${space.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/workspaces/space-management/${space.id}`}>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity Summary
          </CardTitle>
          <CardDescription>
            Overview of space activity and engagement trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Most Active Spaces</h4>
              <div className="space-y-1">
                {filteredSpaces
                  .sort((a, b) => b.postCount - a.postCount)
                  .slice(0, 3)
                  .map((space) => (
                    <div key={space.id} className="flex justify-between text-sm">
                      <span className="truncate">{space.name}</span>
                      <span className="text-muted-foreground">{space.postCount} posts</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Largest Spaces</h4>
              <div className="space-y-1">
                {filteredSpaces
                  .sort((a, b) => b.memberCount - a.memberCount)
                  .slice(0, 3)
                  .map((space) => (
                    <div key={space.id} className="flex justify-between text-sm">
                      <span className="truncate">{space.name}</span>
                      <span className="text-muted-foreground">{space.memberCount} members</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Categories</h4>
              <div className="space-y-1">
                {spaceCategories
                  .map(category => ({
                    category,
                    count: filteredSpaces.filter(space => space.category === category).length
                  }))
                  .filter(item => item.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 3)
                  .map((item) => (
                    <div key={item.category} className="flex justify-between text-sm">
                      <span>{item.category}</span>
                      <span className="text-muted-foreground">{item.count} spaces</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common space management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/workspaces/space-management">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-medium">Create New Space</h4>
                  <p className="text-sm text-muted-foreground">
                    Set up a new space for your team
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/workspaces/space-analytics">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-medium">View Analytics</h4>
                  <p className="text-sm text-muted-foreground">
                    Analyze space engagement and growth
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/relationships/membership-management">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-medium">Manage Members</h4>
                  <p className="text-sm text-muted-foreground">
                    Control space memberships and roles
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}