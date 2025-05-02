import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/types";
import { 
  Smile, 
  Image as ImageIcon, 
  BarChart, 
  Award,
  Send,
  Heart,
  Plus,
  Star,
  Gift,
  Users
} from "lucide-react";

interface PostCreatorProps {
  user: User | undefined;
  onRecognizeClick: () => void;
  onPollClick?: () => void;
}

export const PostCreator = ({ user, onRecognizeClick, onPollClick }: PostCreatorProps) => {
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const actionButtons = [
    {
      icon: <Star className="w-5 h-5" />,
      label: "Share a Highlight",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      iconColor: "text-amber-400"
    },
    {
      icon: <Gift className="w-5 h-5" />,
      label: "Give a Spot Bonus",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      iconColor: "text-emerald-400"
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "1 on 1 with Ron",
      bgColor: "bg-rose-50",
      textColor: "text-rose-700",
      iconColor: "text-rose-400"
    }
  ];

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');

      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create post");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setIsExpanded(false);
      toast({
        title: "Success",
        description: "Post created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    }
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Maximum size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image file smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setImageFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove selected image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !imageFile) {
      toast({
        title: "Empty post",
        description: "Please add some text or an image to your post",
        variant: "destructive"
      });
      return;
    }

    // Create FormData for any type of post
    const formData = new FormData();
    formData.append('content', content);
    formData.append('type', 'standard');

    // Add the image file if present
    if (imageFile) {
      formData.append('image', imageFile);
    }

    // Use the mutation to handle the submission
    createPostMutation.mutate(formData);
  };

  // Expanded post composer with image preview
  if (isExpanded) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6 p-4"> {/* Added rounded-2xl and overflow-hidden */}
        <div className="flex items-start">
          <Avatar className="w-10 h-10 mr-3">
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                className="resize-none border-none shadow-none focus-visible:ring-0 px-0 py-2"
                rows={3}
              />

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mt-2 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Selected" 
                    className="max-h-60 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={removeImage}
                  >
                    ×
                  </Button>
                </div>
              )}

              <div className="flex justify-between items-center mt-3">
                <div className="flex space-x-2">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs">Add Image</span>
                  </Button>

                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500"
                    onClick={onPollClick}
                  >
                    <BarChart className="h-4 w-4 mr-1" />
                    <span className="text-xs">Poll</span>
                  </Button>

                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500"
                    onClick={onRecognizeClick}
                  >
                    <Award className="h-4 w-4 mr-1" />
                    <span className="text-xs">Recognize</span>
                  </Button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setIsExpanded(false);
                      setContent("");
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button 
                    type="submit"
                    disabled={createPostMutation.isPending}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {createPostMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                        <span>Posting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Send className="h-4 w-4" />
                        <span>Post</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Collapsed post composer
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6 p-4"> {/* Added rounded-2xl and overflow-hidden */}
      <div className="grid grid-cols-3 gap-2 p-3"> {/* Added grid layout */}
        {actionButtons.map((button, index) => (
          <button
            key={index}
            className={`flex items-center gap-2 ${button.bgColor} ${button.textColor} p-3 rounded-full text-sm font-medium transition-colors hover:opacity-90`}
          >
            <span className={`${button.iconColor}`}>{button.icon}</span>
            <span>{button.label}</span>
          </button>
        ))}
        <button className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100">
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PostCreator;