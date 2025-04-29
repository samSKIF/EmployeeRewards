import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/types";
import { 
  ImageIcon, 
  X, 
  Smile,
  MessageCircle, 
  PlusCircle,
  Users,
  BarChart,
  Send
} from "lucide-react";

interface PostCreatorProps {
  user: User | undefined;
  onRecognizeClick: () => void;
}

export const PostCreator = ({ user, onRecognizeClick }: PostCreatorProps) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file type
      if (!selectedFile.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Only image files are allowed",
          variant: "destructive"
        });
        return;
      }
      
      setImage(selectedFile);
      
      // Create and set image preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  // Clear selected image
  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create post");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      setContent("");
      setImage(null);
      setImagePreview(null);
      setIsSubmitting(false);
      toast({
        title: "Success",
        description: "Post created successfully",
      });
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    }
  });
  
  // Handle post submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !image) {
      toast({
        title: "Error",
        description: "Post must contain text or an image",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData object for multipart/form-data request
      const formData = new FormData();
      formData.append("content", content);
      formData.append("type", "standard");
      
      if (image) {
        formData.append("image", image);
      }
      
      createPostMutation.mutate(formData);
    } catch (error: any) {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    }
  };
  
  // Text area with auto expand
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Auto-resize the textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
      <div className="flex">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-blue-500 text-white">
            {user?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="ml-4 flex-1">
          <form onSubmit={handleSubmit}>
            <Textarea
              value={content}
              onChange={handleTextareaChange}
              placeholder="What's on your mind? Use @ to mention someone..."
              className="min-h-[80px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-base placeholder:text-gray-500"
            />
            
            {imagePreview && (
              <div className="relative mt-2 rounded-lg overflow-hidden inline-block">
                <img 
                  src={imagePreview} 
                  alt="Upload preview" 
                  className="max-h-60 rounded-lg"
                />
                <Button 
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <div className="mt-3 flex justify-between items-center">
              <div className="flex space-x-2">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-1" /> 
                  Photo
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  onClick={onRecognizeClick}
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> 
                  Recognize
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <BarChart className="h-4 w-4 mr-1" /> 
                  Poll
                </Button>
              </div>
              
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting || (!content.trim() && !image)}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Posting...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostCreator;