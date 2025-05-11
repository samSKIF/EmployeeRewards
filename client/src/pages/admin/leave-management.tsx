import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Users, FileText, Calendar, PlusCircle, CheckCircle, XCircle, Trash, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  user?: {
    id: number;
    name: string;
    email: string;
  };
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
  country: string;
  organizationId: number;
  recurring: boolean;
}

interface LeavePolicy {
  id: number;
  name: string;
  description: string;
  organizationId: number;
  approvalsRequired: number;
  maxConsecutiveDays: number;
  minNoticeDays: number;
  carryOverLimit: number;
  isActive: boolean;
}

// Form schemas
const leaveTypeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
  defaultDays: z.coerce.number().min(0, "Default days must be 0 or higher"),
  requiresApproval: z.boolean().default(true),
  workDaysCount: z.boolean().default(true),
  active: z.boolean().default(true),
});

const holidaySchema = z.object({
  name: z.string().min(2, "Name is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  description: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  recurring: z.boolean().default(false),
});

const leavePolicySchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  approvalsRequired: z.coerce.number().min(0, "Must be 0 or higher"),
  maxConsecutiveDays: z.coerce.number().min(0, "Must be 0 or higher"),
  minNoticeDays: z.coerce.number().min(0, "Must be 0 or higher"),
  carryOverLimit: z.coerce.number().min(0, "Must be 0 or higher"),
  isActive: z.boolean().default(true),
});

const leaveEntitlementSchema = z.object({
  userId: z.string().min(1, "User is required"),
  leaveTypeId: z.string().min(1, "Leave type is required"),
  totalDays: z.coerce.number().min(0, "Total days must be 0 or higher"),
  periodStart: z.date({
    required_error: "Start date is required",
  }),
  periodEnd: z.date({
    required_error: "End date is required",
  }),
});

