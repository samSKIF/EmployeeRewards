import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { User } from '@platform/sdk/types';
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
  Users,
} from 'lucide-react';

interface PostCreatorProps {
  user: User | undefined;
  onRecognizeClick: () => void;
  onPollClick?: () => void;
}

export const PostCreator = ({
  user,
  onRecognizeClick,
  onPollClick,
}: PostCreatorProps) => {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const actionButtons = [
    {
      icon: <Star className="w-5 h-5" />,
      label: 'Share a Highlight',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-400',
    },
    {
      icon: <Gift className="w-5 h-5" />,
      label: 'Give a Spot Bonus',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      iconColor: 'text-emerald-400',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: '1 on 1 with Ron',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      iconColor: 'text-rose-400',
    },
  ];

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');

      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create post');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setIsExpanded(false);
      toast({
        title: 'Success',
        description: 'Post created successfully',
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

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Maximum size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image file smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // First, set the image file
    setImageFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      // Automatically expand the post creator when an image is selected
      setIsExpanded(true);
    };
    reader.readAsDataURL(file);
  };

  // Remove selected image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !imageFile) {
      toast({
        title: 'Empty post',
        description: 'Please add some text or an image to your post',
        variant: 'destructive',
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 p-6 transition-all duration-300 ease-in-out">
        <div className="flex items-start">
          <Avatar className="w-12 h-12 mr-4">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
              {user?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('') || 'AU'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                className="resize-none border-none bg-gray-50 shadow-none focus-visible:ring-0 px-4 py-3 rounded-xl text-gray-700"
                rows={3}
              />

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mt-3 rounded-xl overflow-hidden border border-gray-100">
                  <img
                    src={imagePreview}
                    alt="Selected"
                    className="max-h-60 w-full object-cover rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                    onClick={removeImage}
                  >
                    ×
                  </Button>
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-gray-600 rounded-full border-gray-200 p-2"
                    onClick={() => fileInputRef.current?.click()}
                    title="Add Image"
                  >
                    <ImageIcon className="h-4 w-4 text-green-600" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-gray-600 rounded-full border-gray-200 p-2"
                    onClick={onPollClick}
                    title="Create Poll"
                  >
                    <BarChart className="h-4 w-4 text-purple-600" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-gray-600 rounded-full border-gray-200 p-2"
                    onClick={onRecognizeClick}
                    title="Recognize Someone"
                  >
                    <Award className="h-4 w-4 text-amber-500" />
                  </Button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-gray-200"
                    onClick={() => {
                      setIsExpanded(false);
                      setContent('');
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={createPostMutation.isPending}
                    size="sm"
                    className="bg-blue-500 text-white hover:bg-blue-600 rounded-full"
                  >
                    {createPostMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                        <span>Posting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
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
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 p-6 transition-all duration-300 ease-in-out">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12 border-2 border-gray-100">
          <AvatarImage src={user?.avatarUrl} alt={user?.name || 'User'} />
          <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
            {user?.name
              ?.split(' ')
              .map((n) => n[0])
              .join('') || 'AU'}
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-full px-6 py-3 cursor-pointer transition-colors duration-200"
          onClick={() => setIsExpanded(true)}
        >
          <span className="text-gray-500 text-md">
            {t('social.whatOnYourMind')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 my-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 bg-green-100 text-green-800 py-2 px-3 rounded-lg text-sm font-medium"
        >
          <ImageIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span>{t('social.share')}</span>
        </button>

        <button
          onClick={onRecognizeClick}
          className="flex items-center justify-center gap-1.5 bg-amber-100 text-amber-800 py-2 px-3 rounded-lg text-sm font-medium"
        >
          <Award className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span>{t('social.appreciate')}</span>
        </button>

        <button
          onClick={onPollClick}
          className="flex items-center justify-center gap-1.5 bg-purple-100 text-purple-800 py-2 px-3 rounded-lg text-sm font-medium"
        >
          <BarChart className="h-4 w-4 text-purple-500 flex-shrink-0" />
          <span>{t('social.poll')}</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
      </div>
    </div>
  );
};

export default PostCreator;
