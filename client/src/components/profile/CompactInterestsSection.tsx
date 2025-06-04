import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Plus, Users, Search, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface Interest {
  id: number;
  name: string;
  category: string;
}

interface CompactInterestsSectionProps {
  interests: Interest[];
  isEditing: boolean;
  onInterestsChange: (interests: Interest[]) => void;
}

interface InterestStats {
  memberCount: number;
  isMember: boolean;
}

interface DatabaseInterest {
  id: number;
  label: string;
  category: string;
  icon?: string;
}

export function CompactInterestsSection({ interests, isEditing, onInterestsChange }: CompactInterestsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch interest statistics
  const { data: interestStats } = useQuery({
    queryKey: ['/api/interests/stats'],
    enabled: !isEditing
  });

  // Fetch all available interests from database
  const { data: allInterests } = useQuery({
    queryKey: ['/api/interests'],
    enabled: !isEditing
  });

  // Add interest mutation
  const addInterestMutation = useMutation({
    mutationFn: async (interestId: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await fetch(`/api/employees/${user.id}/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ interestId })
      });
      if (!response.ok) throw new Error('Failed to add interest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interests/stats'] });
      setIsAddDialogOpen(false);
    }
  });

  // Remove interest mutation
  const removeInterestMutation = useMutation({
    mutationFn: async (interestId: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await fetch(`/api/employees/${user.id}/interests/${interestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to remove interest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interests/stats'] });
    }
  });

  const getInterestStats = (interestName: string): InterestStats => {
    if (!interestStats || typeof interestStats !== 'object') return { memberCount: 0, isMember: false };
    return (interestStats as Record<string, InterestStats>)[interestName] || { memberCount: 0, isMember: false };
  };

  // Get unique categories from database interests
  const allInterestsArray = (allInterests as DatabaseInterest[] || []);
  const categorySet = new Set(allInterestsArray.map(i => i.category));
  const categories = ['all', ...Array.from(categorySet)];

  // Filter interests based on search and category
  const filteredInterests = allInterestsArray.filter(interest => {
    const matchesSearch = interest.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || interest.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Check if user has an interest
  const hasInterest = (interestLabel: string) => {
    return interests.some(userInterest => userInterest.name === interestLabel);
  };

  // Find database interest by label
  const findDatabaseInterest = (label: string): DatabaseInterest | undefined => {
    return (allInterests as DatabaseInterest[] || []).find(i => i.label === label);
  };

  const handleAddInterest = async (interest: DatabaseInterest) => {
    await addInterestMutation.mutateAsync(interest.id);
    // Update local state
    const newInterest: Interest = {
      id: interest.id,
      name: interest.label,
      category: interest.category
    };
    onInterestsChange([...interests, newInterest]);
  };

  const handleRemoveInterest = async (interestName: string) => {
    const dbInterest = findDatabaseInterest(interestName);
    if (dbInterest) {
      await removeInterestMutation.mutateAsync(dbInterest.id);
      // Update local state
      onInterestsChange(interests.filter(i => i.name !== interestName));
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Interests & Groups
          </CardTitle>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                Add Interest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Add New Interest</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search interests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                  <TabsList className="grid grid-cols-4 w-full mb-2">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="Sport & Fitness" className="text-xs">Sports</TabsTrigger>
                    <TabsTrigger value="Technology & Gaming" className="text-xs">Tech</TabsTrigger>
                    <TabsTrigger value="Arts & Creativity" className="text-xs">Arts</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="Food & Drinks" className="text-xs">Food</TabsTrigger>
                    <TabsTrigger value="Lifestyle & Wellness" className="text-xs">Lifestyle</TabsTrigger>
                    <TabsTrigger value="Entertainment & Pop Culture" className="text-xs">Entertainment</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-1 w-full mt-2">
                    <TabsTrigger value="Social Impact & Learning" className="text-xs">Social Impact</TabsTrigger>
                  </TabsList>
                  
                  <ScrollArea className="h-96 mt-4">
                    <div className="space-y-1 p-1">
                      {filteredInterests.map((interest) => {
                        const userHasInterest = hasInterest(interest.label);
                        const stats = getInterestStats(interest.label);
                        
                        return (
                          <div
                            key={interest.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              userHasInterest 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-lg">{interest.icon || '📌'}</span>
                              <span className="text-sm font-medium truncate">{interest.label}</span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                                <Users className="h-3 w-3" />
                                <span>{stats.memberCount}</span>
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant={userHasInterest ? "destructive" : "default"}
                              className="h-8 w-8 p-0 ml-3 shrink-0"
                              onClick={() => userHasInterest 
                                ? handleRemoveInterest(interest.label) 
                                : handleAddInterest(interest)
                              }
                              disabled={addInterestMutation.isPending || removeInterestMutation.isPending}
                            >
                              {userHasInterest ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {interests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => {
              const stats = getInterestStats(interest.name);
              return (
                <Badge 
                  key={interest.id} 
                  variant="secondary" 
                  className="flex items-center gap-1 px-3 py-1"
                >
                  <span>{interest.name}</span>
                  <div className="flex items-center gap-1 ml-1">
                    <Users className="h-3 w-3" />
                    <span className="text-xs">{stats.memberCount}</span>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => handleRemoveInterest(interest.name)}
                      className="ml-1 hover:text-destructive"
                      disabled={removeInterestMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No interests added yet</p>
            <p className="text-xs">Click "Add Interest" to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}