// Admin Leave Management Component
export default function AdminLeaveManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leave-types');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leave data
  const { data: leaveTypes, isLoading: isLoadingLeaveTypes } = useQuery({
    queryKey: ['/api/leave/types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leave/types');
      return await response.json() as LeaveType[];
    },
  });

  const { data: leaveRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['/api/admin/leave/requests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/leave/requests');
      return await response.json() as LeaveRequest[];
    },
  });

  const { data: holidays, isLoading: isLoadingHolidays } = useQuery({
    queryKey: ['/api/leave/holidays'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leave/holidays');
      return await response.json() as Holiday[];
    },
  });

  const { data: leavePolicies, isLoading: isLoadingPolicies } = useQuery({
    queryKey: ['/api/leave/policies'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leave/policies');
      return await response.json() as LeavePolicy[];
    },
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return await response.json();
    },
  });

  const { data: entitlements, isLoading: isLoadingEntitlements } = useQuery({
    queryKey: ['/api/admin/leave/entitlements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/leave/entitlements');
      return await response.json() as LeaveEntitlement[];
    },
  });

  // Create leave type mutation
  const createLeaveTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/leave/types', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave type created",
        description: "New leave type has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave/types'] });
      setIsNewLeaveTypeDialogOpen(false);
      leaveTypeForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create leave type",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create holiday mutation
  const createHolidayMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/leave/holidays', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Holiday created",
        description: "New holiday has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave/holidays'] });
      setIsNewHolidayDialogOpen(false);
      holidayForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create holiday",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create policy mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/leave/policies', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave policy created",
        description: "New leave policy has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave/policies'] });
      setIsNewPolicyDialogOpen(false);
      policyForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create leave policy",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create entitlement mutation
  const createEntitlementMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/leave/entitlements', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave entitlement created",
        description: "New leave entitlement has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/leave/entitlements'] });
      setIsNewEntitlementDialogOpen(false);
      entitlementForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create leave entitlement",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Forms
  const leaveTypeForm = useForm<z.infer<typeof leaveTypeSchema>>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: {
      requiresApproval: true,
      workDaysCount: true,
      active: true,
      defaultDays: 0,
      color: "#3b82f6",
    },
  });

  const holidayForm = useForm<z.infer<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      recurring: false,
      country: "Global",
    },
  });

  const policyForm = useForm<z.infer<typeof leavePolicySchema>>({
    resolver: zodResolver(leavePolicySchema),
    defaultValues: {
      approvalsRequired: 1,
      maxConsecutiveDays: 20,
      minNoticeDays: 7,
      carryOverLimit: 5,
      isActive: true,
    },
  });

  const entitlementForm = useForm<z.infer<typeof leaveEntitlementSchema>>({
    resolver: zodResolver(leaveEntitlementSchema),
    defaultValues: {
      totalDays: 0,
    },
  });

  // Dialog control states
  const [isNewLeaveTypeDialogOpen, setIsNewLeaveTypeDialogOpen] = useState(false);
  const [isNewHolidayDialogOpen, setIsNewHolidayDialogOpen] = useState(false);
  const [isNewPolicyDialogOpen, setIsNewPolicyDialogOpen] = useState(false);
  const [isNewEntitlementDialogOpen, setIsNewEntitlementDialogOpen] = useState(false);

  // Submit handlers
  const onSubmitLeaveType = (values: z.infer<typeof leaveTypeSchema>) => {
    createLeaveTypeMutation.mutate(values);
  };

  const onSubmitHoliday = (values: z.infer<typeof holidaySchema>) => {
    createHolidayMutation.mutate({
      ...values,
      date: values.date.toISOString().split('T')[0],
      recurring: values.recurring,
      country: values.country,
    });
  };

  const onSubmitPolicy = (values: z.infer<typeof leavePolicySchema>) => {
    createPolicyMutation.mutate(values);
  };

  const onSubmitEntitlement = (values: z.infer<typeof leaveEntitlementSchema>) => {
    createEntitlementMutation.mutate({
      ...values,
      userId: parseInt(values.userId),
      leaveTypeId: parseInt(values.leaveTypeId),
      periodStart: values.periodStart.toISOString().split('T')[0],
      periodEnd: values.periodEnd.toISOString().split('T')[0],
    });
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

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Leave Management</h1>
          <p className="text-muted-foreground">Configure and manage organization leave settings</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="leave-types">
              <FileText className="mr-2 h-4 w-4" />
              Leave Types
            </TabsTrigger>
            <TabsTrigger value="holidays">
              <Calendar className="mr-2 h-4 w-4" />
              Holidays
            </TabsTrigger>
            <TabsTrigger value="policies">
              <FileText className="mr-2 h-4 w-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="entitlements">
              <Users className="mr-2 h-4 w-4" />
              Entitlements
            </TabsTrigger>
            <TabsTrigger value="requests">
              <CalendarDays className="mr-2 h-4 w-4" />
              Leave Requests
            </TabsTrigger>
          </TabsList>

          {/* Leave Types Tab */}
          <TabsContent value="leave-types">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Leave Types</CardTitle>
                  <CardDescription>Manage leave types for your organization</CardDescription>
                </div>
                <Button onClick={() => setIsNewLeaveTypeDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Leave Type
                </Button>
              </CardHeader>
              <CardContent>
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
                        <TableHead>Description</TableHead>
                        <TableHead>Default Days</TableHead>
                        <TableHead>Requires Approval</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div 
                                className="w-4 h-4 rounded-full mr-2" 
                                style={{ backgroundColor: type.color }}
                              ></div>
                              <span className="font-medium">{type.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{type.description}</TableCell>
                          <TableCell>{type.defaultDays}</TableCell>
                          <TableCell>{type.requiresApproval ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            {type.active ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-6xl opacity-20 mb-3">📋</div>
                    <h3 className="text-xl font-medium mb-2">No leave types defined</h3>
                    <p className="text-muted-foreground mb-4">Create leave types to start managing employee leave</p>
                    <Button onClick={() => setIsNewLeaveTypeDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Leave Type
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holidays Tab */}
          <TabsContent value="holidays">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Holidays</CardTitle>
                  <CardDescription>Manage organization holidays and public holidays</CardDescription>
                </div>
                <Button onClick={() => setIsNewHolidayDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Holiday
                </Button>
              </CardHeader>
              <CardContent>
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
                        <TableHead>Country</TableHead>
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
                          <TableCell>{holiday.country}</TableCell>
                          <TableCell>{format(parseISO(holiday.date), 'MMMM d, yyyy')}</TableCell>
                          <TableCell>{holiday.description}</TableCell>
                          <TableCell>{holiday.recurring ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-6xl opacity-20 mb-3">🏖️</div>
                    <h3 className="text-xl font-medium mb-2">No holidays defined</h3>
                    <p className="text-muted-foreground mb-4">Add holidays to your organization calendar</p>
                    <Button onClick={() => setIsNewHolidayDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Holiday
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Leave Policies</CardTitle>
                  <CardDescription>Configure organization-wide leave policies</CardDescription>
                </div>
                <Button onClick={() => setIsNewPolicyDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Policy
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingPolicies ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : leavePolicies && leavePolicies.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Approvals Required</TableHead>
                        <TableHead>Max Days</TableHead>
                        <TableHead>Notice Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leavePolicies.map((policy) => (
                        <TableRow key={policy.id}>
                          <TableCell>
                            <div className="font-medium">{policy.name}</div>
                          </TableCell>
                          <TableCell>{policy.description}</TableCell>
                          <TableCell>{policy.approvalsRequired}</TableCell>
                          <TableCell>{policy.maxConsecutiveDays}</TableCell>
                          <TableCell>{policy.minNoticeDays}</TableCell>
                          <TableCell>
                            {policy.isActive ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-6xl opacity-20 mb-3">📜</div>
                    <h3 className="text-xl font-medium mb-2">No leave policies defined</h3>
                    <p className="text-muted-foreground mb-4">Create leave policies to standardize leave management</p>
                    <Button onClick={() => setIsNewPolicyDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Policy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entitlements Tab */}
          <TabsContent value="entitlements">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Leave Entitlements</CardTitle>
                  <CardDescription>Manage employee leave balances and allowances</CardDescription>
                </div>
                <Button onClick={() => setIsNewEntitlementDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Entitlement
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingEntitlements ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : entitlements && entitlements.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Total Days</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entitlements.map((entitlement) => (
                        <TableRow key={entitlement.id}>
                          <TableCell>
                            <div className="font-medium">
                              {users?.find(u => u.id === entitlement.userId)?.name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>{entitlement.leaveType?.name || 'Unknown'}</TableCell>
                          <TableCell>{entitlement.totalDays}</TableCell>
                          <TableCell>{entitlement.usedDays}</TableCell>
                          <TableCell>{entitlement.remainingDays}</TableCell>
                          <TableCell>
                            {format(parseISO(entitlement.periodStart), 'MMM d, yyyy')} -<br />
                            {format(parseISO(entitlement.periodEnd), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-6xl opacity-20 mb-3">🏝️</div>
                    <h3 className="text-xl font-medium mb-2">No leave entitlements defined</h3>
                    <p className="text-muted-foreground mb-4">Assign leave entitlements to employees</p>
                    <Button onClick={() => setIsNewEntitlementDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Entitlement
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>All Leave Requests</CardTitle>
                <CardDescription>View and manage employee leave requests</CardDescription>
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
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approver</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((leave) => (
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
                          <TableCell>{getStatusBadge(leave.status)}</TableCell>
                          <TableCell>{leave.approver?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-6xl opacity-20 mb-3">📅</div>
                    <h3 className="text-xl font-medium mb-2">No leave requests found</h3>
                    <p className="text-muted-foreground">There are no leave requests to display</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Leave Type Dialog */}
        <Dialog open={isNewLeaveTypeDialogOpen} onOpenChange={setIsNewLeaveTypeDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Leave Type</DialogTitle>
              <DialogDescription>
                Add a new leave type to the organization.
              </DialogDescription>
            </DialogHeader>
            <Form {...leaveTypeForm}>
              <form onSubmit={leaveTypeForm.handleSubmit(onSubmitLeaveType)} className="space-y-4">
                <FormField
                  control={leaveTypeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Annual Leave, Sick Leave, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={leaveTypeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this leave type"
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={leaveTypeForm.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-6 h-6 rounded-full border" 
                              style={{ backgroundColor: field.value }}
                            ></div>
                            <Input type="color" {...field} className="w-24 h-8 p-1" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={leaveTypeForm.control}
                    name="defaultDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Days</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={leaveTypeForm.control}
                    name="requiresApproval"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Requires Approval</FormLabel>
                          <FormDescription className="text-xs">
                            Manager must approve requests
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
                    control={leaveTypeForm.control}
                    name="workDaysCount"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Count Work Days Only</FormLabel>
                          <FormDescription className="text-xs">
                            Exclude weekends
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
                  control={leaveTypeForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Employees can request this leave type
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

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsNewLeaveTypeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLeaveTypeMutation.isPending}>
                    {createLeaveTypeMutation.isPending ? "Creating..." : "Create Leave Type"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Create Holiday Dialog */}
        <Dialog open={isNewHolidayDialogOpen} onOpenChange={setIsNewHolidayDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
              <DialogDescription>
                Add a new holiday to the company calendar.
              </DialogDescription>
            </DialogHeader>
            <Form {...holidayForm}>
              <form onSubmit={holidayForm.handleSubmit(onSubmitHoliday)} className="space-y-4">
                <FormField
                  control={holidayForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Holiday Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. New Year's Day, Christmas, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={holidayForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Global, USA, UK, France, etc." {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Specify the country for this holiday or use "Global" for all countries
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={holidayForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={holidayForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Optional description for this holiday"
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={holidayForm.control}
                  name="recurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Recurring Holiday</FormLabel>
                        <FormDescription>
                          This holiday repeats every year
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

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsNewHolidayDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createHolidayMutation.isPending}>
                    {createHolidayMutation.isPending ? "Creating..." : "Add Holiday"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Create Policy Dialog */}
        <Dialog open={isNewPolicyDialogOpen} onOpenChange={setIsNewPolicyDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Leave Policy</DialogTitle>
              <DialogDescription>
                Define organization-wide leave policies.
              </DialogDescription>
            </DialogHeader>
            <Form {...policyForm}>
              <form onSubmit={policyForm.handleSubmit(onSubmitPolicy)} className="space-y-4">
                <FormField
                  control={policyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Standard Policy, Manager Policy, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={policyForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of this policy"
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={policyForm.control}
                    name="approvalsRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approvals Required</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Number of approvals needed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={policyForm.control}
                    name="maxConsecutiveDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Consecutive Days</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Maximum days per request
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={policyForm.control}
                    name="minNoticeDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Notice</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Days of notice required
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={policyForm.control}
                    name="carryOverLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carry Over Limit</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Max days to carry to next year
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={policyForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Policy is currently in effect
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

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsNewPolicyDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPolicyMutation.isPending}>
                    {createPolicyMutation.isPending ? "Creating..." : "Create Policy"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Create Entitlement Dialog */}
        <Dialog open={isNewEntitlementDialogOpen} onOpenChange={setIsNewEntitlementDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Leave Entitlement</DialogTitle>
              <DialogDescription>
                Assign leave balances to employees.
              </DialogDescription>
            </DialogHeader>
            <Form {...entitlementForm}>
              <form onSubmit={entitlementForm.handleSubmit(onSubmitEntitlement)} className="space-y-4">
                <FormField
                  control={entitlementForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={entitlementForm.control}
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
                          {leaveTypes?.map(type => (
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

                <FormField
                  control={entitlementForm.control}
                  name="totalDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Days</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.5" {...field} />
                      </FormControl>
                      <FormDescription>
                        Total number of days allocated for this leave type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={entitlementForm.control}
                    name="periodStart"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Period Start</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value ? "text-muted-foreground" : ""
                                }`}
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
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={entitlementForm.control}
                    name="periodEnd"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Period End</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value ? "text-muted-foreground" : ""
                                }`}
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
                                const startDate = entitlementForm.getValues("periodStart");
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

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsNewEntitlementDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createEntitlementMutation.isPending}>
                    {createEntitlementMutation.isPending ? "Creating..." : "Create Entitlement"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
    </div>
  );
}