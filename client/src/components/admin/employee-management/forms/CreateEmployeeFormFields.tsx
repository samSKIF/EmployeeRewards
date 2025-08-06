import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { EmployeeFormData } from '../types';

interface CreateEmployeeFormFieldsProps {
  formData: EmployeeFormData;
  setFormData: React.Dispatch<React.SetStateAction<EmployeeFormData>>;
  departments: string[];
  locations: string[];
  generateUsername: () => string;
}

export function CreateEmployeeFormFields({
  formData,
  setFormData,
  departments,
  locations,
  generateUsername
}: CreateEmployeeFormFieldsProps) {
  const { t } = useTranslation();
  
  const handleInputChange = (field: keyof EmployeeFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">{t('employeeManagement.fullName')} *</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={t('employeeManagement.enterFullName')}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">{t('employeeManagement.emailAddress')} *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder={t('employeeManagement.enterEmailAddress')}
            required
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">{t('employeeManagement.phoneNumber')}</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder={t('employeeManagement.enterPhoneNumber')}
          />
        </div>

        <div>
          <Label htmlFor="birthDate">{t('employeeManagement.birthDate')}</Label>
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleInputChange('birthDate', e.target.value)}
          />
        </div>
      </div>

      {/* Job Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="jobTitle">{t('employeeManagement.jobTitle')} *</Label>
          <Input
            id="jobTitle"
            type="text"
            value={formData.jobTitle}
            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
            placeholder={t('employeeManagement.enterJobTitle')}
            required
          />
        </div>

        <div>
          <Label htmlFor="department">{t('employeeManagement.department')}</Label>
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

      {/* Location and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="location">{t('employeeManagement.location')}</Label>
          <Select
            value={formData.location}
            onValueChange={(value) => handleInputChange('location', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('employeeManagement.selectLocation')} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">{t('employeeManagement.status')}</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleInputChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('employeeManagement.selectStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t('employeeManagement.active')}</SelectItem>
              <SelectItem value="inactive">{t('employeeManagement.inactive')}</SelectItem>
              <SelectItem value="pending">{t('employeeManagement.pending')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Additional Information */}
      <div>
        <Label htmlFor="responsibilities">{t('employeeManagement.responsibilities')}</Label>
        <Input
          id="responsibilities"
          type="text"
          value={formData.responsibilities}
          onChange={(e) => handleInputChange('responsibilities', e.target.value)}
          placeholder={t('employeeManagement.enterKeyResponsibilities')}
        />
      </div>

      {/* Admin Privileges */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isAdmin"
            checked={formData.isAdmin}
            onCheckedChange={(checked) => handleInputChange('isAdmin', checked as boolean)}
          />
          <Label htmlFor="isAdmin">{t('employeeManagement.grantAdministratorPrivileges')}</Label>
        </div>

        {formData.isAdmin && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('employeeManagement.administratorAccessWarning')}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Generated Username Preview */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <Label className="text-sm font-medium">{t('employeeManagement.generatedUsername')}</Label>
        <p className="text-sm text-gray-600 mt-1">
          {generateUsername() || t('employeeManagement.usernameGenerationHint')}
        </p>
      </div>
    </div>
  );
}