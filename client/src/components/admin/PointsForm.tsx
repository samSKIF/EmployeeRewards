import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { UserWithBalance } from '@platform/sdk/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PointsForm = () => {
  const [userId, setUserId] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch users for dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery<
    UserWithBalance[]
  >({
    queryKey: ['/api/users'],
  });

  // Mutation for sending points
  const sendPointsMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !points || !reason) {
        throw new Error('Please fill all required fields');
      }

      const response = await apiRequest('POST', '/api/points/earn', {
        userId: parseInt(userId),
        amount: parseInt(points),
        reason,
        description: comment || reason,
      });

      return response.json();
    },
    onSuccess: () => {
      // Reset form
      setUserId('');
      setPoints('');
      setReason('');
      setComment('');

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });

      toast({
        title: 'Points sent successfully',
        description: `${points} points have been sent to the employee.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to send points',
        description: error.message || 'There was an error sending points.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPointsMutation.mutate();
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Send Points to Employee</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="employee">Select Employee</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="employee" className="w-full">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingUsers ? (
                    <SelectItem value="">Loading employees...</SelectItem>
                  ) : (
                    users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.department || 'No department'})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="points">Points Amount</Label>
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                min="1"
                placeholder="Enter points amount"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason" className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">
                    Performance Recognition
                  </SelectItem>
                  <SelectItem value="project">Project Completion</SelectItem>
                  <SelectItem value="innovation">Innovation Award</SelectItem>
                  <SelectItem value="teamwork">Teamwork Excellence</SelectItem>
                  <SelectItem value="customer">Customer Service</SelectItem>
                  <SelectItem value="leadership">Leadership</SelectItem>
                  <SelectItem value="other">Other (specify below)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="comment">Additional Comment</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Enter any additional details"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={sendPointsMutation.isPending}>
              {sendPointsMutation.isPending ? 'Sending...' : 'Send Points'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PointsForm;
