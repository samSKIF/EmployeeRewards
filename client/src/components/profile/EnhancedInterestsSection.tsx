import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Edit, Users, MessageCircle, ArrowRight, Plus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Interest {
  id: number;
  label: string;
  category: string;
  icon: string;
  memberCount?: number;
  hasGroup?: boolean;
  groupId?: number;
  userIsMember?: boolean;
}

interface InterestsSectionProps {
  interests: Interest[];
  isEditing: boolean;
  onInterestsChange: (interests: Interest[]) => void;
}

interface InterestGroup {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  interest: {
    id: number;
    label: string;
    category: string;
    icon: string;
  };
}

interface GroupPost {
  id: number;
  content: string;
  imageUrl?: string;
  type: string;
  tags: string[];
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  user: {
    id: number;
    name: string;
    avatarUrl?: string;
    jobTitle?: string;
    department?: string;
  };
}

const EnhancedInterestsSection: React.FC<InterestsSectionProps> = ({
  interests,
  isEditing,
  onInterestsChange,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newPostContent, setNewPostContent] = useState('');

  // Fetch interests with member counts
  const { data: interestsWithCounts, isLoading: loadingCounts } = useQuery({
    queryKey: ['/api/interests/with-counts'],
    enabled: !isEditing,
  });

  // Fetch group details when selected
  const { data: groupData, isLoading: loadingGroup } = useQuery({
    queryKey: ['/api/interest-groups', selectedGroupId],
    enabled: !!selectedGroupId,
  });

  // Create/join interest group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (interestId: number) => {
      return apiRequest(`/api/interest-groups/${interestId}`, {
        method: 'POST',
      });
    },
    onSuccess: (data, interestId) => {
      toast({
        title: 'Success',
        description: data.message,
      });
      setSelectedGroupId(data.group.id);
      queryClient.invalidateQueries({
        queryKey: ['/api/interests/with-counts'],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join group',
        variant: 'destructive',
      });
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async ({
      groupId,
      content,
    }: {
      groupId: number;
      content: string;
    }) => {
      return apiRequest(`/api/interest-groups/${groupId}/posts`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      setNewPostContent('');
      toast({
        title: 'Success',
        description: 'Post created successfully',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/interest-groups', selectedGroupId],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post',
        variant: 'destructive',
      });
    },
  });

  // Get the enhanced interests data
  const displayInterests = isEditing
    ? interests
    : interestsWithCounts || interests;

  // Group interests by category
  const groupedInterests = displayInterests.reduce(
    (acc: Record<string, Interest[]>, interest) => {
      if (!acc[interest.category]) {
        acc[interest.category] = [];
      }
      acc[interest.category].push(interest);
      return acc;
    },
    {}
  );

  const handleJoinGroup = async (interest: Interest) => {
    if (interest.hasGroup && interest.groupId) {
      setSelectedGroupId(interest.groupId);
    } else {
      joinGroupMutation.mutate(interest.id);
    }
  };

  const handleCreatePost = () => {
    if (!selectedGroupId || !newPostContent.trim()) return;

    createPostMutation.mutate({
      groupId: selectedGroupId,
      content: newPostContent.trim(),
    });
  };

  if (isEditing) {
    // Show the original editing interface
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Interests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(groupedInterests).map(
              ([category, categoryInterests]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {categoryInterests.map((interest) => (
                      <Badge
                        key={interest.id}
                        variant="secondary"
                        className="flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          const updatedInterests = interests.filter(
                            (i) => i.id !== interest.id
                          );
                          onInterestsChange(updatedInterests);
                        }}
                      >
                        <span>{interest.icon}</span>
                        <span>{interest.label}</span>
                        <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Interests & Communities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCounts ? (
            <div className="text-center py-8">Loading interests...</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedInterests).map(
                ([category, categoryInterests]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="font-semibold text-lg border-b pb-2">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryInterests.map((interest) => (
                        <div
                          key={interest.id}
                          className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{interest.icon}</span>
                              <span className="font-medium">
                                {interest.label}
                              </span>
                            </div>
                            {interest.userIsMember && (
                              <Badge variant="outline" className="text-xs">
                                Member
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{interest.memberCount || 0} members</span>
                            </div>

                            {interest.userIsMember && (
                              <Button
                                size="sm"
                                variant={
                                  interest.hasGroup ? 'default' : 'outline'
                                }
                                onClick={() => handleJoinGroup(interest)}
                                className="flex items-center gap-1"
                              >
                                <MessageCircle className="h-3 w-3" />
                                {interest.hasGroup
                                  ? 'Open Group'
                                  : 'Create Group'}
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interest Group Dialog */}
      <Dialog
        open={!!selectedGroupId}
        onOpenChange={() => setSelectedGroupId(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {groupData?.group?.interest?.icon && (
                <span className="text-xl">{groupData.group.interest.icon}</span>
              )}
              {groupData?.group?.name || 'Interest Group'}
            </DialogTitle>
          </DialogHeader>

          {loadingGroup ? (
            <div className="text-center py-8">Loading group...</div>
          ) : groupData ? (
            <div className="space-y-6">
              {/* Group Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  {groupData.group.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {groupData.group.memberCount} members
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {groupData.posts?.length || 0} posts
                  </span>
                </div>
              </div>

              {/* Create Post */}
              <div className="space-y-3">
                <h4 className="font-medium">Share with the community</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="What's on your mind?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreatePost}
                    disabled={
                      !newPostContent.trim() || createPostMutation.isPending
                    }
                  >
                    {createPostMutation.isPending ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>

              {/* Posts */}
              <div className="space-y-4">
                <h4 className="font-medium">Recent Posts</h4>
                {groupData.posts?.length > 0 ? (
                  <div className="space-y-4">
                    {groupData.posts.map((post: GroupPost) => (
                      <div
                        key={post.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {post.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {post.user.name}
                              </span>
                              {post.user.jobTitle && (
                                <span className="text-xs text-muted-foreground">
                                  {post.user.jobTitle}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm">{post.content}</p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                          <span>{post.likeCount} likes</span>
                          <span>{post.commentCount} comments</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No posts yet. Be the first to share something!</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedInterestsSection;
