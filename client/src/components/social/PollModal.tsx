import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User } from '@platform/sdk/types';
import { X, Plus, Trash2, Calendar, Send } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | undefined;
}

export const PollModal = ({ isOpen, onClose, currentUser }: PollModalProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when modal is opened/closed
  React.useEffect(() => {
    if (isOpen) {
      setQuestion('');
      setOptions(['', '']);
      setExpiryDate(undefined);
    }
  }, [isOpen]);

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async ({
      question,
      options,
      expiryDate,
    }: {
      question: string;
      options: string[];
      expiryDate?: Date;
    }) => {
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');

      // Create request with token
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: question,
          type: 'poll',
          pollData: {
            question,
            options,
            expiresAt: expiryDate ? expiryDate.toISOString() : null,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create poll');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
      onClose();
      toast({
        title: 'Poll created!',
        description: 'Your poll has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll',
        variant: 'destructive',
      });
    },
  });

  // Add a new option
  const addOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    } else {
      toast({
        title: 'Maximum options reached',
        description: 'You can add up to 8 options',
        variant: 'destructive',
      });
    }
  };

  // Remove an option
  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    } else {
      toast({
        title: 'Minimum options required',
        description: 'Polls must have at least 2 options',
        variant: 'destructive',
      });
    }
  };

  // Update option text
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a question for your poll',
        variant: 'destructive',
      });
      return;
    }

    // Check that all options have text
    const emptyOptions = options.filter((option) => !option.trim());
    if (emptyOptions.length > 0) {
      toast({
        title: 'Error',
        description: 'All options must have text',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate options
    const uniqueOptions = new Set(options.map((o) => o.trim()));
    if (uniqueOptions.size !== options.length) {
      toast({
        title: 'Error',
        description: 'All options must be unique',
        variant: 'destructive',
      });
      return;
    }

    createPollMutation.mutate({
      question,
      options,
      expiryDate,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Create a Poll</h2>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Poll Question */}
            <div>
              <label className="block text-sm font-medium mb-2">Question</label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to ask?"
                className="w-full resize-none"
                rows={2}
              />
            </div>

            {/* Poll Options */}
            <div>
              <label className="block text-sm font-medium mb-2">Options</label>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={options.length <= 2}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={options.length >= 8}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>

            {/* Poll Expiry */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Expiration Date{' '}
                <span className="text-xs text-gray-500">(Optional)</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !expiryDate && 'text-gray-500'
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {expiryDate
                      ? format(expiryDate, 'PPP')
                      : 'Set expiration date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500 mt-2">
                If not set, the poll will never expire
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 text-white hover:bg-purple-700"
                disabled={createPollMutation.isPending}
              >
                {createPollMutation.isPending ? 'Creating...' : 'Create Poll'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PollModal;
