import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  Store,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  Plus,
  Eye,
  Edit,
  CreditCard,
  Key,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { countries } from '@/data/countries';
import { useLocation } from 'wouter';

// Types for the unified management system
interface Organization {
  id: number;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  userCount: number;
  maxUsers?: number;
  contactEmail?: string;
  industry?: string;
  isActive: boolean;
  description?: string;
  subscription?: {
    id: number;
    subscribedUsers: number;
    totalMonthlyAmount: number;
    expirationDate: string;
    isActive: boolean;
    subscriptionPeriod: string;
    pricePerUserPerMonth: number;
    lastPaymentDate: string;
    daysRemaining?: number;
  };
}

interface OrganizationWithStats extends Organization {
  stats: {
    userCount: number;
    orderCount: number;
    totalSpent: number;
  };
}

interface User {
  id: number;
  username?: string;
  name: string;
  email: string;
  department?: string;
  jobTitle?: string;
  roleType?: string;
  isAdmin?: boolean;
  status?: string;
  organizationId: number;
  organizationName?: string;
  balance: number;
  createdAt: string;
  lastSeenAt?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  category: string;
  price: number;
  pointsPrice: number;
  stock?: number;
  status: string;
  isActive: boolean;
  createdAt: string;
}

interface Order {
  id: number;
  employeeName: string;
  employeeEmail: string;
  quantity: number;
  pointsUsed: number;
  totalAmount: string;
  status: string;
  productName?: string;
  organizationName?: string;
  merchantName?: string;
  createdAt: string;
}

interface PlatformStats {
  organizations: number;
  merchants: number;
  products: number;
  orders: number;
  totalRevenue: string;
  totalPointsUsed: number;
}

// Activities list for organizations
const ACTIVITIES = [
  { label: 'Technology & Software', value: 'technology' },
  { label: 'Healthcare & Medical', value: 'healthcare' },
  { label: 'Financial Services', value: 'financial' },
  { label: 'Education & Training', value: 'education' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Retail & E-commerce', value: 'retail' },
  { label: 'Consulting Services', value: 'consulting' },
  { label: 'Real Estate', value: 'real-estate' },
  { label: 'Construction', value: 'construction' },
  { label: 'Transportation & Logistics', value: 'logistics' },
  { label: 'Food & Beverage', value: 'food-beverage' },
  { label: 'Media & Entertainment', value: 'media' },
  { label: 'Telecommunications', value: 'telecom' },
  { label: 'Energy & Utilities', value: 'energy' },
  { label: 'Government & Public Sector', value: 'government' },
  { label: 'Non-Profit Organizations', value: 'non-profit' },
  { label: 'Aerospace & Defense', value: 'aerospace' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Pharmaceuticals', value: 'pharma' },
  { label: 'Agriculture', value: 'agriculture' },
  { label: 'Tourism & Hospitality', value: 'hospitality' },
  { label: 'Legal Services', value: 'legal' },
  { label: 'Marketing & Advertising', value: 'marketing' },
  { label: 'Insurance', value: 'insurance' },
  { label: 'Banking', value: 'banking' },
  { label: 'Architecture & Design', value: 'architecture' },
  { label: 'Research & Development', value: 'research' },
  { label: 'Human Resources', value: 'hr' },
  { label: 'Facility Management', value: 'facility' },
  { label: 'Security Services', value: 'security' },
];

// Country-City mapping (simplified version)
const COUNTRY_CITIES: Record<string, string[]> = {
  AE: [
    'Dubai',
    'Abu Dhabi',
    'Sharjah',
    'Ajman',
    'Ras Al Khaimah',
    'Fujairah',
    'Umm Al Quwain',
  ],
  US: [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
    'San Jose',
  ],
  GB: [
    'London',
    'Birmingham',
    'Manchester',
    'Glasgow',
    'Liverpool',
    'Newcastle',
    'Sheffield',
    'Bristol',
    'Leicester',
    'Edinburgh',
  ],
  CA: [
    'Toronto',
    'Montreal',
    'Vancouver',
    'Calgary',
    'Edmonton',
    'Ottawa',
    'Winnipeg',
    'Quebec City',
    'Hamilton',
    'Kitchener',
  ],
  AU: [
    'Sydney',
    'Melbourne',
    'Brisbane',
    'Perth',
    'Adelaide',
    'Gold Coast',
    'Newcastle',
    'Canberra',
    'Sunshine Coast',
    'Wollongong',
  ],
  DE: [
    'Berlin',
    'Hamburg',
    'Munich',
    'Cologne',
    'Frankfurt',
    'Stuttgart',
    'Düsseldorf',
    'Leipzig',
    'Dortmund',
    'Essen',
  ],
  FR: [
    'Paris',
    'Marseille',
    'Lyon',
    'Toulouse',
    'Nice',
    'Nantes',
    'Montpellier',
    'Strasbourg',
    'Bordeaux',
    'Lille',
  ],
  IN: [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Ahmedabad',
    'Jaipur',
    'Surat',
  ],
  CN: [
    'Beijing',
    'Shanghai',
    'Guangzhou',
    'Shenzhen',
    'Chengdu',
    'Hangzhou',
    'Wuhan',
    "Xi'an",
    'Suzhou',
    'Zhengzhou',
  ],
  JP: [
    'Tokyo',
    'Osaka',
    'Nagoya',
    'Sapporo',
    'Fukuoka',
    'Kobe',
    'Kyoto',
    'Kawasaki',
    'Saitama',
    'Hiroshima',
  ],
  BR: [
    'São Paulo',
    'Rio de Janeiro',
    'Brasília',
    'Salvador',
    'Fortaleza',
    'Belo Horizonte',
    'Manaus',
    'Curitiba',
    'Recife',
    'Goiânia',
  ],
  global: ['Other/Not Listed'],
};

// Form schemas
const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

const merchantSchema = z.object({
  name: z.string().min(1, 'Merchant name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  commissionRate: z.number().min(0).max(100),
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.enum(['merchandise', 'giftcard', 'experience']),
  price: z.number().min(0),
  pointsPrice: z.number().min(1),
  merchantId: z.number(),
  stock: z.number().min(0).optional(),
});

// Management Authentication Hook
const useManagementAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('managementToken'));
  const [user, setUser] = useState(null);

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/management/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) throw new Error('Login failed');

    const data = await response.json();
    localStorage.setItem('managementToken', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('managementToken');
    setToken(null);
    setUser(null);
  };

  return { token, user, login, logout, isAuthenticated: !!token };
};

