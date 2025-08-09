import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CommentWithUser, User } from '@platform/sdk/types';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CommentsProps {
  postId: number;
  currentUser: User | undefined;
}

export const Comments = ({ postId, currentUser }: CommentsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comments for the post
  const { data: comments = [], isLoading } = useQuery<CommentWithUser[]>({
    queryKey: ['/api/social/posts', postId, 'comments'],
    queryFn: async () => {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');

      // Create request with token
      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch comments');
      }

      return res.json();
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');

      // Create request with token
      const res = await fetch(`/api/social/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to delete comment');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/social/posts', postId, 'comments'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/social/posts'],
      });
      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete comment',
        variant: 'destructive',
      });
    },
  });

  // Handle comment delete
  const handleDeleteComment = (commentId: number) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  // Add comment reaction mutation
  const addCommentReactionMutation = useMutation({
    mutationFn: async ({
      commentId,
      type,
    }: {
      commentId: number;
      type: string;
    }) => {
      const token = localStorage.getItem('token');

      const res = await fetch('/api/social/comment-reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          commentId,
          type,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add reaction');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/social/posts', postId, 'comments'],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add reaction',
        variant: 'destructive',
      });
    },
  });

  // Remove comment reaction mutation
  const removeCommentReactionMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const token = localStorage.getItem('token');

      const res = await fetch(`/api/social/comment-reactions/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to remove reaction');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/social/posts', postId, 'comments'],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove reaction',
        variant: 'destructive',
      });
    },
  });

  // Handle comment reaction
  const handleCommentReaction = (commentId: number, type: string = 'like') => {
    const comment = comments.find((c) => c.id === commentId);
    if ((comment as any)?.userReaction === type) {
      removeCommentReactionMutation.mutate(commentId);
    } else {
      addCommentReactionMutation.mutate({ commentId, type });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-start animate-pulse">
            <div className="w-7 h-7 rounded-full bg-gray-200 mr-2" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-2 text-sm">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-72 overflow-y-auto">
      {comments.map((comment) => {
        // Format the comment date
        const formattedDate = formatDistanceToNow(new Date(comment.createdAt), {
          addSuffix: true,
        });

        return (
          <div key={comment.id} className="flex items-start group">
            <Avatar className="w-7 h-7 mr-2 border-2 border-gray-100">
              <AvatarImage
                src={comment.user.avatarUrl}
                alt={comment.user.name}
              />
              <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                {comment.user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block">
                <div className="font-medium text-sm">{comment.user.name}</div>
                <div className="text-sm text-gray-700">{comment.content}</div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{formattedDate}</span>
                <button
                  className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                    (comment as any).userReaction === 'like'
                      ? 'text-teal-600'
                      : 'text-gray-500 hover:text-teal-600'
                  }`}
                  onClick={() => handleCommentReaction(comment.id, 'like')}
                >
                  <ThumbsUp className="h-3 w-3" />
                  Like
                  {(comment as any).reactionCount > 0 && (
                    <span>({(comment as any).reactionCount})</span>
                  )}
                </button>
              </div>
            </div>

            {/* Delete option for comment owner or admin */}
            {(currentUser?.id === comment.userId || currentUser?.isAdmin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-24">
                  <DropdownMenuItem
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Comments;
