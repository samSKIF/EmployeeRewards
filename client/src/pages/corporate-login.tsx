import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function CorporateLoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin@thriviohr.com');
  const [loginPassword, setLoginPassword] = useState('admin123');

  const createCorporateAdmin = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/admin/corporate-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to create corporate admin');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: 'Corporate admin account created successfully',
      });

      console.log('Corporate admin created:', data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Login failed');
      }

      const data = await response.json();

      // Store the authentication token
      localStorage.setItem('token', data.token);

      toast({
        title: 'Success',
        description: 'Login successful',
      });

      // Check if user is corporate admin and redirect accordingly
      if (data.user.role_type === 'corporate_admin') {
        // Store management token and redirect to management dashboard
        const managementToken = data.managementToken || data.token;
        localStorage.setItem('managementToken', managementToken);
        window.location.href = '/management';
      } else {
        window.location.href = '/social';
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 flex flex-col items-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 mb-2">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            ThrivioHR Corporate
          </CardTitle>
          <p className="text-center text-gray-600">Corporate Admin Access</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">
              Step 1: Create Corporate Admin
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              First, create the corporate admin account
            </p>
            <Button
              onClick={createCorporateAdmin}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Creating...' : 'Create Corporate Admin Account'}
            </Button>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">Step 2: Login</h3>
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label htmlFor="email" className="text-sm text-green-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="focus:border-green-500"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm text-green-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="focus:border-green-500"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Logging in...' : 'Login as Corporate Admin'}
              </Button>
            </form>
          </div>
        </CardContent>

        <CardFooter className="text-center">
          <div className="text-sm text-gray-500">
            <p>
              <strong>Default Credentials:</strong>
            </p>
            <p>Email: admin@thriviohr.com</p>
            <p>Password: admin123</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
