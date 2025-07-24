import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  MessageCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Group {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  isActive: boolean;
  interest: {
    id: number;
    label: string;
    category: string;
    icon: string;
  };
}

interface MyGroup extends Group {
  role: string;
  joinedAt: string;
}

export default function GroupsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch all groups
  const { data: allGroups, isLoading: isLoadingAll } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    enabled: true,
  });

  // Fetch user's groups
  const { data: myGroups, isLoading: isLoadingMy } = useQuery<MyGroup[]>({
    queryKey: ['/api/groups/my-groups'],
    enabled: true,
  });

  // Filter groups based on search and category
  const filteredGroups =
    allGroups?.filter((group) => {
      const matchesSearch =
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.interest.label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' ||
        group.interest.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }) || [];

  // Get unique categories
  const categories = Array.from(
    new Set(allGroups?.map((g) => g.interest.category) || [])
  );

  const GroupCard = ({
    group,
    isJoined = false,
    userRole,
  }: {
    group: Group;
    isJoined?: boolean;
    userRole?: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{group.interest.icon}</div>
            <div>
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <CardDescription className="text-sm">
                {group.description}
              </CardDescription>
            </div>
          </div>
          {isJoined && userRole && (
            <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
              {userRole}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{group.memberCount} members</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {group.interest.category}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <MessageCircle className="h-4 w-4 mr-1" />
              View
            </Button>
            {!isJoined && <Button size="sm">Join Group</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const LoadingSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Interest Groups
        </h1>
        <p className="text-muted-foreground">
          Connect with colleagues who share your interests and hobbies
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myGroups?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Groups you've joined
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allGroups?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available in your organization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Interest categories</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Groups</TabsTrigger>
          <TabsTrigger value="my-groups">My Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Groups Grid */}
          {isLoadingAll ? (
            <LoadingSkeleton />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => {
                const isJoined = myGroups?.some((mg) => mg.id === group.id);
                return (
                  <GroupCard key={group.id} group={group} isJoined={isJoined} />
                );
              })}
            </div>
          )}

          {!isLoadingAll && filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No groups found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No groups have been created yet. Add interests to your profile to start creating groups!'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-groups" className="space-y-6">
          {isLoadingMy ? (
            <LoadingSkeleton />
          ) : myGroups && myGroups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isJoined={true}
                  userRole={group.role}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                You haven't joined any groups yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Add interests to your profile to automatically join related
                groups and connect with colleagues
              </p>
              <Button>Explore Groups</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
