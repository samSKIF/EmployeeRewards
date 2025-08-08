import { Router } from 'express';
import { verifyToken } from '../../middleware/auth';
import { verifyAdmin } from '../../middleware/auth';
import { storage } from '../../storage';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import * as fuzz from 'fuzzball';

// Helper function to convert DD/MM/YYYY to YYYY-MM-DD
function convertDateFormat(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  
  // Trim whitespace
  dateStr = dateStr.trim();
  
  // Check if already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Handle DD/MM/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle other common formats like DD-MM-YYYY
  const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return undefined;
}

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'server/uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.originalname.endsWith('.csv') ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

interface EmployeeRow {
  name: string;
  surname: string;
  email: string;
  department: string;
  location?: string;
  jobTitle?: string;
  phoneNumber?: string;
  birthDate?: string;
  hireDate?: string;
  rowIndex?: number; // Track row number for error reporting
}

interface ExistingEmployeeMatch {
  id: number;
  email: string;
  currentData: any;
  newData: EmployeeRow;
  changes: string[]; // List of fields that will be updated
  hasChanges: boolean;
}

interface DepartmentAnalysis {
  name: string;
  action: 'existing' | 'new' | 'typo';
  suggestion?: string;
  confidence?: number;
  rows: number[]; // Which rows contain this department
}

