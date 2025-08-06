import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { EmployeeFormData } from '../types';

export function useCreateEmployeeForm(onClose: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    phoneNumber: '',
    jobTitle: '',
    department: '',
    location: '',
    birthDate: '',
    responsibilities: '',
    status: 'active',
    isAdmin: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
    }

    if (formData.phoneNumber && !/^[\d\s\-\+\(\)]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateUsername = (): string => {
    if (!formData.name || !formData.email) return '';
    
    const namePart = formData.name.toLowerCase().replace(/\s+/g, '.');
    const emailPart = formData.email.split('@')[0];
    return `${namePart.substring(0, 20)}.${emailPart.substring(0, 10)}`.toLowerCase();
  };

  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: EmployeeFormData) => {
      const dataToSubmit = {
        ...employeeData,
        username: generateUsername(),
        // Generate a temporary password
        password: Math.random().toString(36).slice(-8),
      };
      
      return apiRequest('POST', '/api/users', dataToSubmit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'Employee created successfully',
      });
      onClose();
      // Reset form
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        jobTitle: '',
        department: '',
        location: '',
        birthDate: '',
        responsibilities: '',
        status: 'active',
        isAdmin: false,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create employee',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!validateForm()) return;
    createEmployeeMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      jobTitle: '',
      department: '',
      location: '',
      birthDate: '',
      responsibilities: '',
      status: 'active',
      isAdmin: false,
    });
    setErrors({});
    onClose();
  };

  return {
    formData,
    setFormData,
    errors,
    isLoading: createEmployeeMutation.isPending,
    generateUsername,
    handleSubmit,
    handleClose,
  };
}