import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { PostWithDetails, User } from "@shared/types";
import { 
  MessageCircle, 
  ThumbsUp, 
  Award, 
  Sparkles, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Smile,
  Send,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Import Comments component
import { Comments } from "@/components/social";

interface PostProps {
  post: PostWithDetails;
  currentUser: User | undefined;
}

export const Post = ({ post, currentUser }: PostProps) => {
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Format the date
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), { 
    addSuffix: true 
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: number, type: string }) => {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');
      
      // Create request with token
      const res = await fetch("/api/social/reactions", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          postId,
          type
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add reaction");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add reaction",
        variant: "destructive"
      });
    }
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (postId: number) => {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');
      
      // Create request with token
      const res = await fetch(`/api/social/reactions/${postId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to remove reaction");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove reaction",
        variant: "destructive"
      });
    }
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');
      
      // Create request with token
      const res = await fetch(`/api/social/posts/${postId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete post");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive"
      });
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number, content: string }) => {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');
      
      // Create request with token
      const res = await fetch("/api/social/comments", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          postId,
          content
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add comment");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      setCommentText("");
      if (!showComments) {
        setShowComments(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      });
    }
  });

  // Handle reaction click
  const handleReaction = (reactionType: string) => {
    if (post.userReaction === reactionType) {
      removeReactionMutation.mutate(post.id);
    } else {
      addReactionMutation.mutate({ postId: post.id, type: reactionType });
    }
  };

  // Handle delete post
  const handleDeletePost = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deletePostMutation.mutate(post.id);
    }
  };

  // Handle comment submit
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    addCommentMutation.mutate({ 
      postId: post.id, 
      content: commentText 
    });
  };

  // Start commenting
  const focusCommentInput = () => {
    setIsCommenting(true);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  };

  // Reaction buttons with state indication
  const ReactionButton = ({ type, icon, count, label }: { 
    type: string;
    icon: React.ReactNode;
    count: number;
    label: string;
  }) => (
    <button 
      className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
        post.userReaction === type 
          ? 'bg-teal-50 text-teal-600 font-medium' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      onClick={() => handleReaction(type)}
    >
      {icon}
      <span className="text-sm">{count || ""}</span>
      <span className="text-sm hidden sm:inline">{t(`social.${type.toLowerCase()}`)}</span>
    </button>
  );

  // Render recognition badge if post type is recognition
  const renderRecognitionBadge = () => {
    if (post.type !== 'recognition' || !post.recognition) return null;
    
    return (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full bg-amber-500 text-white p-1.5">
            <Award size={16} />
          </div>
          <span className="font-medium text-amber-900">{post.recognition.badgeType}</span>
          {post.recognition.points > 0 && (
            <div className="ml-auto px-3 py-1 bg-amber-500 text-white rounded-full font-bold text-sm">
              {post.recognition.points} Points
            </div>
          )}
        </div>
        <p className="text-amber-900 text-sm">{post.recognition.message}</p>
        
        <div className="mt-3 flex items-center">
          <Avatar className="h-8 w-8 border-2 border-white">
            <AvatarImage src={post.recognition.recipient.avatarUrl} alt={post.recognition.recipient.name} />
            <AvatarFallback className="bg-amber-200 text-amber-700">
              {post.recognition.recipient.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="ml-2">
            <div className="text-sm font-medium">{post.recognition.recipient.name}</div>
            <div className="text-xs text-gray-500">{post.recognition.recipient.jobTitle || 'Team Member'}</div>
          </div>
        </div>
      </div>
    );
  };

  // Render poll if post type is poll
  const renderPoll = () => {
    if (post.type !== 'poll' || !post.poll) return null;
    
    return (
      <div className="bg-teal-50 p-4 rounded-lg mb-4">
        <h4 className="font-semibold mb-2 text-teal-900">{post.poll.question}</h4>
        <div className="space-y-2">
          {post.poll.options && Array.isArray(post.poll.options) ? (
            post.poll.options.map((option, index) => {
              const isSelected = post.poll?.userVote === index;
              const percentage = post.poll?.votePercentages?.[index] || 0;
              
              return (
                <div 
                  key={index}
                  className="relative cursor-pointer hover:bg-teal-100/50 rounded-lg p-3"
                  onClick={() => {
                    if (post.poll?.userVote === undefined) {
                      // Call vote mutation here
                    }
                  }}
                >
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-lg ${
                      isSelected ? 'bg-teal-200/70' : 'bg-teal-100/50'
                    }`}
                    style={{ width: `${percentage}%`, zIndex: 0 }}
                  />
                  <div className="flex justify-between relative z-10">
                    <span className="text-teal-900">{option}</span>
                    <span className="font-semibold text-teal-700">{percentage}%</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-3 bg-teal-100/50 rounded text-teal-700">
              No poll options available
            </div>
          )}
          <div className="text-sm text-teal-600 mt-2 font-medium">
            {post.poll.totalVotes || 0} votes
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
      <div className="p-4">
        {/* Post header with user info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Avatar className="w-10 h-10 mr-3 border-2 border-gray-100">
              <AvatarImage src={post.user?.avatarUrl || post.userProfileImage || post.avatarUrl} alt={post.user?.name || post.userName || 'User'} />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {(post.user?.name || post.userName || 'User').split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-gray-900">{post.user?.name || post.userName || 'User'}</div>
              <div className="text-xs text-gray-500">{formattedDate}</div>
            </div>
          </div>
          
          {/* Actions menu (only for post owner or admin) */}
          {(currentUser?.id === post.userId || currentUser?.isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDeletePost} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>{t("social.deletePost")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Post content */}
        <div className="mb-4">
          <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
        </div>
        
        {/* Recognition badge */}
        {renderRecognitionBadge()}
        
        {/* Poll */}
        {renderPoll()}
        
        {/* Post image */}
        {post.imageUrl && (
          <div className="mb-4">
            <img 
              src={post.imageUrl} 
              alt="Post image" 
              className="w-full h-auto rounded-lg"
            />
          </div>
        )}
        
        {/* Post tags */}
        {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="bg-gray-100">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Reaction counts summary */}
        {post.reactionCounts && Object.keys(post.reactionCounts).length > 0 && (
          <div className="flex items-center text-sm text-gray-500 mb-3 pb-3 border-b">
            <div className="flex -space-x-1 mr-2">
              {post.reactionCounts && post.reactionCounts['like'] > 0 && (
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                  <ThumbsUp className="text-teal-600 w-3 h-3" />
                </div>
              )}
              {post.reactionCounts && post.reactionCounts['celebrate'] > 0 && (
                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                  <Award className="text-amber-600 w-3 h-3" />
                </div>
              )}
              {post.reactionCounts && post.reactionCounts['insightful'] > 0 && (
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sparkles className="text-purple-600 w-3 h-3" />
                </div>
              )}
            </div>
            <span>{post.reactionCounts ? Object.values(post.reactionCounts).reduce((a, b) => a + b, 0) : 0}</span>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div className="flex gap-2">
            <ReactionButton 
              type="like" 
              icon={<ThumbsUp className="h-4 w-4" />} 
              count={(post.reactionCounts && post.reactionCounts['like']) || post.reactionCount || 0} 
              label="Like"
            />
            <ReactionButton 
              type="celebrate" 
              icon={<Award className="h-4 w-4" />} 
              count={(post.reactionCounts && post.reactionCounts['celebrate']) || 0} 
              label="Celebrate"
            />
            <button 
              className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={focusCommentInput}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">{t("social.comment")}</span>
            </button>
          </div>
          
          <button 
            className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Share</span>
          </button>
        </div>
        
        {/* Comments section */}
        {(showComments || isCommenting || (post.commentCount && post.commentCount > 0)) && (
          <div>
            {post.commentCount && post.commentCount > 0 && !showComments && (
              <button 
                className="text-sm text-teal-600 font-medium mb-3 hover:underline"
                onClick={() => setShowComments(true)}
              >
                View all {post.commentCount} comments
              </button>
            )}
            
            {showComments && (
              <div className="mb-3">
                <Comments postId={post.id} currentUser={currentUser} />
              </div>
            )}
            
            {/* Comment input */}
            <form onSubmit={handleCommentSubmit} className="flex items-center">
              <Avatar className="w-7 h-7 mr-2 border-2 border-gray-100">
                <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name || "User"} />
                <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                  {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full py-2 pr-10 rounded-full bg-gray-100 border-gray-100 focus-visible:ring-offset-0 focus-visible:ring-teal-400"
                />
                <button 
                  type="submit"
                  disabled={!commentText.trim()}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 ${
                    commentText.trim() ? 'text-teal-500 hover:text-teal-600' : ''
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Post;