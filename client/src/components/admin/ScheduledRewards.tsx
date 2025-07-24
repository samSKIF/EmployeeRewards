import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Currently just showing the birthday job as this is all we've implemented in the backend
const ScheduledRewards = () => {
  const [showNewScheduleDialog, setShowNewScheduleDialog] = useState(false);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Schedule</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Daily at 08:00</TableCell>
            <TableCell>
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                Birthday
              </span>
            </TableCell>
            <TableCell>Employees with birthday on current date</TableCell>
            <TableCell>100</TableCell>
            <TableCell>
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Active
              </span>
            </TableCell>
            <TableCell>
              <Button
                variant="link"
                className="text-primary hover:text-indigo-800 h-auto p-0"
              >
                Edit
              </Button>
              <Button
                variant="link"
                className="text-red-500 hover:text-red-700 ml-3 h-auto p-0"
              >
                Disable
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="p-6 border-t border-gray-200">
        <Button onClick={() => setShowNewScheduleDialog(true)}>
          Create New Scheduled Reward
        </Button>
      </div>

      <Dialog
        open={showNewScheduleDialog}
        onOpenChange={setShowNewScheduleDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Scheduled Reward</DialogTitle>
            <DialogDescription>
              Set up automated rewards for employees based on criteria.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="reward-type">Reward Type</Label>
              <Select>
                <SelectTrigger id="reward-type">
                  <SelectValue placeholder="Select reward type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="anniversary">Work Anniversary</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="schedule">Schedule</Label>
              <Select>
                <SelectTrigger id="schedule">
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom CRON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="points">Points Amount</Label>
              <Input id="points" type="number" min="1" placeholder="100" />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Reward description that employees will see"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewScheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Scheduled Reward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScheduledRewards;
