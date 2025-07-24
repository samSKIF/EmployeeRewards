import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Heart,
  Plus,
  Users,
  Search,
  X,
  Edit,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
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

export function CompactInterestsSection({
  interests,
  isEditing,
  onInterestsChange,
}: CompactInterestsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch interest statistics
  const { data: interestStats } = useQuery({
    queryKey: ['/api/interests/stats'],
    enabled: !isEditing,
  });

  // Fetch all available interests from database
  const { data: allInterests } = useQuery({
    queryKey: ['/api/interests'],
    enabled: !isEditing,
  });

  // Fetch user's selected interests
  const { data: userInterests } = useQuery({
    queryKey: ['/api/employees', user?.id, 'interests'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/employees/${user.id}/interests`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !isEditing && !!user?.id,
  });

  // Add interest mutation
  const addInterestMutation = useMutation({
    mutationFn: async (interestId: number) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get current interests first
      const currentInterestsResponse = await fetch(
        `/api/employees/${user.id}/interests`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      let currentInterestIds: number[] = [];
      if (currentInterestsResponse.ok) {
        const currentInterests = await currentInterestsResponse.json();
        currentInterestIds = currentInterests.map(
          (interest: any) => interest.id
        );
      }

      // Check if interest already exists
      if (currentInterestIds.includes(interestId)) {
        return { message: 'Interest already in your profile' };
      }

      // Add the new interest to the existing ones
      const updatedInterestIds = [...currentInterestIds, interestId];

      const response = await fetch(`/api/employees/${user.id}/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ interestIds: updatedInterestIds }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to add interest';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use status text or default message
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interests/stats'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/employees', user?.id, 'interests'],
      });
      // Keep dialog open after adding interest
    },
  });

  // Remove interest mutation
  const removeInterestMutation = useMutation({
    mutationFn: async (interestId: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      const response = await fetch(
        `/api/employees/${user.id}/interests/${interestId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to remove interest');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interests/stats'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/employees', user?.id, 'interests'],
      });
    },
  });

  const getInterestStats = (interestName: string): InterestStats => {
    if (!interestStats || typeof interestStats !== 'object')
      return { memberCount: 0, isMember: false };
    return (
      (interestStats as Record<string, InterestStats>)[interestName] || {
        memberCount: 0,
        isMember: false,
      }
    );
  };

  // Get unique categories from database interests
  const allInterestsArray = (allInterests as DatabaseInterest[]) || [];
  const categorySet = new Set(allInterestsArray.map((i) => i.category));
  const categories = ['popular', ...Array.from(categorySet)];

  // Filter interests based on search and category
  const filteredInterests = allInterestsArray
    .filter((interest) => {
      const matchesSearch = interest.label
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'popular' ||
        interest.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Sort by member count descending for popular tab
      if (selectedCategory === 'popular') {
        const statsA = getInterestStats(a.label);
        const statsB = getInterestStats(b.label);
        return statsB.memberCount - statsA.memberCount;
      }
      return 0;
    });

  // Check if user has an interest
  const hasInterest = (interestLabel: string) => {
    return interests.some(
      (userInterest) => userInterest.name === interestLabel
    );
  };

  // Find database interest by label
  const findDatabaseInterest = (
    label: string
  ): DatabaseInterest | undefined => {
    return ((allInterests as DatabaseInterest[]) || []).find(
      (i) => i.label === label
    );
  };

  const handleAddInterest = async (interest: DatabaseInterest) => {
    await addInterestMutation.mutateAsync(interest.id);
    // Update local state
    const newInterest: Interest = {
      id: interest.id,
      name: interest.label,
      category: interest.category,
    };
    onInterestsChange([...interests, newInterest]);
  };

  const handleRemoveInterest = async (interestName: string) => {
    const dbInterest = findDatabaseInterest(interestName);
    if (dbInterest) {
      await removeInterestMutation.mutateAsync(dbInterest.id);
      // Update local state
      onInterestsChange(interests.filter((i) => i.name !== interestName));
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Interests & Hobbies
          </CardTitle>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8">
                <Edit className="h-4 w-4" />
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

                <Tabs
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <div className="overflow-x-auto">
                    <TabsList className="flex w-max min-w-full mb-2">
                      <TabsTrigger
                        value="popular"
                        className="text-xs whitespace-nowrap"
                      >
                        Popular
                      </TabsTrigger>
                      <TabsTrigger
                        value="Sport & Fitness"
                        className="text-xs whitespace-nowrap"
                      >
                        Sports
                      </TabsTrigger>
                      <TabsTrigger
                        value="Technology & Gaming"
                        className="text-xs whitespace-nowrap"
                      >
                        Tech
                      </TabsTrigger>
                      <TabsTrigger
                        value="Arts & Creativity"
                        className="text-xs whitespace-nowrap"
                      >
                        Arts
                      </TabsTrigger>
                      <TabsTrigger
                        value="Food & Drinks"
                        className="text-xs whitespace-nowrap"
                      >
                        Food
                      </TabsTrigger>
                      <TabsTrigger
                        value="Lifestyle & Wellness"
                        className="text-xs whitespace-nowrap"
                      >
                        Lifestyle
                      </TabsTrigger>
                      <TabsTrigger
                        value="Entertainment & Pop Culture"
                        className="text-xs whitespace-nowrap"
                      >
                        Entertainment
                      </TabsTrigger>
                      <TabsTrigger
                        value="Social Impact & Learning"
                        className="text-xs whitespace-nowrap"
                      >
                        Social Impact
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <ScrollArea className="h-64 mt-4">
                    <div className="flex flex-wrap gap-2 p-1">
                      {filteredInterests
                        .filter((interest) => !hasInterest(interest.label))
                        .map((interest) => {
                          const stats = getInterestStats(interest.label);

                          return (
                            <div
                              key={interest.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                              onClick={() => handleAddInterest(interest)}
                            >
                              <span className="text-sm">
                                {interest.icon || '📌'}
                              </span>
                              <span className="text-xs font-medium whitespace-nowrap">
                                {interest.label}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-2 w-2" />
                                <span>{stats.memberCount}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </Tabs>

                {/* Selected Interests Section - Bottom */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">
                    Your Selected Interests
                  </h4>
                  {userInterests && userInterests.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userInterests.map((interest: any) => {
                        const stats = getInterestStats(interest.label);
                        return (
                          <div
                            key={interest.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors"
                            onClick={() =>
                              removeInterestMutation.mutate(interest.id)
                            }
                            title="Click to remove"
                          >
                            <span className="text-sm">
                              {interest.icon || '📌'}
                            </span>
                            <span className="font-medium whitespace-nowrap">
                              {interest.label}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{stats.memberCount}</span>
                            </div>
                            <X className="h-3 w-3 ml-1 text-muted-foreground" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">
                      No interests selected yet. Click interests above to add
                      them.
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {userInterests && userInterests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {userInterests.map((interest: any) => {
              const stats = getInterestStats(interest.label);
              return (
                <div key={interest.id} className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-1 text-black border-gray-300"
                  >
                    <span className="text-sm">{interest.icon || '📌'}</span>
                    <span>{interest.label}</span>
                    <div className="flex items-center gap-1 ml-1">
                      <Users className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        {stats.memberCount}
                      </span>
                    </div>
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                    onClick={() =>
                      (window.location.href = `/groups?interest=${encodeURIComponent(interest.label)}`)
                    }
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Join Group
                  </Button>
                </div>
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
