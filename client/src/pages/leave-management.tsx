import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Briefcase, FileText, Calendar, PlusCircle, CheckCircle, XCircle, Clock, Settings } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addMonths } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
// import AdminLayout from '@/layouts/AdminLayout'; // Using SocialLayout for all users
import SocialLayout from '@/layouts/SocialLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Define types
interface LeaveType {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  organizationId: number;
  requiresApproval: boolean;
  workDaysCount: boolean;
  accrualRate: number;
  maxAccrual: number;
  minIncrements: number;
  defaultDays: number;
  active: boolean;
}

interface LeaveEntitlement {
  id: number;
  userId: number;
  leaveTypeId: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  adjustedDays: number;
  periodStart: string;
  periodEnd: string;
  leaveType: LeaveType;
}

interface LeaveRequest {
  id: number;
  userId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  startHalfDay: boolean;
  endHalfDay: boolean;
  totalDays: number;
  status: string;
  notes: string;
  approverId: number;
  approvedAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  leaveType: LeaveType;
  approver?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  description: string;
  organizationId: number;
  recurring: boolean;
}

// Leave request form schema
const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  startHalfDay: z.boolean().default(false),
  endHalfDay: z.boolean().default(false),
  notes: z.string().optional(),
  approverId: z.string().min(1, "Approver is required"),
});

