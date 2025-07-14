import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
  Key
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
  'Technology & Software',
  'Healthcare & Medical',
  'Financial Services',
  'Education & Training',
  'Manufacturing',
  'Retail & E-commerce',
  'Consulting Services',
  'Real Estate',
  'Construction',
  'Transportation & Logistics',
  'Food & Beverage',
  'Media & Entertainment',
  'Telecommunications',
  'Energy & Utilities',
  'Government & Public Sector',
  'Non-Profit Organizations',
  'Aerospace & Defense',
  'Automotive',
  'Pharmaceuticals',
  'Agriculture',
  'Tourism & Hospitality',
  'Legal Services',
  'Marketing & Advertising',
  'Insurance',
  'Banking',
  'Architecture & Design',
  'Research & Development',
  'Human Resources',
  'Facility Management',
  'Security Services'
];

// Country-City mapping (simplified version)
const COUNTRY_CITIES: Record<string, string[]> = {
  'AE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
  'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
  'GB': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Newcastle', 'Sheffield', 'Bristol', 'Leicester', 'Edinburgh'],
  'CA': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'],
  'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong'],
  'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen'],
  'FR': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille'],
  'IN': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'],
  'CN': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan', 'Xi\'an', 'Suzhou', 'Zhengzhou'],
  'JP': ['Tokyo', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama', 'Hiroshima'],
  'BR': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Goiânia'],
  'global': ['Other/Not Listed']
};

// Form schemas
const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active')
});

const merchantSchema = z.object({
  name: z.string().min(1, 'Merchant name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  commissionRate: z.number().min(0).max(100)
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.enum(['merchandise', 'giftcard', 'experience']),
  price: z.number().min(0),
  pointsPrice: z.number().min(1),
  merchantId: z.number(),
  stock: z.number().min(0).optional()
});

// Management Authentication Hook
const useManagementAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('managementToken'));
  const [user, setUser] = useState(null);

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/management/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
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
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache',
      ...options.headers
    }
  }).then(async res => {
    console.log(`API Response for ${endpoint}:`, { status: res.status, statusText: res.statusText });
    
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    
    // For 304 responses, the cached data should be used by React Query
    if (res.status === 304) {
      console.log('304 response - using cached data');
      throw new Error('NOT_MODIFIED'); // This will trigger React Query to use cached data
    }
    
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      console.log(`API Data for ${endpoint}:`, data);
      return data;
    }
    
    return null;
  });
};

