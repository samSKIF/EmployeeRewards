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
  CreditCard
} from 'lucide-react';
import { useLocation } from 'wouter';

// Types for the unified management system
interface Organization {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
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

// Form schemas
const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  type: z.enum(['client', 'enterprise', 'startup']).default('client'),
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
      ...options.headers
    }
  }).then(res => {
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
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

// Organizations Management
const OrganizationsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ['/api/management/organizations'],
    queryFn: () => managementApi('/organizations')
  });

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      type: 'client',
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
        {organizations?.map((organization) => (
          <Card key={organization.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{organization.name}</CardTitle>
                  <CardDescription>Type: {organization.type}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={organization.status === 'active' ? 'default' : 'secondary'}>
                    {organization.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">User Count</p>
                  <p className="text-lg font-semibold">{organization.userCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Employees</p>
                  <p className="text-lg font-semibold">N/A</p>
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
              
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CreditCard className="h-4 w-4 mr-2" />
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
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Features
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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