// Leave Management Page Component
export default function LeaveManagement() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('my-leaves');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch leave data
  const { data: leaveTypes, isLoading: isLoadingLeaveTypes } = useQuery({
    queryKey: ['/api/leave/types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leave/types');
      return await response.json() as LeaveType[];
    },
  });

  const { data: leaveEntitlements, isLoading: isLoadingEntitlements } = useQuery({
    queryKey: ['/api/leave/entitlements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leave/entitlements');
      return await response.json() as LeaveEntitlement[];
    },
  });

  const { data: leaveRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['/api/leave/requests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leave/requests');
      return await response.json() as LeaveRequest[];
    },
  });

  const { data: pendingApprovals, isLoading: isLoadingApprovals } = useQuery({
    queryKey: ['/api/leave/requests/pending-approval'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leave/requests/pending-approval');
      return await response.json() as LeaveRequest[];
    },
    enabled: user?.isManager || isAdmin,
  });

  const { data: holidays, isLoading: isLoadingHolidays } = useQuery({
    queryKey: ['/api/leave/holidays'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leave/holidays');
      return await response.json() as Holiday[];
    },
  });

  // Managers/users for approver selection
  const { data: managers } = useQuery({
    queryKey: ['/api/users/managers'],
    queryFn: async () => {
      // This is a placeholder, you might need to create this endpoint
      // or use another way to fetch managers
      const response = await apiRequest('GET', '/api/users');
      const users = await response.json();
      return users.filter(u => u.isManager || u.isAdmin);
    },
  });

  // Create new leave request
  const createLeaveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/leave/requests', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave request submitted",
        description: "Your leave request has been successfully submitted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave/entitlements'] });
      setIsNewLeaveDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to submit leave request",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Approve or reject leave request
  const updateLeaveStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: number, status: string, rejectionReason?: string }) => {
      const response = await apiRequest('PATCH', `/api/leave/requests/${id}/status`, {
        status,
        rejectionReason
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave request updated",
        description: "The leave request status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave/requests/pending-approval'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update leave request",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Cancel leave request
  const cancelLeaveMutation = useMutation({
    mutationFn: async ({ id, cancellationReason }: { id: number, cancellationReason: string }) => {
      const response = await apiRequest('PATCH', `/api/leave/requests/${id}/cancel`, {
        cancellationReason
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave request cancelled",
        description: "Your leave request has been cancelled",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leave/entitlements'] });
      setCancellationReason('');
      setLeaveToCancel(null);
      setIsCancelDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to cancel leave request",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form for new leave request
  const form = useForm<z.infer<typeof leaveRequestSchema>>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      startHalfDay: false,
      endHalfDay: false,
      notes: "",
    },
  });

  // Dialog control states
  const [isNewLeaveDialogOpen, setIsNewLeaveDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState<LeaveRequest | null>(null);
  const [leaveToReject, setLeaveToReject] = useState<LeaveRequest | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Submit new leave request
  const onSubmit = (values: z.infer<typeof leaveRequestSchema>) => {
    createLeaveMutation.mutate({
      leaveTypeId: parseInt(values.leaveTypeId),
      startDate: values.startDate.toISOString().split('T')[0],
      endDate: values.endDate.toISOString().split('T')[0],
      startHalfDay: values.startHalfDay,
      endHalfDay: values.endHalfDay,
      notes: values.notes,
      approverId: parseInt(values.approverId),
    });
  };

  // Handle leave cancellation
  const handleCancelLeave = (leave: LeaveRequest) => {
    setLeaveToCancel(leave);
    setIsCancelDialogOpen(true);
  };

  // Handle leave approval or rejection
  const handleApproveLeave = (leave: LeaveRequest) => {
    updateLeaveStatusMutation.mutate({ id: leave.id, status: "APPROVED" });
  };

  const handleRejectLeave = (leave: LeaveRequest) => {
    setLeaveToReject(leave);
    setIsRejectDialogOpen(true);
  };

  const confirmRejectLeave = () => {
    if (leaveToReject) {
      updateLeaveStatusMutation.mutate({
        id: leaveToReject.id,
        status: "REJECTED",
        rejectionReason: rejectionReason,
      });
      setRejectionReason('');
      setLeaveToReject(null);
      setIsRejectDialogOpen(false);
    }
  };

  const confirmCancelLeave = () => {
    if (leaveToCancel) {
      cancelLeaveMutation.mutate({
        id: leaveToCancel.id,
        cancellationReason: cancellationReason,
      });
    }
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate total leave days
  const calculateRemainingDays = (entitlements: LeaveEntitlement[] = []) => {
    return entitlements.reduce((total, entitlement) => {
      return total + (entitlement.remainingDays || 0);
    }, 0);
  };

  // We're using SocialLayout for all users (set in App.tsx routes)
  return (
    <div>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('leave.leaveManagement')}</h1>
            <p className="text-muted-foreground">{t('leave.manageLeaveRequests')}</p>
          </div>
          <Button onClick={() => setIsNewLeaveDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('leave.requestLeave')}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="my-leaves">
              <CalendarDays className="mr-2 h-4 w-4" />
              My Leaves
            </TabsTrigger>
            {(user?.isManager || isAdmin) && (
              <TabsTrigger value="approvals">
                <CheckCircle className="mr-2 h-4 w-4" />
                Approval Queue
              </TabsTrigger>
            )}
            <TabsTrigger value="balance">
              <Briefcase className="mr-2 h-4 w-4" />
              Leave Balance
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Leaves Tab */}
          <TabsContent value="my-leaves">
            <Card>
              <CardHeader>
                <CardTitle>My Leave Requests</CardTitle>
                <CardDescription>View and manage your leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRequests ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : leaveRequests && leaveRequests.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell>
                            <div className="font-medium">{leave.leaveType?.name || 'Unknown'}</div>
                          </TableCell>
                          <TableCell>
                            <div>{format(parseISO(leave.startDate), 'MMM dd, yyyy')}</div>
                            <div className="text-sm text-muted-foreground">
                              to {format(parseISO(leave.endDate), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>{leave.totalDays}</TableCell>
                          <TableCell>{getStatusBadge(leave.status)}</TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">{leave.notes}</div>
                          </TableCell>
                          <TableCell>
                            {leave.status === 'PENDING' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelLeave(leave)}
                              >
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-6xl opacity-20 mb-3">🏝️</div>
                    <h3 className="text-xl font-medium mb-2">No leave requests yet</h3>
                    <p className="text-muted-foreground mb-4">You haven't submitted any leave requests yet.</p>
                    <Button onClick={() => setIsNewLeaveDialogOpen(true)}>Request leave</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          {(user?.isManager || isAdmin) && (
            <TabsContent value="approvals">
              <Card>
                <CardHeader>
                  <CardTitle>Leave Requests Pending Approval</CardTitle>
                  <CardDescription>Manage leave requests from your team members</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingApprovals ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : pendingApprovals && pendingApprovals.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingApprovals.map((leave) => (
                          <TableRow key={leave.id}>
                            <TableCell>
                              <div className="font-medium">{leave.user?.name || 'Unknown'}</div>
                            </TableCell>
                            <TableCell>{leave.leaveType?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              <div>{format(parseISO(leave.startDate), 'MMM dd, yyyy')}</div>
                              <div className="text-sm text-muted-foreground">
                                to {format(parseISO(leave.endDate), 'MMM dd, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>{leave.totalDays}</TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">{leave.notes}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                  onClick={() => handleApproveLeave(leave)}
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                  onClick={() => handleRejectLeave(leave)}
                                >
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-10">
                      <div className="text-6xl opacity-20 mb-3">🎯</div>
                      <h3 className="text-xl font-medium mb-2">No pending approvals</h3>
                      <p className="text-muted-foreground">There are no leave requests waiting for your approval.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Leave Balance Tab */}
          <TabsContent value="balance">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Total Leave Balance</CardTitle>
                  <CardDescription>Across all leave types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    {isLoadingEntitlements ? (
                      <Skeleton className="h-10 w-20" />
                    ) : (
                      `${calculateRemainingDays(leaveEntitlements)} days`
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    Updated as of {format(new Date(), 'MMMM d, yyyy')}
                  </p>
                </CardFooter>
              </Card>

              {isLoadingEntitlements ? (
                <>
                  <Skeleton className="h-[180px]" />
                  <Skeleton className="h-[180px]" />
                </>
              ) : (
                leaveEntitlements?.map((entitlement) => (
                  <Card key={entitlement.id}>
                    <CardHeader className="pb-2">
                      <CardTitle>{entitlement.leaveType?.name || 'Unknown'}</CardTitle>
                      <CardDescription>
                        Valid until {format(parseISO(entitlement.periodEnd), 'MMM dd, yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {entitlement.remainingDays} / {entitlement.totalDays} days
                      </div>
                      <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, (entitlement.remainingDays / entitlement.totalDays) * 100))}%`,
                          }}
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <p className="text-xs text-muted-foreground">
                        Used: {entitlement.usedDays} days
                        {entitlement.adjustedDays ? ` (Adjusted: ${entitlement.adjustedDays > 0 ? '+' : ''}${entitlement.adjustedDays})` : ''}
                      </p>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>Leave Calendar</CardTitle>
                <CardDescription>View approved leaves and holidays</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[400px]">
                  {/* A placeholder for a calendar component */}
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-muted-foreground">Calendar view will be implemented with a full-featured calendar component.</p>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Upcoming Holidays</h3>
                    {isLoadingHolidays ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : holidays && holidays.length > 0 ? (
                      <div className="space-y-2">
                        {holidays
                          .filter(holiday => isAfter(parseISO(holiday.date), new Date()))
                          .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                          .slice(0, 5)
                          .map(holiday => (
                            <div key={holiday.id} className="flex justify-between items-center p-3 bg-muted rounded-md">
                              <div>
                                <div className="font-medium">{holiday.name}</div>
                                <div className="text-sm text-muted-foreground">{holiday.description}</div>
                              </div>
                              <Badge variant="outline">{format(parseISO(holiday.date), 'MMMM d, yyyy')}</Badge>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No upcoming holidays found.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Leave Settings</CardTitle>
                  <CardDescription>Configure leave types, policies, and holidays</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="leave-types">
                    <TabsList className="mb-4">
                      <TabsTrigger value="leave-types">Leave Types</TabsTrigger>
                      <TabsTrigger value="holidays">Holidays</TabsTrigger>
                      <TabsTrigger value="policies">Policies</TabsTrigger>
                    </TabsList>

                    <TabsContent value="leave-types">
                      <div className="flex justify-between mb-4">
                        <h3 className="text-xl font-medium">Leave Types</h3>
                        <Button size="sm">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Leave Type
                        </Button>
                      </div>

                      {isLoadingLeaveTypes ? (
                        <div className="space-y-3">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : leaveTypes && leaveTypes.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Default Days</TableHead>
                              <TableHead>Requires Approval</TableHead>
                              <TableHead>Active</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaveTypes.map((type) => (
                              <TableRow key={type.id}>
                                <TableCell>
                                  <div className="font-medium">{type.name}</div>
                                  <div className="text-sm text-muted-foreground">{type.description}</div>
                                </TableCell>
                                <TableCell>{type.defaultDays}</TableCell>
                                <TableCell>{type.requiresApproval ? 'Yes' : 'No'}</TableCell>
                                <TableCell>{type.active ? 'Yes' : 'No'}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">Edit</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground py-10 text-center">No leave types defined.</p>
                      )}
                    </TabsContent>

                    <TabsContent value="holidays">
                      <div className="flex justify-between mb-4">
                        <h3 className="text-xl font-medium">Holidays</h3>
                        <Button size="sm">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Holiday
                        </Button>
                      </div>

                      {isLoadingHolidays ? (
                        <div className="space-y-3">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : holidays && holidays.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Recurring</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {holidays.map((holiday) => (
                              <TableRow key={holiday.id}>
                                <TableCell>
                                  <div className="font-medium">{holiday.name}</div>
                                </TableCell>
                                <TableCell>{format(parseISO(holiday.date), 'MMMM d, yyyy')}</TableCell>
                                <TableCell>{holiday.description}</TableCell>
                                <TableCell>{holiday.recurring ? 'Yes' : 'No'}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">Edit</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground py-10 text-center">No holidays defined.</p>
                      )}
                    </TabsContent>

                    <TabsContent value="policies">
                      <div className="text-center py-10">
                        <div className="text-6xl opacity-20 mb-3">⚙️</div>
                        <h3 className="text-xl font-medium mb-2">Leave Policies</h3>
                        <p className="text-muted-foreground mb-4">Configure organization-wide leave policies.</p>
                        <Button>
                          <PlusCircle className="mr-2 h-4 w-4" /> Create Policy
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* New Leave Request Dialog */}
        <Dialog open={isNewLeaveDialogOpen} onOpenChange={setIsNewLeaveDialogOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="leaveTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {leaveTypes?.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const startDate = form.getValues("startDate");
                                return !startDate || date < startDate;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startHalfDay"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Half Day Start
                          </FormLabel>
                          <FormDescription>
                            Start in the afternoon
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endHalfDay"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Half Day End
                          </FormLabel>
                          <FormDescription>
                            End at noon
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="approverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approver</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select approver" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {managers?.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about your leave request..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsNewLeaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={createLeaveMutation.isPending}>Submit Request</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Cancel Leave Dialog */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cancel Leave Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this leave request?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="cancellationReason">Reason for cancellation</Label>
              <Textarea
                id="cancellationReason"
                placeholder="Provide a reason for cancellation..."
                className="mt-2 resize-none"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={confirmCancelLeave}
                loading={cancelLeaveMutation.isPending}
              >
                Cancel Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Leave Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Reject Leave Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this leave request.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="rejectionReason">Reason for rejection</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Provide a reason for rejection..."
                className="mt-2 resize-none"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRejectLeave}
                loading={updateLeaveStatusMutation.isPending}
              >
                Reject Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}