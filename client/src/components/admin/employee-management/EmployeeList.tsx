import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, MoreHorizontal, Edit, Trash, UserCheck, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { Employee } from './types';

interface EmployeeListProps {
  employees: Employee[];
  selectedEmployees: Employee[];
  onEmployeeSelect: (employee: Employee, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onViewProfile: (employee: Employee) => void;
  isLoading: boolean;
}

export function EmployeeList({
  employees,
  selectedEmployees,
  onEmployeeSelect,
  onSelectAll,
  onEditEmployee,
  onDeleteEmployee,
  onViewProfile,
  isLoading,
}: EmployeeListProps) {
  const { t } = useTranslation();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Employee | null>(null);
  const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

  const isAllSelected = employees.length > 0 && selectedEmployees.length === employees.length;
  const isPartiallySelected = selectedEmployees.length > 0 && selectedEmployees.length < employees.length;
  
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const input = selectAllCheckboxRef.current.querySelector('input');
      if (input) {
        input.indeterminate = isPartiallySelected;
      }
    }
  }, [isPartiallySelected]);

  const handleSelectAll = () => {
    onSelectAll(!isAllSelected);
  };

  const handleEmployeeSelect = (employee: Employee) => {
    const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
    onEmployeeSelect(employee, !isSelected);
  };

  const handleViewProfile = (employee: Employee) => {
    setSelectedProfile(employee);
    setShowProfileDialog(true);
    onViewProfile(employee);
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'terminated':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return t('employeeManagement.invalidDate');
    }
  };

  const getInitials = (name: string, surname: string | null) => {
    const first = name?.charAt(0) || '';
    const last = surname?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('employeeManagement.noEmployeesFound')}</h3>
        <p className="text-gray-600">{t('employeeManagement.noEmployeesMessage')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  ref={selectAllCheckboxRef}
                  onCheckedChange={handleSelectAll}
                  aria-label={t('employeeManagement.selectAll')}
                />
              </TableHead>
              <TableHead>{t('employeeManagement.employee')}</TableHead>
              <TableHead>{t('employeeManagement.contact')}</TableHead>
              <TableHead>{t('employeeManagement.department')}</TableHead>
              <TableHead>{t('employeeManagement.location')}</TableHead>
              <TableHead>{t('employeeManagement.status')}</TableHead>
              <TableHead>{t('employeeManagement.hireDate')}</TableHead>
              <TableHead>{t('employeeManagement.role')}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
              
              return (
                <TableRow 
                  key={employee.id}
                  className={isSelected ? 'bg-blue-50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleEmployeeSelect(employee)}
                      aria-label={`Select ${employee.name} ${employee.surname}`}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(employee.name, employee.surname)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {employee.name} {employee.surname}
                        </p>
                        <p className="text-sm text-gray-500">@{employee.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </div>
                      {employee.phoneNumber && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Phone className="h-3 w-3" />
                          {employee.phoneNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{employee.department || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{employee.jobTitle || 'N/A'}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm">{employee.location || 'N/A'}</span>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(employee.status)}>
                      {employee.status || t('employeeManagement.unknown')}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm">{formatDate(employee.hireDate)}</span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {employee.isAdmin && (
                        <Badge variant="outline" className="text-xs">
                          Admin
                        </Badge>
                      )}
                      <span className="text-sm text-gray-500">
                        {employee.isAdmin ? employee.adminScope || t('employeeManagement.admin') : t('employeeManagement.user')}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProfile(employee)}>
                          <User className="h-4 w-4 mr-2" />
                          {t('employeeManagement.viewProfile')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('employeeManagement.editEmployee')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteEmployee(employee)}
                          className="text-red-600"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          {t('employeeManagement.deleteEmployee')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Profile Quick View Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('employeeManagement.employeeProfile')}</DialogTitle>
          </DialogHeader>
          
          {selectedProfile && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedProfile.avatarUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(selectedProfile.name, selectedProfile.surname)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">
                    {selectedProfile.name} {selectedProfile.surname}
                  </h3>
                  <p className="text-gray-600">{selectedProfile.jobTitle}</p>
                  <Badge variant={getStatusBadgeVariant(selectedProfile.status)}>
                    {selectedProfile.status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">{t('employeeManagement.email')}</p>
                  <p>{selectedProfile.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('employeeManagement.phoneNumber')}</p>
                  <p>{selectedProfile.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('employeeManagement.department')}</p>
                  <p>{selectedProfile.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('employeeManagement.location')}</p>
                  <p>{selectedProfile.location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('employeeManagement.hireDate')}</p>
                  <p>{formatDate(selectedProfile.hireDate)}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('employeeManagement.role')}</p>
                  <p>{selectedProfile.isAdmin ? t('employeeManagement.admin') : t('employeeManagement.employee')}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => onEditEmployee(selectedProfile)} className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('employeeManagement.edit')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowProfileDialog(false)}
                  className="flex-1"
                >
                  {t('employeeManagement.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}