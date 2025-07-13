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

// Types for the management system
interface Company {
  id: number;
  name: string;
  email: string;
  domain?: string;
  subscriptionTier: string;
  maxEmployees: number;
  walletBalance: string;
  isActive: boolean;
  features: {
    leaveManagement: boolean;
    recognitionModule: boolean;
    socialFeed: boolean;
    celebrations: boolean;
    marketplace: boolean;
  };
  createdAt: string;
}

interface Merchant {
  id: number;
  name: string;
  email: string;
  phone?: string;
  commissionRate: string;
  isActive: boolean;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  category: string;
  price: string;
  pointsPrice: number;
  stock?: number;
  isActive: boolean;
  merchantName?: string;
}

interface Order {
  id: string;
  employeeName: string;
  employeeEmail: string;
  quantity: number;
  pointsUsed: number;
  totalAmount: string;
  status: string;
  productName?: string;
  companyName?: string;
  merchantName?: string;
  createdAt: string;
}

interface PlatformStats {
  companies: number;
  merchants: number;
  products: number;
  orders: number;
  totalRevenue: string;
  totalPointsUsed: number;
}

// Form schemas
const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Valid email is required'),
  domain: z.string().optional(),
  subscriptionTier: z.enum(['basic', 'premium', 'enterprise']),
  maxEmployees: z.number().min(1).max(10000)
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

// Management Authentication Hook - Modified to use main auth system
const useManagementAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('token')); // Use main token
  const [user, setUser] = useState(null);

  // Check if user is corporate admin on load
  useEffect(() => {
    const checkCorporateAdmin = async () => {
      const mainToken = localStorage.getItem('token');
      if (mainToken) {
        try {
          const response = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${mainToken}` }
          });
          if (response.ok) {
            const userData = await response.json();
            if (userData.roleType === 'corporate_admin') {
              setToken(mainToken);
              setUser(userData);
            }
          }
        } catch (error) {
          console.error('Failed to check corporate admin status:', error);
        }
      }
    };
    
    checkCorporateAdmin();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch('/management/auth/login', {
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
    localStorage.removeItem('token');
    localStorage.removeItem('managementToken');
    setToken(null);
    setUser(null);
    window.location.href = '/auth';
  };

  return { token, user, login, logout, isAuthenticated: !!token && !!user };
};

// API Helper - Modified to use main auth system
const managementApi = (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token'); // Use main token
  return fetch(`/management${endpoint}`, {
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
  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ['/management/analytics/platform'],
    queryFn: () => managementApi('/analytics/platform')
  });

  const statCards = [
    { title: 'Companies', value: stats?.companies || 0, icon: Building2, color: 'bg-blue-500' },
    { title: 'Merchants', value: stats?.merchants || 0, icon: Store, color: 'bg-green-500' },
    { title: 'Products', value: stats?.products || 0, icon: Package, color: 'bg-purple-500' },
    { title: 'Orders', value: stats?.orders || 0, icon: ShoppingCart, color: 'bg-orange-500' },
    { title: 'Revenue', value: `$${stats?.totalRevenue || '0'}`, icon: DollarSign, color: 'bg-red-500' },
    { title: 'Points Used', value: stats?.totalPointsUsed || 0, icon: TrendingUp, color: 'bg-indigo-500' }
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

// Companies Management
const CompaniesManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: companies } = useQuery<{ companies: Company[] }>({
    queryKey: ['/management/companies'],
    queryFn: () => managementApi('/companies')
  });

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      subscriptionTier: 'basic',
      maxEmployees: 50
    }
  });

  const createCompanyMutation = useMutation({
    mutationFn: (data: z.infer<typeof companySchema>) => 
      managementApi('/companies', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/management/companies'] });
      toast({ title: 'Company created successfully' });
      form.reset();
    },
    onError: () => {
      toast({ title: 'Failed to create company', variant: 'destructive' });
    }
  });

  const creditWalletMutation = useMutation({
    mutationFn: ({ companyId, amount, description }: { companyId: number; amount: number; description: string }) =>
      managementApi(`/companies/${companyId}/credit`, { 
        method: 'POST', 
        body: JSON.stringify({ amount, description }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/management/companies'] });
      toast({ title: 'Wallet credited successfully' });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Companies</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>
                Add a new company to your SaaS platform
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createCompanyMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subscriptionTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxEmployees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Employees</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createCompanyMutation.isPending}>
                  {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {companies?.companies?.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{company.name}</CardTitle>
                  <CardDescription>{company.email}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={company.isActive ? 'default' : 'secondary'}>
                    {company.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">{company.subscriptionTier}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                  <p className="text-lg font-semibold">${company.walletBalance}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Employees</p>
                  <p className="text-lg font-semibold">{company.maxEmployees}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Features</p>
                  <p className="text-sm">
                    {Object.values(company.features).filter(Boolean).length} / {Object.keys(company.features).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(company.createdAt).toLocaleDateString()}</p>
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
                      <DialogTitle>Credit Company Wallet</DialogTitle>
                      <DialogDescription>
                        Add funds to {company.name}'s wallet
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      creditWalletMutation.mutate({
                        companyId: company.id,
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
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="merchants">Merchants</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <DashboardStats />
          </TabsContent>
          
          <TabsContent value="companies">
            <CompaniesManagement />
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