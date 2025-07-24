import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Users, Globe, Lock, MoreHorizontal, Edit, Archive } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CreateSpaceDialog } from '@/components/spaces/CreateSpaceDialog';

interface Space {
  id: number;
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  memberCount: number;
  createdAt: string;
}

export function GroupsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch spaces data
  const {
    data: spaces = [],
    isLoading: spacesLoading,
    refetch: refetchSpaces,
  } = useQuery({
    queryKey: ['/api/admin/spaces'],
  });

  // Create space mutation
  const createSpaceMutation = useMutation({
    mutationFn: async (spaceData: any) => {
      return apiRequest('POST', '/api/channels', spaceData);
    },
    onSuccess: () => {
      refetchSpaces();
      setShowCreateDialog(false);
      toast({
        title: 'Success',
        description: 'Space created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create space',
        variant: 'destructive',
      });
    },
  });

  // Filter spaces based on search and category
  const filteredSpaces = Array.isArray(spaces)
    ? spaces.filter((space: Space) => {
        const matchesSearch =
          space.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          space.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = selectedCategory === 'all' || space.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
    : [];

  // Get unique categories
  const categories = Array.from(new Set(spaces.map((space: Space) => space.category).filter(Boolean)));

  const handleCreateSpace = async (spaceData: any) => {
    await createSpaceMutation.mutateAsync(spaceData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Spaces Management</h2>
          <p className="text-gray-600">Create and manage workspace collaboration areas</p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Space
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search spaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{spaces.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Public Spaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">
                {spaces.filter((space: Space) => !space.isPrivate).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Private Spaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">
                {spaces.filter((space: Space) => space.isPrivate).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{categories.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Spaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpaces.map((space: Space) => (
          <Card key={space.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {space.isPrivate ? (
                    <Lock className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Globe className="h-4 w-4 text-green-500" />
                  )}
                  <CardTitle className="text-lg">{space.name}</CardTitle>
                </div>
                
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 line-clamp-2">
                {space.description || 'No description available'}
              </p>
              
              <div className="flex items-center justify-between">
                <Badge variant="outline">{space.category}</Badge>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="h-3 w-3" />
                  {space.memberCount || 0} members
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Archive className="h-3 w-3 mr-1" />
                  Archive
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSpaces.length === 0 && !spacesLoading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No spaces found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search criteria'
              : 'Create your first space to get started'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Space
            </Button>
          )}
        </div>
      )}

      {/* Create Space Dialog */}
      <CreateSpaceDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateSpace}
      />
    </div>
  );
}