import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, AlertCircle } from 'lucide-react';
import { EmployeeFormData } from './types';

interface CreateEmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  departments: string[];
  locations: string[];
  isLoading: boolean;
}

const initialFormData: EmployeeFormData = {
  password: '',
  name: '',
  surname: '',
  email: '',
  phoneNumber: '',
  jobTitle: '',
  department: '',
  location: '',
  managerEmail: '',
  sex: '',
  nationality: '',
  birthDate: '',
  hireDate: '',
  isAdmin: false,
  status: 'active',
  avatarUrl: '',
  adminScope: '',
  allowedSites: [],
  allowedDepartments: [],
  responsibilities: '',
};

export function CreateEmployeeForm({
  isOpen,
  onClose,
  onSubmit,
  departments,
  locations,
  isLoading,
}: CreateEmployeeFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = t('employeeManagement.nameRequired');
    if (!formData.surname.trim()) newErrors.surname = t('employeeManagement.surnameRequired');
    if (!formData.email.trim()) newErrors.email = t('employeeManagement.emailRequired');
    if (!formData.password.trim()) newErrors.password = t('employeeManagement.passwordRequired');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = t('employeeManagement.validEmailRequired');
    }

    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = t('employeeManagement.passwordMinLength');
    }

    // Phone number validation (optional but format check if provided)
    if (formData.phoneNumber && !/^[\d\s\-\+\(\)]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = t('employeeManagement.validPhoneRequired');
    }

    // Date validation
    if (formData.birthDate && new Date(formData.birthDate) > new Date()) {
      newErrors.birthDate = t('employeeManagement.birthDateFutureError');
    }

    if (formData.hireDate && new Date(formData.hireDate) > new Date()) {
      newErrors.hireDate = t('employeeManagement.hireDateFutureError');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Failed to create employee:', error);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  const generateUsername = () => {
    if (formData.name && formData.surname) {
      const username = `${formData.name.toLowerCase()}${formData.surname.toLowerCase()}`.replace(/\s/g, '');
      return username;
    }
    return formData.email.split('@')[0] || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create New Employee
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">First Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('employeeManagement.enterFirstName')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="surname">Last Name *</Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => handleInputChange('surname', e.target.value)}
                  placeholder={t('employeeManagement.enterLastName')}
                  className={errors.surname ? 'border-red-500' : ''}
                />
                {errors.surname && (
                  <p className="text-xs text-red-600 mt-1">{errors.surname}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('employeeManagement.enterEmailAddress')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Temporary Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={t('employeeManagement.enterTempPassword')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Employee will be prompted to change password on first login
              </p>
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder={t('employeeManagement.enterPhoneNumber')}
                className={errors.phoneNumber ? 'border-red-500' : ''}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>
              )}
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Work Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  placeholder={t('employeeManagement.enterJobTitle')}
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => handleInputChange('department', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('employeeManagement.selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => handleInputChange('location', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('employeeManagement.selectLocation')} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="managerEmail">Manager Email</Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={formData.managerEmail}
                  onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                  placeholder={t('employeeManagement.enterManagerEmail')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={(e) => handleInputChange('hireDate', e.target.value)}
                className={errors.hireDate ? 'border-red-500' : ''}
              />
              {errors.hireDate && (
                <p className="text-xs text-red-600 mt-1">{errors.hireDate}</p>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Personal Information</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sex">Gender</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) => handleInputChange('sex', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('employeeManagement.selectGender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{t('employeeManagement.male')}</SelectItem>
                    <SelectItem value="Female">{t('employeeManagement.female')}</SelectItem>
                    <SelectItem value="Other">{t('employeeManagement.other')}</SelectItem>
                    <SelectItem value="Prefer not to say">{t('employeeManagement.preferNotToSay')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  placeholder={t('employeeManagement.enterNationality')}
                />
              </div>

              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className={errors.birthDate ? 'border-red-500' : ''}
                />
                {errors.birthDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.birthDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Access & Permissions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Access & Permissions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('employeeManagement.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) => handleInputChange('isAdmin', checked)}
                />
                <Label htmlFor="isAdmin">Grant administrator privileges</Label>
              </div>
            </div>

            {formData.isAdmin && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This user will have administrative access to the system. Please ensure this is intended.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Generated Username Preview */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <Label className="text-sm font-medium">Generated Username</Label>
            <p className="text-sm text-gray-600 mt-1">
              {generateUsername() || 'Username will be generated based on name and email'}
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}