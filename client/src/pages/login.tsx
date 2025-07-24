import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Award } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    console.log('Login form submitted with:', { email, password });

    try {
      console.log('Calling login function...');
      const success = await login(email, password);
      console.log('Login result:', success);
      if (success) {
        console.log('Login successful, redirecting to dashboard');
        setLocation('/dashboard');
      } else {
        console.log("Login failed but didn't throw an error");
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
    }
  };

  const handleDirectLogin = async () => {
    setError('');

    try {
      // First, clear any existing tokens
      localStorage.removeItem('token');

      console.log('Using direct API login (hardcoded admin credentials)');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123',
        }),
        credentials: 'include',
      });

      console.log('Direct login response:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Direct login failed:', errorText);
        setError('Direct login failed');
        return;
      }

      const data = await response.json();
      console.log('Login success:', data);

      // Manually store token
      localStorage.setItem('token', data.token);

      // Create a temporary loading state
      document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
          <div style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <div style="margin-top: 20px; font-size: 24px;">Login successful! Redirecting to dashboard...</div>
          <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </div>
      `;

      // Give a short delay to ensure token is stored
      setTimeout(() => {
        // Then do a full page reload to the dashboard
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      console.error('Direct login error:', error);
      setError('Failed to login directly');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 flex flex-col items-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary mb-2">
            <Award className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            RewardHub
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access your employee rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleDirectLogin}
            >
              Quick Login (Admin Demo)
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-gray-500">
            <p>Demo Credentials:</p>
            <p>Email: admin@demo.io</p>
            <p>Password: admin123</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
