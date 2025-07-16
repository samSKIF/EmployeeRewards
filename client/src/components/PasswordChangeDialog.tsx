import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PasswordChangeDialogProps {
  isOpen: boolean;
  onPasswordChanged: () => void;
  expiresAt?: string;
  token?: string;
}

export function PasswordChangeDialog({ isOpen, onPasswordChanged, expiresAt, token }: PasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validatePassword(newPassword);
    
    if (newPassword !== confirmPassword) {
      validationErrors.push('Passwords do not match');
    }
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors([]);
    
    try {
      // Use the provided token for authentication
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
      
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ newPassword }),
      });
      
      toast({
        title: 'Password Changed Successfully',
        description: 'Your password has been updated. You can now continue using the system.',
      });
      
      onPasswordChanged();
    } catch (error) {
      console.error('Password change failed:', error);
      toast({
        title: 'Password Change Failed',
        description: 'Unable to change password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const timeRemaining = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle>Password Reset Required</CardTitle>
          <CardDescription>
            Your password has been reset by an administrator. You must create a new password to continue.
            {hoursRemaining > 0 && (
              <div className="mt-2 text-sm text-orange-600">
                This temporary access expires in {hoursRemaining} hours.
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
              />
            </div>
            
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-2">Please fix the following issues:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Password Requirements:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character (!@#$%^&*)</li>
                </ul>
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}