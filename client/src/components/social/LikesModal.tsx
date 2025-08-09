import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, Award, Sparkles } from 'lucide-react';
import { User } from '@platform/sdk/types';
import { useLocation } from 'wouter';

interface LikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  reactionType?: string;
}

interface ReactionWithUser {
  id: number;
  type: string;
  user: {
    id: number;
    name: string;
    avatarUrl?: string;
    jobTitle?: string;
  };
  createdAt: string;
}

export const LikesModal = ({
  isOpen,
  onClose,
  postId,
  reactionType,
}: LikesModalProps) => {
  const [, navigate] = useLocation();

  // Fetch users who reacted to the post
  const { data: reactions = [], isLoading } = useQuery<ReactionWithUser[]>({
    queryKey: ['/api/social/posts', postId, 'reactions', reactionType],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const url = reactionType
        ? `/api/social/posts/${postId}/reactions?type=${reactionType}`
        : `/api/social/posts/${postId}/reactions`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch reactions');
      }

      return res.json();
    },
    enabled: isOpen,
  });

  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <ThumbsUp className="h-4 w-4 text-teal-600" />;
      case 'celebrate':
        return <Award className="h-4 w-4 text-amber-600" />;
      case 'insightful':
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      default:
        return <ThumbsUp className="h-4 w-4 text-teal-600" />;
    }
  };

  const getReactionColor = (type: string) => {
    switch (type) {
      case 'like':
        return 'bg-teal-100 text-teal-700';
      case 'celebrate':
        return 'bg-amber-100 text-amber-700';
      case 'insightful':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-teal-100 text-teal-700';
    }
  };

  const handleUserClick = (userId: number) => {
    navigate(`/profile/${userId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reactionType ? (
              <div className="flex items-center gap-2">
                {getReactionIcon(reactionType)}
                <span className="capitalize">{reactionType}s</span>
              </div>
            ) : (
              'Reactions'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 animate-pulse"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                  <div className="w-16 h-6 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : reactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No reactions yet
            </div>
          ) : (
            <div className="space-y-3">
              {reactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleUserClick(reaction.user.id)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={reaction.user.avatarUrl}
                      alt={reaction.user.name}
                    />
                    <AvatarFallback className="bg-teal-100 text-teal-700">
                      {reaction.user.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {reaction.user.name}
                    </div>
                    {reaction.user.jobTitle && (
                      <div className="text-sm text-gray-500">
                        {reaction.user.jobTitle}
                      </div>
                    )}
                  </div>

                  <Badge
                    variant="secondary"
                    className={`${getReactionColor(reaction.type)} flex items-center gap-1`}
                  >
                    {getReactionIcon(reaction.type)}
                    <span className="capitalize">{reaction.type}</span>
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
