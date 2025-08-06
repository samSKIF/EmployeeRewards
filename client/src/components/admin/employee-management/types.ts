// Shared types for employee management components

export interface EmployeeFormData {
  password: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  jobTitle: string;
  department: string;
  location: string;
  managerEmail: string;
  sex: string;
  nationality: string;
  birthDate: string;
  hireDate: string;
  responsibilities: string;
  isAdmin: boolean;
  status: string;
  avatarUrl: string;
  adminScope: string;
  allowedSites: string[];
  allowedDepartments: string[];
}

export interface Employee {
  id: number;
  name: string;
  surname: string | null;
  email: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  managerEmail: string | null;
  sex: string | null;
  nationality: string | null;
  birthDate: string | null;
  hireDate: string | null;
  isAdmin: boolean;
  status: string | null;
  avatarUrl: string | null;
  adminScope: string | null;
  allowedSites: string[] | null;
  allowedDepartments: string[] | null;
  username: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  memberCount: number;
  createdAt: string;
  department?: string;
  location?: string;
}

export interface BulkAction {
  type: 'delete' | 'updateStatus' | 'updateDepartment' | 'export';
  value?: string;
  employeeIds: number[];
}

export interface EmployeeFilters {
  search: string;
  department: string;
  location: string;
  status: string;
  isAdmin: boolean | null;
}