// Login Component
const ManagementLogin = ({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onLogin(username, password);
      toast({ title: 'Login successful', description: 'Welcome to the management dashboard' });
    } catch (error) {
      toast({ title: 'Login failed', description: 'Invalid credentials', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Empulse Management</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Stats Component
const DashboardStats = () => {
  const { data: stats } = useQuery<Analytics>({
    queryKey: ['/api/management/analytics'],
    queryFn: () => managementApi('/analytics')
  });

  const statCards = [
    { title: 'Organizations', value: stats?.totals.organizations || 0, icon: Building2, color: 'bg-blue-500' },
    { title: 'Users', value: stats?.totals.users || 0, icon: Users, color: 'bg-green-500' },
    { title: 'Products', value: stats?.totals.products || 0, icon: Package, color: 'bg-purple-500' },
    { title: 'Orders', value: stats?.totals.orders || 0, icon: ShoppingCart, color: 'bg-orange-500' },
    { title: 'Revenue', value: `$${stats?.totals.revenue || '0'}`, icon: DollarSign, color: 'bg-red-500' },
    { title: 'Period', value: stats?.period || 'All Time', icon: TrendingUp, color: 'bg-indigo-500' }
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

// Edit Organization Form Component
const EditOrganizationForm = ({ organization, onSuccess }: { organization: Organization; onSuccess: () => void }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // First fetch the full organization details
  const { data: fullOrganization, isLoading } = useQuery({
    queryKey: [`/api/management/organizations/${organization.id}`],
    enabled: !!organization.id,
    queryFn: () => managementApi(`/organizations/${organization.id}`)
  });

  console.log('Query state:', { isLoading, fullOrganization });

  const form = useForm({
    defaultValues: {
      name: organization.name,
      status: organization.status,
      maxUsers: organization.maxUsers || 50,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      superuserEmail: '',
      industry: '',
      activity: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      }
    }
  });

  // Update form when data loads
  useEffect(() => {
    if (fullOrganization) {
      console.log('Raw API response:', fullOrganization);
      console.log('Organization ID being fetched:', organization.id);

      const formData = {
        name: fullOrganization.name || '',
        status: fullOrganization.status || 'active',
        maxUsers: fullOrganization.maxUsers || 50,
        contactName: fullOrganization.contactName || '',
        contactEmail: fullOrganization.contactEmail || '',
        contactPhone: fullOrganization.contactPhone || '',
        superuserEmail: fullOrganization.adminEmail || fullOrganization.superuserEmail || '',
        industry: fullOrganization.industry || '',
        activity: fullOrganization.activity || '',
        address: {
          street: fullOrganization.streetAddress || fullOrganization.address?.street || '',
          city: fullOrganization.city || fullOrganization.address?.city || '',
          state: fullOrganization.state || fullOrganization.address?.state || '',
          zipCode: fullOrganization.zipCode || fullOrganization.address?.zipCode || '',
          country: fullOrganization.country || fullOrganization.address?.country || ''
        }
      };
      console.log('Processed form data:', formData);

      // Force form update with explicit field setting
      form.setValue('name', formData.name);
      form.setValue('status', formData.status);
      form.setValue('maxUsers', formData.maxUsers);
      form.setValue('contactName', formData.contactName);
      form.setValue('contactEmail', formData.contactEmail);
      form.setValue('contactPhone', formData.contactPhone);
      form.setValue('superuserEmail', formData.superuserEmail);
      form.setValue('industry', formData.industry);
      form.setValue('activity', formData.activity);
      form.setValue('address.street', formData.address.street);
      form.setValue('address.city', formData.address.city);
      form.setValue('address.state', formData.address.state);
      form.setValue('address.zipCode', formData.address.zipCode);
      form.setValue('address.country', formData.address.country);

      // Set selected country and update cities
      if (formData.address.country) {
        setSelectedCountry(formData.address.country);
        setAvailableCities(COUNTRY_CITIES[formData.address.country] || []);
      }

      console.log('Form values after setting:', form.getValues());
    }
  }, [fullOrganization, organization, form]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await managementApi(`/organizations/${organization.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      // managementApi returns the data directly, not a Response object
      if (response) {
        toast({ title: 'Organization updated successfully' });
        setIsOpen(false);
        onSuccess();
      } else {
        toast({ title: 'Failed to update organization', variant: 'destructive' });
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxUsers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Users</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                </FormControl>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Activity *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business activity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-60">
                    {ACTIVITIES.map((activity) => (
                      <SelectItem key={activity} value={activity}>
                        {activity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                    defaultValue={field.value}
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
                      defaultValue={field.value}
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

  const { data: organizations, isLoading, error } = useQuery<Organization[]>({
    queryKey: ['/api/management/organizations'],
    queryFn: () => managementApi('/organizations')
  });

  console.log('Organizations Query:', { isLoading, error, organizations });

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      status: 'active'
    }
  });

  const createOrganizationMutation = useMutation({
    mutationFn: (data: z.infer<typeof organizationSchema>) => 
      managementApi('/organizations', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/management/organizations'] });
      toast({ title: 'Organization created successfully' });
      form.reset();
    },
    onError: () => {
      toast({ title: 'Failed to create organization', variant: 'destructive' });
    }
  });

  const creditWalletMutation = useMutation({
    mutationFn: ({ organizationId, amount, description }: { organizationId: number; amount: number; description: string }) =>
      managementApi(`/organizations/${organizationId}/credit`, { 
        method: 'POST', 
        body: JSON.stringify({ amount, description }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/management/organizations'] });
      toast({ title: 'Wallet credited successfully' });
    }
  });

  const [, setLocation] = useLocation();

  const handleResetPassword = async (organizationId: number) => {
    try {
      const response = await managementApi(`/organizations/${organizationId}/reset-password`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        toast({ 
          title: 'Password Reset Successfully', 
          description: `New password: ${result.newPassword}`,
          duration: 10000
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
          <div className="text-center py-8 text-red-500">Error loading organizations: {error.message}</div>
        ) : !organizations || organizations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No organizations found</div>
        ) : (
          organizations.map((organization) => (
            <Card key={organization.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{organization.name}</CardTitle>
                  <CardDescription>Status: {organization.status}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={organization.status === 'active' ? 'default' : 'secondary'}>
                    {organization.status}
                  </Badge>
                  <div className="flex gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CreditCard className="h-4 w-4 mr-1" />
                          Credit Wallet
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Credit Organization Wallet</DialogTitle>
                          <DialogDescription>
                            Add funds to {organization.name}'s wallet
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          creditWalletMutation.mutate({
                            organizationId: organization.id,
                            amount: Number(formData.get('amount')),
                            description: formData.get('description') as string
                          });
                        }} className="space-y-4">
                          <div>
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input name="amount" type="number" step="0.01" required />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Input name="description" placeholder="e.g., Monthly credit" required />
                          </div>
                          <Button type="submit" className="w-full" disabled={creditWalletMutation.isPending}>
                            {creditWalletMutation.isPending ? 'Processing...' : 'Credit Wallet'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Edit Organization</DialogTitle>
                          <DialogDescription>
                            Update organization details for {organization.name}
                          </DialogDescription>
                        </DialogHeader>
                        <EditOrganizationForm organization={organization} onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/management/organizations'] });
                        }} />
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={() => handleResetPassword(organization.id)}>
                      Reset Admin Password
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">User Count</p>
                  <p className="text-lg font-semibold">{organization.userCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Employees</p>
                  <p className="text-lg font-semibold">{organization.maxUsers || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Features</p>
                  <p className="text-sm">N/A</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(organization.createdAt).toLocaleDateString()}</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Empulse Management</h1>
              <p className="text-sm text-gray-500">SaaS Platform Administration</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <Button variant="outline" onClick={logout}>Logout</Button>
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
              <p className="text-muted-foreground">Manage marketplace merchants and their products</p>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Products</h2>
              <p className="text-muted-foreground">Manage marketplace product catalog</p>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">Orders</h2>
              <p className="text-muted-foreground">Monitor and manage customer orders</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}