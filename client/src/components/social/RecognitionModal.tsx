import React, { useState } from 'react';
import { User } from '@platform/sdk/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Award,
  Star,
  Users,
  Zap,
  Sparkles,
  Target,
  Cake,
  Trophy,
  Brain,
  Heart,
  Rocket,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface RecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | undefined;
}

export const RecognitionModal = ({
  isOpen,
  onClose,
  currentUser,
}: RecognitionModalProps) => {
  const [selectedBadge, setSelectedBadge] = useState<string>('');
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [points, setPoints] = useState<number>(50);
  const [gifUrl, setGifUrl] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced badge options
  const badges = [
    {
      type: 'Outstanding Work',
      icon: <Star className="h-5 w-5" />,
      color: 'bg-amber-500',
    },
    {
      type: 'Team Player',
      icon: <Users className="h-5 w-5" />,
      color: 'bg-blue-500',
    },
    {
      type: 'Problem Solver',
      icon: <Zap className="h-5 w-5" />,
      color: 'bg-purple-500',
    },
    {
      type: 'Innovation Award',
      icon: <Sparkles className="h-5 w-5" />,
      color: 'bg-emerald-500',
    },
    {
      type: 'Leadership',
      icon: <Target className="h-5 w-5" />,
      color: 'bg-red-500',
    },
    {
      type: 'Work Anniversary',
      icon: <Cake className="h-5 w-5" />,
      color: 'bg-pink-500',
    },
    {
      type: 'Top Performer',
      icon: <Trophy className="h-5 w-5" />,
      color: 'bg-indigo-500',
    },
    {
      type: 'Mentor',
      icon: <Brain className="h-5 w-5" />,
      color: 'bg-cyan-500',
    },
    {
      type: 'Culture Champion',
      icon: <Heart className="h-5 w-5" />,
      color: 'bg-rose-500',
    },
    {
      type: 'Growth Mindset',
      icon: <Rocket className="h-5 w-5" />,
      color: 'bg-orange-500',
    },
  ];

  // Get users query
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/users');
      return res.json();
    },
    enabled: isOpen,
  });

  // Create recognition mutation
  const createRecognitionMutation = useMutation({
    mutationFn: async ({
      recipientId,
      badgeType,
      message,
      points,
      gifUrl,
    }: {
      recipientId: number;
      badgeType: string;
      message: string;
      points: number;
      gifUrl?: string;
    }) => {
      const formData = new FormData();
      formData.append(
        'content',
        `Congratulations @${users.find((u) => u.id === recipientId)?.name?.split(' ')[0] || 'teammate'} for ${message}`
      );
      formData.append('type', 'recognition');
      formData.append(
        'recognitionData',
        JSON.stringify({
          recipientId,
          badgeType,
          message,
          points,
          gifUrl,
        })
      );

      const res = await fetch('/api/social/posts', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to create recognition');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
      onClose();
      toast({
        title: 'Recognition sent!',
        description: 'Your recognition has been successfully posted.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send recognition',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a recipient',
      });
      return;
    }

    if (!selectedBadge) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a badge',
      });
      return;
    }

    createRecognitionMutation.mutate({
      recipientId,
      badgeType: selectedBadge,
      message,
      points,
      gifUrl: gifUrl || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Recognize a Teammate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            value={recipientId?.toString()}
            onValueChange={(value) => setRecipientId(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select teammate" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            {badges.map((badge) => (
              <button
                key={badge.type}
                type="button"
                onClick={() => setSelectedBadge(badge.type)}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  selectedBadge === badge.type
                    ? `${badge.color} text-white`
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {badge.icon}
                <span className="text-sm">{badge.type}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Recognition Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-24 px-3 py-2 border rounded-md"
              placeholder="What made their work outstanding?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Points ({points})</label>
            <Slider
              value={[points]}
              onValueChange={(values) => setPoints(values[0])}
              max={100}
              step={10}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">GIF URL (optional)</label>
            <Input
              type="url"
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="Paste a GIF URL to make it more fun!"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Send Recognition</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecognitionModal;