// Preview endpoint - analyzes CSV file without creating records
router.post('/api/admin/employees/preview', verifyToken, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    const organizationId = (req as any).user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const employees: EmployeeRow[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse CSV file
    let rowIndex = 0;
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on('data', (row) => {
          rowIndex++;
          // Validate required fields
          if (!row.name || !row.surname || !row.email || !row.department) {
            errors.push(`Row ${rowIndex} missing required fields: ${JSON.stringify(row)}`);
            return;
          }

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(row.email)) {
            errors.push(`Row ${rowIndex} - Invalid email format: ${row.email}`);
            return;
          }

          employees.push({
            name: row.name.trim(),
            surname: row.surname?.trim() || '',
            email: row.email.trim().toLowerCase(),
            department: row.department.trim(),
            location: row.location?.trim() || undefined,
            jobTitle: row.job_title?.trim() || row.jobTitle?.trim() || undefined,
            phoneNumber: row.phone_number?.trim() || row.phoneNumber?.trim() || undefined,
            birthDate: convertDateFormat(row.birth_date?.trim() || row.birthDate?.trim()),
            hireDate: convertDateFormat(row.hire_date?.trim() || row.hireDate?.trim()),
            rowIndex,
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (employees.length === 0) {
      return res.status(400).json({ 
        message: 'No valid employee records found in the CSV file',
        errors 
      });
    }

    // Check for duplicate emails within the file
    const emailSet = new Set();
    const duplicateEmails: string[] = [];
    employees.forEach(emp => {
      if (emailSet.has(emp.email)) {
        duplicateEmails.push(emp.email);
      } else {
        emailSet.add(emp.email);
      }
    });

    if (duplicateEmails.length > 0) {
      errors.push(`Duplicate emails found in file: ${duplicateEmails.join(', ')}`);
    }

    // Enhanced existing employee detection with change analysis
    const emailArray = Array.from(emailSet) as string[];
    const existingUsers = await storage.getUsersByEmails(emailArray);
    const existingEmployeeMatches: ExistingEmployeeMatch[] = [];
    const newEmployees: EmployeeRow[] = [];
    
    // Analyze each employee for add vs update
    employees.forEach(employee => {
      const existingUser = existingUsers.find((user: any) => 
        user.email.toLowerCase() === employee.email.toLowerCase()
      );
      
      if (existingUser) {
        // Compare current data with new data to identify changes
        const changes: string[] = [];
        
        if (existingUser.name !== employee.name) changes.push('name');
        if (existingUser.surname !== employee.surname) changes.push('surname');
        if (existingUser.department !== employee.department) changes.push('department');
        if (existingUser.location !== employee.location) changes.push('location');
        if (existingUser.job_title !== employee.jobTitle) changes.push('job title');
        if (existingUser.phone_number !== employee.phoneNumber) changes.push('phone number');
        if (existingUser.birth_date !== employee.birthDate) changes.push('birth date');
        if (existingUser.hire_date !== employee.hireDate) changes.push('hire date');
        
        existingEmployeeMatches.push({
          id: existingUser.id,
          email: employee.email,
          currentData: existingUser,
          newData: employee,
          changes,
          hasChanges: changes.length > 0
        });
      } else {
        newEmployees.push(employee);
      }
    });
    
    const employeesWithChanges = existingEmployeeMatches.filter(match => match.hasChanges);
    
    if (existingEmployeeMatches.length > 0) {
      warnings.push(`${existingEmployeeMatches.length} employees already exist in system`);
      if (employeesWithChanges.length > 0) {
        warnings.push(`${employeesWithChanges.length} existing employees will be updated with new data`);
      }
    }

    // Smart department analysis with typo detection
    const existingDepartments = await storage.getDepartmentsByOrganization(organizationId);
    const existingDeptNames = existingDepartments.map(dept => dept.name);
    
    const fileDepartments = Array.from(new Set(employees.map(emp => emp.department)));
    const departmentAnalysis: DepartmentAnalysis[] = [];
    
    fileDepartments.forEach(deptName => {
      const rows = employees
        .filter(emp => emp.department === deptName)
        .map(emp => emp.rowIndex!)
        .filter(Boolean);
      
      // Check exact match (case insensitive)
      const exactMatch = existingDeptNames.find(existing => 
        existing.toLowerCase() === deptName.toLowerCase()
      );
      
      if (exactMatch) {
        departmentAnalysis.push({
          name: deptName,
          action: 'existing',
          rows
        });
      } else {
        // Check for potential typos using fuzzy matching
        const matches = existingDeptNames.map(existing => ({
          name: existing,
          ratio: fuzz.ratio(deptName.toLowerCase(), existing.toLowerCase())
        })).sort((a, b) => b.ratio - a.ratio);
        
        const bestMatch = matches[0];
        
        // If similarity > 70%, it's likely a typo
        if (bestMatch && bestMatch.ratio > 70) {
          departmentAnalysis.push({
            name: deptName,
            action: 'typo',
            suggestion: bestMatch.name,
            confidence: bestMatch.ratio,
            rows
          });
        } else {
          departmentAnalysis.push({
            name: deptName,
            action: 'new',
            rows
          });
        }
      }
    });

    // Additional validations
    if (employees.length > 1000) {
      warnings.push('Large upload detected. Consider splitting into smaller batches for better performance.');
    }

    // Separate departments by type for better UX
    const newDepartments = departmentAnalysis.filter(d => d.action === 'new');
    const typoSuggestions = departmentAnalysis.filter(d => d.action === 'typo');
    const existingDepartmentsList = departmentAnalysis.filter(d => d.action === 'existing');
    
    // Add department warnings
    if (typoSuggestions.length > 0) {
      warnings.push(`Potential typos detected in department names. Please review suggestions below.`);
    }
    
    if (newDepartments.length > 0) {
      warnings.push(`${newDepartments.length} new departments will be created. Please confirm or correct any typos.`);
    }

    const previewData = {
      employees: employees,
      newEmployees,
      existingEmployees: existingEmployeeMatches,
      employeesWithChanges,
      departmentAnalysis: {
        new: newDepartments,
        typos: typoSuggestions,
        existing: existingDepartmentsList,
        total: departmentAnalysis.length
      },
      employeeCount: employees.length,
      newEmployeeCount: newEmployees.length,
      updateEmployeeCount: employeesWithChanges.length,
      validation: {
        hasErrors: errors.length > 0,
        errors,
        warnings,
        needsReview: typoSuggestions.length > 0 || newDepartments.length > 0, // Enhanced review conditions
      },
    };

    res.json(previewData);
  } catch (error) {
    console.error('Error previewing bulk upload:', error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({ message: 'Failed to preview bulk upload' });
  }
});

// Execute bulk upload - creates departments and employees
router.post('/api/admin/employees/bulk-upload', verifyToken, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    const organizationId = (req as any).user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse file to get employees data
    const employees: EmployeeRow[] = [];
    const errors: string[] = [];

    // Parse file (CSV or Excel)
    if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
      // Parse Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      jsonData.forEach((row: any) => {
        // Validate required fields
        if (!row.name || !row.surname || !row.email || !row.department) {
          errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
          return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          errors.push(`Invalid email format: ${row.email}`);
          return;
        }

        employees.push({
          name: row.name.toString().trim(),
          surname: row.surname?.toString().trim() || '',
          email: row.email.toString().trim().toLowerCase(),
          department: row.department.toString().trim(),
          location: row.location?.toString().trim() || undefined,
          jobTitle: row.job_title?.toString().trim() || row.jobTitle?.toString().trim() || undefined,
          phoneNumber: row.phone_number?.toString().trim() || row.phoneNumber?.toString().trim() || undefined,
          birthDate: convertDateFormat(row.birth_date?.toString().trim() || row.birthDate?.toString().trim()),
          hireDate: convertDateFormat(row.hire_date?.toString().trim() || row.hireDate?.toString().trim()),
        });
      });
    } else {
      // Parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file!.path)
          .pipe(csv())
          .on('data', (row) => {
            // Validate required fields
            if (!row.name || !row.surname || !row.email || !row.department) {
              errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
              return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row.email)) {
              errors.push(`Invalid email format: ${row.email}`);
              return;
            }

            employees.push({
              name: row.name.trim(),
              surname: row.surname?.trim() || '',
              email: row.email.trim().toLowerCase(),
              department: row.department.trim(),
              location: row.location?.trim() || undefined,
              jobTitle: row.job_title?.trim() || row.jobTitle?.trim() || undefined,
              phoneNumber: row.phone_number?.trim() || row.phoneNumber?.trim() || undefined,
              birthDate: convertDateFormat(row.birth_date?.trim() || row.birthDate?.trim()),
              hireDate: convertDateFormat(row.hire_date?.trim() || row.hireDate?.trim()),
            });
          })
          .on('end', resolve)
          .on('error', reject);
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (employees.length === 0) {
      return res.status(400).json({ 
        message: 'No valid employee records found in the CSV file',
        errors 
      });
    }

    let departmentsCreated = 0;
    let employeesCreated = 0;
    let employeesUpdated = 0;
    const detailedErrors: Array<{
      row: number;
      email: string;
      name: string;
      error: string;
      suggestion: string;
    }> = [];
    
    // Enhanced existing employee detection for bulk upload
    const emailArray = employees.map(emp => emp.email);
    const existingUsers = await storage.getUsersByEmails(emailArray);
    const existingUserMap = new Map();
    existingUsers.forEach((user: any) => {
      existingUserMap.set(user.email.toLowerCase(), user);
    });
    
    const employeesToCreate: EmployeeRow[] = [];
    const employeesToUpdate: Array<{ existing: any; newData: EmployeeRow }> = [];
    
    // Separate employees into create vs update operations
    employees.forEach(employee => {
      const existingUser = existingUserMap.get(employee.email.toLowerCase());
      if (existingUser) {
        employeesToUpdate.push({ existing: existingUser, newData: employee });
      } else {
        employeesToCreate.push(employee);
      }
    });

    // Process department creation and validation first
    const existingDepartments = await storage.getDepartmentsByOrganization(organizationId);
    const existingDeptNames = existingDepartments.map(dept => dept.name);
    const allDepartments = Array.from(new Set(employees.map(emp => emp.department)));
    
    for (const deptName of allDepartments) {
      // Check exact match (case insensitive)
      const exactMatch = existingDeptNames.find(existing => 
        existing.toLowerCase() === deptName.toLowerCase()
      );
      
      if (!exactMatch) {
        // Create new department
        try {
          await storage.createDepartment({
            name: deptName,
            description: `Auto-created from bulk upload`,
            organization_id: organizationId,
          });
          departmentsCreated++;
          existingDeptNames.push(deptName); // Add to existing list for subsequent checks
        } catch (error) {
          console.error(`Error creating department ${deptName}:`, error);
        }
      }
    }

    // Create new employees
    for (let i = 0; i < employeesToCreate.length; i++) {
      const employeeData = employeesToCreate[i];
      try {
        const userData = {
          name: employeeData.name,
          surname: employeeData.surname,
          email: employeeData.email,
          username: employeeData.email.split('@')[0],
          password: 'TempPassword123!', // Temporary password - should be changed on first login
          department: employeeData.department,
          location: employeeData.location || null,
          job_title: employeeData.jobTitle || null,
          phone_number: employeeData.phoneNumber || null,
          birth_date: employeeData.birthDate || null,
          hire_date: employeeData.hireDate || new Date().toISOString().split('T')[0],
          organization_id: organizationId,
          role_type: 'employee',
          is_admin: false,
          status: 'active',
        };

        await storage.createUser(userData as any);
        employeesCreated++;
      } catch (error: any) {
        console.error(`Error creating employee ${employeeData.email}:`, error);
        
        let userFriendlyError = 'Unknown error occurred';
        let suggestion = 'Please check the data format and try again';
        
        // Parse specific database errors
        if (error.message && typeof error.message === 'string') {
          if (error.message.includes('date/time field value out of range')) {
            userFriendlyError = 'Invalid date format';
            suggestion = 'Please use DD/MM/YYYY format for dates (e.g., 25/12/1990)';
          } else if (error.message.includes('duplicate key value violates unique constraint')) {
            if (error.message.includes('email')) {
              userFriendlyError = 'Email address already exists';
              suggestion = 'This email is already in use. Please use a different email address';
            } else {
              userFriendlyError = 'Duplicate data found';
              suggestion = 'This record already exists in the system';
            }
          } else if (error.message.includes('null value in column')) {
            const column = error.message.match(/null value in column "(\w+)"/)?.[1];
            userFriendlyError = `Missing required field: ${column}`;
            suggestion = `Please provide a value for ${column}`;
          } else if (error.message.includes('invalid input syntax')) {
            userFriendlyError = 'Invalid data format';
            suggestion = 'Please check the data format matches the expected format';
          }
        }
        
        // Find original row index for this employee
        const originalIndex = employees.findIndex(emp => emp.email === employeeData.email);
        detailedErrors.push({
          row: originalIndex + 2, // +2 because first row is header and arrays are 0-indexed
          email: employeeData.email || 'N/A',
          name: `${employeeData.name} ${employeeData.surname}`.trim() || 'N/A',
          error: userFriendlyError,
          suggestion: suggestion
        });
      }
    }
    
    // Update existing employees
    for (let i = 0; i < employeesToUpdate.length; i++) {
      const { existing, newData } = employeesToUpdate[i];
      try {
        const updateData: any = {};
        let hasChanges = false;
        
        // Compare and update only changed fields
        if (existing.name !== newData.name) {
          updateData.name = newData.name;
          hasChanges = true;
        }
        if (existing.surname !== newData.surname) {
          updateData.surname = newData.surname;
          hasChanges = true;
        }
        if (existing.department !== newData.department) {
          updateData.department = newData.department;
          hasChanges = true;
        }
        if (existing.location !== newData.location) {
          updateData.location = newData.location;
          hasChanges = true;
        }
        if (existing.job_title !== newData.jobTitle) {
          updateData.job_title = newData.jobTitle;
          hasChanges = true;
        }
        if (existing.phone_number !== newData.phoneNumber) {
          updateData.phone_number = newData.phoneNumber;
          hasChanges = true;
        }
        if (existing.birth_date !== newData.birthDate) {
          updateData.birth_date = newData.birthDate;
          hasChanges = true;
        }
        if (existing.hire_date !== newData.hireDate) {
          updateData.hire_date = newData.hireDate;
          hasChanges = true;
        }
        
        if (hasChanges) {
          await storage.updateUser(existing.id, updateData);
          employeesUpdated++;
        }
      } catch (error: any) {
        console.error(`Error updating employee ${newData.email}:`, error);
        
        let userFriendlyError = 'Unknown error occurred while updating';
        let suggestion = 'Please check the data format and try again';
        
        // Parse specific database errors for updates
        if (error.message && typeof error.message === 'string') {
          if (error.message.includes('date/time field value out of range')) {
            userFriendlyError = 'Invalid date format in update';
            suggestion = 'Please use DD/MM/YYYY format for dates (e.g., 25/12/1990)';
          } else if (error.message.includes('invalid input syntax')) {
            userFriendlyError = 'Invalid data format in update';
            suggestion = 'Please check the data format matches the expected format';
          }
        }
        
        // Find original row index for this employee
        const originalIndex = employees.findIndex(emp => emp.email === newData.email);
        detailedErrors.push({
          row: originalIndex + 2,
          email: newData.email || 'N/A',
          name: `${newData.name} ${newData.surname}`.trim() || 'N/A',
          error: userFriendlyError,
          suggestion: suggestion
        });
      }
    }

    const totalProcessed = employeesCreated + employeesUpdated;
    res.json({
      message: detailedErrors.length === 0
        ? `Bulk upload completed successfully: ${employeesCreated} created, ${employeesUpdated} updated` 
        : `Bulk upload completed with ${detailedErrors.length} errors: ${employeesCreated} created, ${employeesUpdated} updated`,
      successCount: employeesCreated,
      updateCount: employeesUpdated,
      totalProcessed,
      errorCount: detailedErrors.length,
      departmentsCreated,
      totalRequested: employees.length,
      errors: detailedErrors,
      success: totalProcessed > 0
    });

  } catch (error) {
    console.error('Error executing bulk upload:', error);
    res.status(500).json({ message: 'Failed to execute bulk upload' });
  }
});

export default router;