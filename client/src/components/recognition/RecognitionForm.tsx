import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Target, ThumbsUp, Trophy } from 'lucide-react';

// Form schema for peer recognition
const recognitionSchema = z.object({
  recipientId: z.string().min(1, 'Recipient is required'),
  badgeType: z.string().min(1, 'Badge type is required'),
  message: z
    .string()
    .min(5, 'Message must be at least 5 characters')
    .max(500, 'Message must be less than 500 characters'),
  points: z.number().optional(),
});

type RecognitionFormValues = z.infer<typeof recognitionSchema>;

const badgeTypes = [
  {
    value: 'excellence',
    label: 'Excellence',
    icon: <Trophy className="h-4 w-4 text-yellow-500" />,
  },
  {
    value: 'teamwork',
    label: 'Teamwork',
    icon: <ThumbsUp className="h-4 w-4 text-blue-500" />,
  },
  {
    value: 'innovation',
    label: 'Innovation',
    icon: <Star className="h-4 w-4 text-purple-500" />,
  },
  {
    value: 'goal',
    label: 'Goal Achievement',
    icon: <Target className="h-4 w-4 text-green-500" />,
  },
  {
    value: 'leadership',
    label: 'Leadership',
    icon: <Award className="h-4 w-4 text-red-500" />,
  },
];

interface RecognitionFormProps {
  onSuccess?: () => void;
}

export function RecognitionForm({ onSuccess }: RecognitionFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  // Fetch users for the recipient dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
  });

  // Form setup
  const form = useForm<RecognitionFormValues>({
    resolver: zodResolver(recognitionSchema),
    defaultValues: {
      recipientId: '',
      badgeType: '',
      message: '',
    },
  });

  // Create recognition mutation
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: RecognitionFormValues) => {
      return apiRequest('POST', '/api/recognition/peer', {
        ...data,
        recipientId: parseInt(data.recipientId),
        points: data.points || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: t('recognition.success'),
        description: t('recognition.successDescription'),
      });

      // Reset form
      form.reset();
      setSelectedBadge(null);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recognition/sent'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/recognition/received'],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/points/balance'] });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: t('recognition.error'),
        description: error.message || t('recognition.errorDescription'),
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: RecognitionFormValues) => {
    mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('recognition.recognizeColleague')}</CardTitle>
        <CardDescription>
          {t('recognition.recognizeDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Recipient selection */}
            <FormField
              control={form.control}
              name="recipientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recognition.recipient')}</FormLabel>
                  <Select
                    disabled={isLoadingUsers || isPending}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('recognition.selectRecipient')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users && Array.isArray(users)
                        ? users
                            .filter((user: any) => !user.isAdmin)
                            .map((user: any) => (
                              <SelectItem
                                key={user.id}
                                value={user.id.toString()}
                              >
                                {user.name} {user.surname || ''}
                              </SelectItem>
                            ))
                        : null}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Badge type selection */}
            <FormField
              control={form.control}
              name="badgeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recognition.badgeType')}</FormLabel>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {badgeTypes.map((badge) => (
                      <Badge
                        key={badge.value}
                        className={`flex items-center justify-center gap-1 p-2 cursor-pointer ${
                          selectedBadge === badge.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                        onClick={() => {
                          field.onChange(badge.value);
                          setSelectedBadge(badge.value);
                        }}
                      >
                        {badge.icon}
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recognition message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recognition.message')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('recognition.messagePlaceholder')}
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('recognition.sending') : t('recognition.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