// API Helper
const managementApi = (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('managementToken');
  return fetch(`/api/management${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache',
      ...options.headers,
    },
  }).then(async (res) => {
    console.log(`API Response for ${endpoint}:`, {
      status: res.status,
      statusText: res.statusText,
    });

    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);

    // For 304 responses, the cached data should be used by React Query
    if (res.status === 304) {
      console.log('304 response - using cached data');
      throw new Error('NOT_MODIFIED'); // This will trigger React Query to use cached data
    }

    const contentType = res.headers.get('content-type');
    console.log(`Content-Type for ${endpoint}:`, contentType);
    
    // Try to parse as JSON even if content-type is missing or incorrect
    try {
      const text = await res.text();
      console.log(`Raw response for ${endpoint}:`, text);
      
      if (text) {
        const data = JSON.parse(text);
        console.log(`API Data for ${endpoint}:`, data);
        return data;
      }
      
      console.log('Empty response body');
      return [];
    } catch (error) {
      console.error('Failed to parse response:', error);
      return null;
    }
  });
};

// Login Component
const ManagementLogin = ({
  onLogin,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onLogin(username, password);
      toast({
        title: 'Login successful',
        description: 'Welcome to the management dashboard',
      });
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            ThrivioHR Management
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-4">
              Are you an organization member?
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = '/auth')}
            >
              Sign in as Organization Member
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Analytics interface matching backend response
interface Analytics {
  organizationStats: {
    totalOrganizations: number;
    activeOrganizations: number;
    totalBillableUsers: number;
    averageUsersPerOrg: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalSubscribedCapacity: number;
    totalMonthlyRevenue: number;
    currentEmployees: number;
  };
  platformStats: {
    status: string;
    uptime: string;
  };
}

// Dashboard Stats Component
const DashboardStats = () => {
  const { data: stats } = useQuery<Analytics>({
    queryKey: ['/api/management/analytics'],
    queryFn: async () => {
      const result = await managementApi('/analytics');
      return result;
    },
  });

  const statCards = [
    {
      title: 'Organizations',
      value: stats?.organizationStats?.totalOrganizations || 0,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      title: 'Users',
      value: stats?.organizationStats?.currentEmployees || 0,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Subscriptions',
      value: stats?.organizationStats?.activeSubscriptions || 0,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Capacity',
      value: stats?.organizationStats?.totalSubscribedCapacity || 0,
      icon: ShoppingCart,
      color: 'bg-orange-500',
    },
    {
      title: 'Revenue',
      value: `$${stats?.organizationStats?.totalMonthlyRevenue || '0'}`,
      icon: DollarSign,
      color: 'bg-red-500',
    },
    {
      title: 'Status',
      value: stats?.platformStats?.status || 'Unknown',
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`${stat.color} p-2 rounded-md`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Unified Organization Management Component
const UnifiedOrganizationManager = ({
  organization,
  onSuccess,
  onResetPassword,
  creditWalletMutation,
}: {
  organization: Organization;
  onSuccess: () => void;
  onResetPassword: () => void;
  creditWalletMutation: any;
}) => {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="details">Organization Details</TabsTrigger>
        <TabsTrigger value="admin">Admin Access</TabsTrigger>
        <TabsTrigger value="subscription">Subscription</TabsTrigger>
        <TabsTrigger value="wallet">Wallet</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <EditOrganizationForm
          organization={organization}
          onSuccess={onSuccess}
        />
      </TabsContent>

      <TabsContent value="admin" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Admin Password Management</CardTitle>
            <CardDescription>
              Reset the admin password for {organization.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onResetPassword} variant="destructive">
              <Key className="h-4 w-4 mr-2" />
              Reset Admin Password
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              This will generate a new random password and display it once. Make
              sure to save it securely.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subscription" className="space-y-4">
        <SubscriptionManagement organizationId={organization.id} />
        <OrganizationFeaturesManagement organizationId={organization.id} />
      </TabsContent>

      <TabsContent value="wallet" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Credit Organization Wallet</CardTitle>
            <CardDescription>
              Add funds to {organization.name}'s wallet for rewards and
              purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                creditWalletMutation.mutate({
                  organizationId: organization.id,
                  amount: Number(formData.get('amount')),
                  description: formData.get('description') as string,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="100.00"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  name="description"
                  placeholder="e.g., Monthly credit allocation"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={creditWalletMutation.isPending}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {creditWalletMutation.isPending
                  ? 'Processing...'
                  : 'Credit Wallet'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

// Organization Features Management Component
const OrganizationFeaturesManagement = ({
  organizationId,
}: {
  organizationId: number;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get organization features
  const { data: features, isLoading } = useQuery({
    queryKey: [`/api/management/organizations/${organizationId}/features`],
    queryFn: async () => {
      const result = await managementApi(`/organizations/${organizationId}/features`);
      return result;
    },
  });

  const updateFeatureMutation = useMutation({
    mutationFn: ({ featureKey, isEnabled }: { featureKey: string; isEnabled: boolean }) =>
      managementApi(`/organizations/${organizationId}/features/${featureKey}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled }),
      }),
    onSuccess: async (_, { featureKey, isEnabled }) => {
      // Invalidate and refetch the features
      await queryClient.invalidateQueries({
        queryKey: [`/api/management/organizations/${organizationId}/features`],
      });
      
      // Also invalidate admin organization features for real-time menu updates
      await queryClient.invalidateQueries({
        queryKey: ['/api/admin/organization/features'],
      });
      
      toast({ 
        title: `${featureKey.charAt(0).toUpperCase() + featureKey.slice(1)} module ${isEnabled ? 'enabled' : 'disabled'}`,
        description: isEnabled 
          ? `The ${featureKey} module is now active for this organization.`
          : `The ${featureKey} module has been deactivated for this organization.`
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update feature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">Loading features...</div>;
  }

  const recognitionFeature = features?.find((f: any) => f.feature_key === 'recognition');
  
  // Debug logging
  console.log('Features data:', features);
  console.log('Recognition feature:', recognitionFeature);
  console.log('Is enabled:', recognitionFeature?.is_enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Organization Features</CardTitle>
        <CardDescription>
          Control which modules are available for this organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="font-medium">Recognition & Rewards Module</div>
            <div className="text-sm text-muted-foreground">
              Enable peer-to-peer recognition, points economy, and reward shop features
            </div>

          </div>
          <Switch
            checked={Boolean(recognitionFeature?.is_enabled)}
            onCheckedChange={(checked) => {
              console.log('Toggle clicked, new state:', checked);
              updateFeatureMutation.mutate({
                featureKey: 'recognition',
                isEnabled: checked,
              });
            }}
            disabled={updateFeatureMutation.isPending}
          />
        </div>

        {recognitionFeature?.is_enabled && (
          <div className="pl-4 text-sm text-muted-foreground">
            <p>✓ Recognition Settings</p>
            <p>✓ Points Economy</p>
            <p>✓ Reward Shop</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Subscription Management Component
const SubscriptionManagement = ({
  organizationId,
}: {
  organizationId: number;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isRenewSectionCollapsed, setIsRenewSectionCollapsed] = useState(true);

  // Get current subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: [`/api/management/organizations/${organizationId}/subscription`],
    queryFn: async () => {
      const result = await managementApi(
        `/organizations/${organizationId}/subscription`
      );
      return result;
    },
  });

  // Get organization-specific data for accurate user counts
  const { data: orgStats } = useQuery({
    queryKey: [`/api/management/organizations/${organizationId}`],
    queryFn: async () => {
      const result = await managementApi(`/organizations/${organizationId}`);
      return result;
    },
  });

  const subscriptionForm = useForm({
    defaultValues: {
      lastPaymentDate: new Date().toISOString().split('T')[0],
      subscriptionPeriod: 'quarter' as 'quarter' | 'year' | 'custom',
      customDurationDays: 90,
      subscribedUsers: 50,
      pricePerUserPerMonth: 10.0,
      totalMonthlyAmount: 500.0,
    },
  });

  const createSubscription = useMutation({
    mutationFn: (data: {
      lastPaymentDate: string;
      subscriptionPeriod: string;
      customDurationDays?: number;
    }) =>
      managementApi(`/organizations/${organizationId}/subscription`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/management/organizations/${organizationId}/subscription`,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/management/organizations'],
      });
      toast({ title: 'Subscription created successfully' });
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to create subscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const renewSubscription = useMutation({
    mutationFn: (data: {
      lastPaymentDate: string;
      subscriptionPeriod: string;
      customDurationDays?: number;
    }) =>
      managementApi(`/organizations/${organizationId}/subscription/renew`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/management/organizations/${organizationId}/subscription`,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/management/organizations'],
      });
      toast({ title: 'Subscription renewed successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to renew subscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deactivateSubscription = useMutation({
    mutationFn: () =>
      managementApi(
        `/organizations/${organizationId}/subscription/deactivate`,
        {
          method: 'POST',
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          `/api/management/organizations/${organizationId}/subscription`,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/management/organizations'],
      });
      toast({ title: 'Subscription deactivated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to deactivate subscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: any) => {
    if (hasSubscription) {
      renewSubscription.mutate(data);
    } else {
      createSubscription.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">Loading subscription details...</div>
    );
  }

  const hasSubscription = subscriptionData?.hasSubscription && subscriptionData?.subscription;
  const subscription = subscriptionData?.subscription;
  const isActive = subscription?.isActive;

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {hasSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Period</Label>
                <p className="text-sm font-medium">
                  {subscription?.subscriptionPeriod}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Last Payment
                </Label>
                <p className="text-sm">
                  {subscription?.lastPaymentDate
                    ? new Date(
                        subscription.lastPaymentDate
                      ).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Expiration
                </Label>
                <p className="text-sm">
                  {subscription?.expirationDate
                    ? new Date(
                        subscription.expirationDate
                      ).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Subscription Pricing</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Subscribed Users
                  </Label>
                  <p className="text-lg font-semibold">
                    {subscription?.subscribedUsers || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Price Per User/Month
                  </Label>
                  <p className="text-lg font-semibold">
                    $
                    {subscription?.pricePerUserPerMonth
                      ? subscription.pricePerUserPerMonth.toFixed(2)
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Total Monthly Amount
                  </Label>
                  <p className="text-lg font-semibold text-green-600">
                    $
                    {subscription?.totalMonthlyAmount
                      ? subscription.totalMonthlyAmount.toFixed(2)
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* User Count Limit Display */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">User Limits</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Current Users
                  </Label>
                  <p className="text-lg font-semibold">
                    {orgStats?.userCount || 0}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Subscribed Users
                  </Label>
                  <p className="text-lg font-semibold">
                    {subscription?.subscribedUsers || 'N/A'}
                  </p>
                </div>
              </div>
              {subscription?.subscribedUsers && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Usage</span>
                    <span>
                      {subscription.currentUserCount || 0} /{' '}
                      {subscription.subscribedUsers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (subscription.currentUserCount || 0) /
                          subscription.subscribedUsers >=
                        0.9
                          ? 'bg-red-500'
                          : (subscription.currentUserCount || 0) /
                                subscription.subscribedUsers >=
                              0.8
                            ? 'bg-orange-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(100, ((subscription.currentUserCount || 0) / subscription.subscribedUsers) * 100)}%`,
                      }}
                    />
                  </div>
                  {(subscription.currentUserCount || 0) /
                    subscription.subscribedUsers >=
                    0.9 && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Approaching user limit - new registrations may be
                      blocked
                    </p>
                  )}
                </div>
              )}
            </div>

            {subscription?.calculatedStatus && (
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full bg-${subscription.calculatedStatus.color}-500`}
                  ></div>
                  <span className="text-sm font-medium capitalize">
                    {subscription.calculatedStatus.status}
                  </span>
                  {subscription.calculatedStatus.daysRemaining > 0 && (
                    <span className="text-sm text-muted-foreground">
                      - {subscription.calculatedStatus.daysRemaining} days
                      remaining
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Renew Subscription Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {hasSubscription ? 'Renew Subscription' : 'Create Subscription'}
            </CardTitle>
            {hasSubscription && isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRenewSectionCollapsed(!isRenewSectionCollapsed)}
                className="flex items-center gap-2"
              >
                {isRenewSectionCollapsed ? (
                  <>
                    <span>Show Renewal Options</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Hide Renewal Options</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        {(!hasSubscription || !isActive || !isRenewSectionCollapsed) && (
          <CardContent>
          <Form {...subscriptionForm}>
            <form
              onSubmit={subscriptionForm.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={subscriptionForm.control}
                name="lastPaymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={subscriptionForm.control}
                name="subscriptionPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Period</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quarter">
                            Quarter (90 days)
                          </SelectItem>
                          <SelectItem value="year">Year (365 days)</SelectItem>
                          <SelectItem value="custom">
                            Custom Duration
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {subscriptionForm.watch('subscriptionPeriod') === 'custom' && (
                <FormField
                  control={subscriptionForm.control}
                  name="customDurationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Duration (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={subscriptionForm.control}
                  name="subscribedUsers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscribed Users</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50"
                          {...field}
                          onChange={(e) => {
                            const users = Number(e.target.value);
                            field.onChange(users);
                            // Auto-calculate total monthly amount
                            const pricePerUser =
                              subscriptionForm.getValues(
                                'pricePerUserPerMonth'
                              ) || 10;
                            subscriptionForm.setValue(
                              'totalMonthlyAmount',
                              users * pricePerUser
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={subscriptionForm.control}
                  name="pricePerUserPerMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Per User/Month ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="10.00"
                          {...field}
                          onChange={(e) => {
                            const price = Number(e.target.value);
                            field.onChange(price);
                            // Auto-calculate total monthly amount
                            const users =
                              subscriptionForm.getValues('subscribedUsers') ||
                              50;
                            subscriptionForm.setValue(
                              'totalMonthlyAmount',
                              users * price
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={subscriptionForm.control}
                name="totalMonthlyAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Monthly Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={
                  createSubscription.isPending || renewSubscription.isPending
                }
              >
                {createSubscription.isPending || renewSubscription.isPending
                  ? 'Processing...'
                  : hasSubscription
                    ? 'Renew Subscription'
                    : 'Create Subscription'}
              </Button>
            </form>
          </Form>
        </CardContent>
        )}
        {hasSubscription && isActive && isRenewSectionCollapsed && (
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground text-center py-4">
              Subscription is active. Click "Show Renewal Options" above to renew or modify.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      {hasSubscription && isActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => deactivateSubscription.mutate()}
              disabled={deactivateSubscription.isPending}
            >
              {deactivateSubscription.isPending
                ? 'Deactivating...'
                : 'Deactivate Subscription'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Edit Organization Form Component
const EditOrganizationForm = ({
  organization,
  onSuccess,
}: {
  organization: Organization;
  onSuccess: () => void;
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // First fetch the full organization details
  const { data: fullOrganization, isLoading } = useQuery({
    queryKey: [`/api/management/organizations/${organization.id}`],
    enabled: !!organization.id,
    queryFn: async () => {
      const result = await managementApi(`/organizations/${organization.id}`);
      return result;
    },
  });

  console.log('Query state:', { isLoading, fullOrganization });

  const form = useForm({
    defaultValues: {
      name: organization.name,
      status: organization.status,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      superuserEmail: '',
      industry: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (fullOrganization) {
      console.log('Raw API response:', fullOrganization);
      console.log('Organization ID being fetched:', organization.id);

      const formData = {
        name: fullOrganization.name || '',
        status: fullOrganization.status || 'active',
        contactName: fullOrganization.contactName || '',
        contactEmail: fullOrganization.contactEmail || '',
        contactPhone: fullOrganization.contactPhone || '',
        superuserEmail:
          fullOrganization.adminEmail || fullOrganization.superuserEmail || '',
        industry: fullOrganization.industry || '',
        address: {
          street:
            fullOrganization.streetAddress ||
            fullOrganization.address?.street ||
            '',
          city: fullOrganization.city || fullOrganization.address?.city || '',
          state:
            fullOrganization.state || fullOrganization.address?.state || '',
          zipCode:
            fullOrganization.zipCode || fullOrganization.address?.zipCode || '',
          country:
            fullOrganization.country || fullOrganization.address?.country || '',
        },
      };
      console.log('Processed form data:', formData);

      // Set selected country and update cities BEFORE setting form values
      if (formData.address.country) {
        setSelectedCountry(formData.address.country);
        setAvailableCities(COUNTRY_CITIES[formData.address.country] || []);
      }

      // Use reset to set all form values at once - this properly updates controlled components
      form.reset({
        name: formData.name,
        status: formData.status,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        superuserEmail: formData.superuserEmail,
        industry: formData.industry,
        address: {
          street: formData.address.street,
          city: formData.address.city,
          state: formData.address.state,
          zipCode: formData.address.zipCode,
          country: formData.address.country,
        },
      });

      console.log('Form values after setting:', form.getValues());
    }
  }, [fullOrganization, organization, form]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await managementApi(
        `/organizations/${organization.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );

      // managementApi returns the data directly, not a Response object
      if (response) {
        toast({ title: 'Organization updated successfully' });
        setIsOpen(false);
        // Immediately refetch to get latest data
        await fullOrgQuery.refetch();
        onSuccess();
      } else {
        toast({
          title: 'Failed to update organization',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Update error:', error);
      toast({ title: 'Failed to update organization', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="superuserEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Activity *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business activity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-60">
                  {ACTIVITIES.map((activity) => (
                    <SelectItem key={activity.value} value={activity.value}>
                      {activity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Address Information</h3>
          <FormField
            control={form.control}
            name="address.street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address.country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCountry(value);
                      setAvailableCities(COUNTRY_CITIES[value] || []);
                      // Reset city when country changes
                      form.setValue('address.city', '');
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
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
              name="address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  {availableCities.length > 0 ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedCountry}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {availableCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter city"
                        disabled={!selectedCountry}
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address.state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State/Region</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address.zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP/Postal Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., 0000, 12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update Organization'}
        </Button>
      </form>
    </Form>
  );
};

// Organizations Management
const OrganizationsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: organizations,
    isLoading,
    error,
  } = useQuery<Organization[]>({
    queryKey: ['/api/management/organizations'],
    queryFn: async () => {
      const result = await managementApi('/organizations');
      return result;
    },
  });

  console.log('Organizations Query:', { isLoading, error, organizations });

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      status: 'active',
    },
  });

  const createOrganizationMutation = useMutation({
    mutationFn: (data: z.infer<typeof organizationSchema>) =>
      managementApi('/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/management/organizations'],
      });
      toast({ title: 'Organization created successfully' });
      form.reset();
    },
    onError: () => {
      toast({ title: 'Failed to create organization', variant: 'destructive' });
    },
  });

  const creditWalletMutation = useMutation({
    mutationFn: ({
      organizationId,
      amount,
      description,
    }: {
      organizationId: number;
      amount: number;
      description: string;
    }) =>
      managementApi(`/organizations/${organizationId}/credit`, {
        method: 'POST',
        body: JSON.stringify({ amount, description }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/management/organizations'],
      });
      toast({ title: 'Wallet credited successfully' });
    },
  });

  const [, setLocation] = useLocation();

  const handleResetPassword = async (organizationId: number) => {
    try {
      const response = await managementApi(
        `/organizations/${organizationId}/reset-password`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Password Reset Successfully',
          description: `New password: ${result.newPassword}`,
          duration: 10000,
        });
      } else {
        toast({ title: 'Failed to reset password', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to reset password', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Organizations</h2>
        <Button onClick={() => setLocation('/management/organizations/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Organization
        </Button>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="text-center py-8">Loading organizations...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error loading organizations: {error.message}
          </div>
        ) : !organizations || organizations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No organizations found
          </div>
        ) : (
          organizations.map((organization) => (
            <Card key={organization.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{organization.name}</CardTitle>
                    <CardDescription>
                      Status: {organization.status}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        organization.status === 'active'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {organization.status}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Manage Organization
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Manage {organization.name}</DialogTitle>
                          <DialogDescription>
                            Complete organization management for{' '}
                            {organization.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[75vh] overflow-y-auto">
                          <UnifiedOrganizationManager
                            organization={organization}
                            onSuccess={async () => {
                              await queryClient.invalidateQueries({
                                queryKey: ['/organizations'],
                              });
                              await queryClient.invalidateQueries({
                                queryKey: [`/organizations/${organization.id}`],
                              });
                              setSelectedOrg(null);
                            }}
                            onResetPassword={() =>
                              handleResetPassword(organization.id)
                            }
                            creditWalletMutation={creditWalletMutation}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User Count</p>
                    <p className="text-lg font-semibold">
                      {organization.userCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Max Employees
                    </p>
                    <p className="text-lg font-semibold">
                      {organization.subscription?.subscribedUsers || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {new Date(organization.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Subscription
                    </p>
                    <div className="flex items-center gap-2">
                      {organization.subscription?.isActive ? (
                        <>
                          <Badge variant="default" className="text-xs">
                            {organization.subscription?.subscriptionPeriod || 'Active'}
                          </Badge>
                          {organization.subscription?.daysRemaining !== undefined && (
                            <span
                              className={`text-xs ${
                                organization.subscription.daysRemaining <= 30
                                  ? 'text-orange-600'
                                  : organization.subscription.daysRemaining <= 7
                                    ? 'text-red-600'
                                    : 'text-green-600'
                              }`}
                            >
                              {organization.subscription.daysRemaining}d left
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          No subscription
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Last Payment
                    </p>
                    <p className="text-sm">
                      {organization.subscription?.lastPaymentDate
                        ? new Date(
                            organization.subscription.lastPaymentDate
                          ).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expiration</p>
                    <p className="text-sm">
                      {organization.subscription?.expirationDate
                        ? new Date(
                            organization.subscription.expirationDate
                          ).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function ManagementDashboard() {
  const { token, user, login, logout, isAuthenticated } = useManagementAuth();

  if (!isAuthenticated) {
    return <ManagementLogin onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                ThrivioHR Management
              </h1>
              <p className="text-sm text-gray-500">
                SaaS Platform Administration
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name}
              </span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="companies">Organizations</TabsTrigger>
            <TabsTrigger value="merchants">Merchants</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <DashboardStats />
          </TabsContent>

          <TabsContent value="companies">
            <OrganizationsManagement />
          </TabsContent>

          <TabsContent value="merchants">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Merchants</h2>
              <p className="text-muted-foreground">
                Manage marketplace merchants and their products
              </p>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Products</h2>
              <p className="text-muted-foreground">
                Manage marketplace product catalog
              </p>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Orders</h2>
              <p className="text-muted-foreground">
                Monitor and manage customer orders
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
