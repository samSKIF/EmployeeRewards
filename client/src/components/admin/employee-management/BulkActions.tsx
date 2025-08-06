import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash, Download, UserCheck, AlertTriangle, Users } from 'lucide-react';
import { BulkAction, Employee } from './types';

interface BulkActionsProps {
  selectedEmployees: Employee[];
  onBulkAction: (action: BulkAction) => Promise<void>;
  onClearSelection: () => void;
  departments: string[];
  isLoading: boolean;
}

export function BulkActions({
  selectedEmployees,
  onBulkAction,
  onClearSelection,
  departments,
  isLoading,
}: BulkActionsProps) {
  const { t } = useTranslation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const selectedCount = selectedEmployees.length;

  const handleBulkAction = async (actionType: BulkAction['type'], value?: string) => {
    const action: BulkAction = {
      type: actionType,
      value,
      employeeIds: selectedEmployees.map(emp => emp.id),
    };

    // Actions that need confirmation
    if (actionType === 'delete' || actionType === 'updateStatus') {
      setPendingAction(action);
      setShowConfirmDialog(true);
      return;
    }

    // Direct actions (export, etc.)
    await onBulkAction(action);
  };

  const confirmBulkAction = async () => {
    if (pendingAction) {
      await onBulkAction(pendingAction);
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  const cancelBulkAction = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
    setSelectedStatus('');
    setSelectedDepartment('');
  };

  const getActionDescription = () => {
    if (!pendingAction) return '';

    const plural = selectedCount !== 1 ? 's' : '';
    
    switch (pendingAction.type) {
      case 'delete':
        return t('employeeManagement.bulkDeleteWarning', { count: selectedCount, plural });
      case 'updateStatus':
        return t('employeeManagement.bulkStatusUpdateWarning', { count: selectedCount, plural, status: pendingAction.value });
      case 'updateDepartment':
        return t('employeeManagement.bulkDepartmentUpdateWarning', { count: selectedCount, plural, department: pendingAction.value });
      default:
        return '';
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">
                {t('employeeManagement.employeesSelected', { count: selectedCount, plural: selectedCount !== 1 ? 's' : '' })}
              </p>
              <p className="text-sm text-blue-700">
                {t('employeeManagement.chooseActionPrompt')}
              </p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection}
            className="text-blue-700 hover:text-blue-900"
          >
            {t('employeeManagement.clearSelection')}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {/* Export Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('export')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('employeeManagement.exportSelected')}
          </Button>

          {/* Status Update */}
          <div className="flex items-center gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('employeeManagement.updateStatusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('employeeManagement.setActive')}</SelectItem>
                <SelectItem value="inactive">{t('employeeManagement.setInactive')}</SelectItem>
                <SelectItem value="pending">{t('employeeManagement.setPending')}</SelectItem>
                <SelectItem value="terminated">{t('employeeManagement.setTerminated')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('updateStatus', selectedStatus)}
              disabled={!selectedStatus || isLoading}
              className="flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              {t('employeeManagement.apply')}
            </Button>
          </div>

          {/* Department Update */}
          <div className="flex items-center gap-2">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('employeeManagement.moveToDeptPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('updateDepartment', selectedDepartment)}
              disabled={!selectedDepartment || isLoading}
              className="flex items-center gap-2"
            >
              {t('employeeManagement.apply')}
            </Button>
          </div>

          {/* Delete Action */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleBulkAction('delete')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Trash className="h-4 w-4" />
            {t('employeeManagement.deleteSelected')}
          </Button>
        </div>

        {/* Selected employees preview */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {selectedEmployees.slice(0, 5).map((employee) => (
              <Badge key={employee.id} variant="secondary" className="text-xs">
                {employee.name} {employee.surname}
              </Badge>
            ))}
            {selectedCount > 5 && (
              <Badge variant="secondary" className="text-xs">
                {t('employeeManagement.morePeopleSelected', { count: selectedCount - 5 })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('employeeManagement.confirmBulkAction')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <DialogDescription>
              {getActionDescription()}
            </DialogDescription>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {pendingAction?.type === 'delete' 
                  ? t('employeeManagement.actionPermanentWarning')
                  : t('employeeManagement.actionMultipleEmployeesWarning')
                }
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">{t('employeeManagement.affectedEmployees')}</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedEmployees.map((employee) => (
                  <div key={employee.id} className="text-sm text-gray-600">
                    {employee.name} {employee.surname} ({employee.email})
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelBulkAction}>
              {t('employeeManagement.cancel')}
            </Button>
            <Button 
              variant={pendingAction?.type === 'delete' ? 'destructive' : 'default'}
              onClick={confirmBulkAction}
              disabled={isLoading}
            >
              {isLoading ? t('employeeManagement.processing') : t('employeeManagement.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}