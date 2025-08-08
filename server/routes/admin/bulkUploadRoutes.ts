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

// Shared CSV field mapping function
const mapCsvRow = (row: any) => {
  const keys = Object.keys(row);
  const mapped: any = {};
  
  // Map name fields
  const nameField = keys.find(k => 
    k.toLowerCase().includes('name') || 
    k.toLowerCase() === 'first name' || 
    k.toLowerCase() === 'firstname'
  );
  if (nameField) mapped.name = row[nameField];
  
  // Handle full name parsing
  const fullNameField = keys.find(k => 
    k.toLowerCase() === 'full name' || 
    k.toLowerCase() === 'fullname'
  );
  if (fullNameField && !mapped.name) {
    const parts = row[fullNameField]?.split(' ') || [];
    mapped.name = parts[0] || '';
    mapped.surname = parts.slice(1).join(' ') || '';
  }
  
  // Map surname/last name
  if (!mapped.surname) {
    const surnameField = keys.find(k => 
      k.toLowerCase().includes('surname') || 
      k.toLowerCase() === 'last name' || 
      k.toLowerCase() === 'lastname'
    );
    if (surnameField) mapped.surname = row[surnameField];
  }
  
  // Map email
  const emailField = keys.find(k => 
    k.toLowerCase().includes('email') || 
    k.toLowerCase() === 'e-mail'
  );
  if (emailField) mapped.email = row[emailField];
  
  // Map department
  const deptField = keys.find(k => 
    k.toLowerCase().includes('department') || 
    k.toLowerCase() === 'dept'
  );
  if (deptField) mapped.department = row[deptField];
  
  // Map job title
  const jobField = keys.find(k => 
    k.toLowerCase().includes('job') && k.toLowerCase().includes('title') ||
    k.toLowerCase() === 'title' ||
    k.toLowerCase() === 'position' ||
    k.toLowerCase() === 'role'
  );
  if (jobField) mapped.jobTitle = row[jobField];
  
  // Map location
  const locationField = keys.find(k => 
    k.toLowerCase().includes('location') || 
    k.toLowerCase().includes('office')
  );
  if (locationField) mapped.location = row[locationField];
  
  // Map phone
  const phoneField = keys.find(k => 
    k.toLowerCase().includes('phone') || 
    k.toLowerCase().includes('mobile')
  );
  if (phoneField) mapped.phoneNumber = row[phoneField];
  
  // Map hire date
  const hireDateField = keys.find(k => 
    k.toLowerCase().includes('hire') || 
    k.toLowerCase().includes('start') ||
    k.toLowerCase() === 'start date'
  );
  if (hireDateField) mapped.hireDate = row[hireDateField];
  
  // Map birth date
  const birthDateField = keys.find(k => 
    k.toLowerCase().includes('birth') || 
    k.toLowerCase().includes('dob')
  );
  if (birthDateField) mapped.birthDate = row[birthDateField];
  
  return mapped;
};

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

    // Parse CSV file with flexible mapping
    let rowIndex = 0;
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on('data', (row) => {
          rowIndex++;
          const mappedRow = mapCsvRow(row);
          
          // Validate required fields
          if (!mappedRow.name || !mappedRow.email) {
            console.log(`Row ${rowIndex} validation failed:`, { original: row, mapped: mappedRow });
            errors.push(`Row ${rowIndex} missing required fields: name and email are required`);
            return;
          }
          
          // Default department if missing
          if (!mappedRow.department) {
            mappedRow.department = 'General';
            warnings.push(`Row ${rowIndex}: No department specified, using 'General'`);
          }

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(mappedRow.email)) {
            errors.push(`Row ${rowIndex} - Invalid email format: ${mappedRow.email}`);
            return;
          }

          employees.push({
            name: mappedRow.name.trim(),
            surname: mappedRow.surname?.trim() || '',
            email: mappedRow.email.trim().toLowerCase(),
            department: mappedRow.department.trim(),
            location: mappedRow.location?.trim() || undefined,
            jobTitle: mappedRow.jobTitle?.trim() || undefined,
            phoneNumber: mappedRow.phoneNumber?.trim() || undefined,
            birthDate: convertDateFormat(mappedRow.birthDate?.trim()),
            hireDate: convertDateFormat(mappedRow.hireDate?.trim()),
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
    console.log(`DEBUG: Found ${existingUsers.length} existing users out of ${emailArray.length} emails`);
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
        
        // Helper function to normalize values for comparison
        const normalize = (value: any): string | null => {
          if (value === null || value === undefined || value === '') return null;
          return String(value).trim();
        };
        
        // Helper function to compare normalized values
        const hasChanged = (existing: any, newValue: any): boolean => {
          const normalizedExisting = normalize(existing);
          const normalizedNew = normalize(newValue);
          return normalizedExisting !== normalizedNew;
        };
        
        if (hasChanged(existingUser.name, employee.name)) changes.push('name');
        if (hasChanged(existingUser.surname, employee.surname)) changes.push('surname');
        if (hasChanged(existingUser.department, employee.department)) changes.push('department');
        if (hasChanged(existingUser.location, employee.location)) changes.push('location');
        if (hasChanged(existingUser.job_title, employee.jobTitle)) changes.push('job title');
        if (hasChanged(existingUser.phone_number, employee.phoneNumber)) changes.push('phone number');
        if (hasChanged(existingUser.birth_date, employee.birthDate)) changes.push('birth date');
        if (hasChanged(existingUser.hire_date, employee.hireDate)) changes.push('hire date');
        
        if (changes.length > 0) {
          console.log(`DEBUG: Employee ${employee.email} has ${changes.length} changes:`, changes);
        }
        
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

    console.log(`DEBUG: Final counts - Total: ${employees.length}, New: ${newEmployees.length}, Updates: ${employeesWithChanges.length}, New Departments: ${newDepartments.length}`);
    
    const previewData = {
      employees: employees,
      newDepartments: newDepartments.map(d => d.name),
      existingDepartments: existingDepartmentsList.map(d => d.name),
      employeeCount: newEmployees.length, // Only count new employees for the main counter
      newEmployees,
      existingEmployees: existingEmployeeMatches,
      employeesWithChanges,
      departmentAnalysis: {
        new: newDepartments,
        typos: typoSuggestions,
        existing: existingDepartmentsList,
        total: departmentAnalysis.length
      },
      newEmployeeCount: newEmployees.length,
      updateEmployeeCount: employeesWithChanges.length,
      validation: {
        hasErrors: errors.length > 0,
        errors,
        warnings,
        needsReview: typoSuggestions.length > 0 || newDepartments.length > 0,
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
        const mappedRow = mapCsvRow(row);
        
        // Validate required fields
        if (!mappedRow.name || !mappedRow.email) {
          errors.push(`Row missing required fields: name and email are required`);
          return;
        }
        
        // Default department if missing
        if (!mappedRow.department) {
          mappedRow.department = 'General';
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mappedRow.email)) {
          errors.push(`Invalid email format: ${mappedRow.email}`);
          return;
        }

        employees.push({
          name: mappedRow.name.toString().trim(),
          surname: mappedRow.surname?.toString().trim() || '',
          email: mappedRow.email.toString().trim().toLowerCase(),
          department: mappedRow.department.toString().trim(),
          location: mappedRow.location?.toString().trim() || undefined,
          jobTitle: mappedRow.jobTitle?.toString().trim() || undefined,
          phoneNumber: mappedRow.phoneNumber?.toString().trim() || undefined,
          birthDate: convertDateFormat(mappedRow.birthDate?.toString().trim()),
          hireDate: convertDateFormat(mappedRow.hireDate?.toString().trim()),
        });
      });
    } else {
      // Parse CSV file with flexible mapping
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file!.path)
          .pipe(csv())
          .on('data', (row) => {
            const mappedRow = mapCsvRow(row);
            
            // Validate required fields
            if (!mappedRow.name || !mappedRow.email) {
              errors.push(`Row missing required fields: name and email are required`);
              return;
            }
            
            // Default department if missing
            if (!mappedRow.department) {
              mappedRow.department = 'General';
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(mappedRow.email)) {
              errors.push(`Invalid email format: ${mappedRow.email}`);
              return;
            }

            employees.push({
              name: mappedRow.name.trim(),
              surname: mappedRow.surname?.trim() || '',
              email: mappedRow.email.trim().toLowerCase(),
              department: mappedRow.department.trim(),
              location: mappedRow.location?.trim() || undefined,
              jobTitle: mappedRow.jobTitle?.trim() || undefined,
              phoneNumber: mappedRow.phoneNumber?.trim() || undefined,
              birthDate: convertDateFormat(mappedRow.birthDate?.trim()),
              hireDate: convertDateFormat(mappedRow.hireDate?.trim()),
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