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

    // Check for existing emails in database
    const emailArray = Array.from(emailSet) as string[];
    const existingUsers = await storage.getUsersByEmails(emailArray);
    const existingEmails = existingUsers.map((user: any) => user.email);
    
    if (existingEmails.length > 0) {
      warnings.push(`${existingEmails.length} emails already exist in system: ${existingEmails.slice(0, 5).join(', ')}${existingEmails.length > 5 ? '...' : ''}`);
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
      employees: employees.filter(emp => !existingEmails.includes(emp.email)), // Only new employees
      departmentAnalysis: {
        new: newDepartments,
        typos: typoSuggestions,
        existing: existingDepartmentsList,
        total: departmentAnalysis.length
      },
      employeeCount: employees.filter(emp => !existingEmails.includes(emp.email)).length,
      validation: {
        hasErrors: errors.length > 0,
        errors,
        warnings,
        needsReview: typoSuggestions.length > 0, // Flag for frontend to show review UI
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
    const detailedErrors: Array<{
      row: number;
      email: string;
      name: string;
      error: string;
      suggestion: string;
    }> = [];

    // Auto-create new departments found in CSV
    const existingDepartments = await storage.getDepartmentsByOrganization(organizationId);
    const existingDeptNames = existingDepartments.map(dept => dept.name.toLowerCase());
    
    const fileDepartments = Array.from(new Set(employees.map(emp => emp.department)));
    const newDepartments = fileDepartments.filter(dept => 
      !existingDeptNames.includes(dept.toLowerCase())
    );

    for (const departmentName of newDepartments) {
      try {
        await storage.createDepartment({
          organization_id: organizationId,
          name: departmentName,
          description: `Auto-created during bulk employee upload`,
          color: '#6B7280',
          created_by: (req as any).user.id,
        });
        departmentsCreated++;
      } catch (error) {
        console.error(`Error creating department ${departmentName}:`, error);
        // Continue with other departments
      }
    }

    // Create employees with detailed error tracking
    for (let i = 0; i < employees.length; i++) {
      const employeeData = employees[i];
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
        
        detailedErrors.push({
          row: i + 2, // +2 because first row is header and arrays are 0-indexed
          email: employeeData.email || 'N/A',
          name: `${employeeData.name} ${employeeData.surname}`.trim() || 'N/A',
          error: userFriendlyError,
          suggestion: suggestion
        });
      }
    }

    res.json({
      message: employeesCreated === employees.length 
        ? 'Bulk upload completed successfully' 
        : `Bulk upload completed with ${detailedErrors.length} errors`,
      successCount: employeesCreated,
      errorCount: employees.length - employeesCreated,
      departmentsCreated,
      totalRequested: employees.length,
      errors: detailedErrors,
      success: employeesCreated > 0
    });

  } catch (error) {
    console.error('Error executing bulk upload:', error);
    res.status(500).json({ message: 'Failed to execute bulk upload' });
  }
});

export default router;