import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';

export const LeaveRequestForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    startHalfDay: false,
    endHalfDay: false,
    reason: '',
    leaveTypeId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit leave request');
      }

      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });

      // Reset form
      setFormData({
        startDate: '',
        endDate: '',
        startHalfDay: false,
        endHalfDay: false,
        reason: '',
        leaveTypeId: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit leave request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1">Leave Type</label>
        <select
          value={formData.leaveTypeId}
          onChange={(e) =>
            setFormData({ ...formData, leaveTypeId: e.target.value })
          }
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Leave Type</option>
          {/* Leave types will be populated from API */}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Start Date</label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            required
          />
          <label className="mt-1 flex items-center">
            <input
              type="checkbox"
              checked={formData.startHalfDay}
              onChange={(e) =>
                setFormData({ ...formData, startHalfDay: e.target.checked })
              }
              className="mr-2"
            />
            Half Day
          </label>
        </div>

        <div>
          <label className="block mb-1">End Date</label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
            required
          />
          <label className="mt-1 flex items-center">
            <input
              type="checkbox"
              checked={formData.endHalfDay}
              onChange={(e) =>
                setFormData({ ...formData, endHalfDay: e.target.checked })
              }
              className="mr-2"
            />
            Half Day
          </label>
        </div>
      </div>

      <div>
        <label className="block mb-1">Reason</label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          required
          rows={4}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Leave Request'}
      </Button>
    </form>
  );
};
