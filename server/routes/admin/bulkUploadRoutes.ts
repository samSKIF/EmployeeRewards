import { Router } from 'express';
import { verifyToken } from '../../middleware/auth';
import { verifyAdmin } from '../../middleware/auth';
import { storage } from '../../storage';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'server/uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
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
}

// Preview endpoint - analyzes CSV file without creating records
router.post('/api/admin/employees/bulk-preview', verifyToken, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    const organizationId = (req.user as any).organization_id;
    
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
            surname: row.surname.trim(),
            email: row.email.trim().toLowerCase(),
            department: row.department.trim(),
            location: row.location?.trim() || undefined,
            jobTitle: row.jobTitle?.trim() || undefined,
            phoneNumber: row.phoneNumber?.trim() || undefined,
            birthDate: row.birthDate?.trim() || undefined,
            hireDate: row.hireDate?.trim() || undefined,
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
    const existingUsers = await storage.getUsersByEmails(Array.from(emailSet));
    const existingEmails = existingUsers.map(user => user.email);
    
    if (existingEmails.length > 0) {
      warnings.push(`${existingEmails.length} emails already exist in system: ${existingEmails.slice(0, 5).join(', ')}${existingEmails.length > 5 ? '...' : ''}`);
    }

    // Analyze departments
    const existingDepartments = await storage.getDepartmentsByOrganization(organizationId);
    const existingDeptNames = existingDepartments.map(dept => dept.name.toLowerCase());
    
    const fileDepartments = [...new Set(employees.map(emp => emp.department))];
    const newDepartments = fileDepartments.filter(dept => 
      !existingDeptNames.includes(dept.toLowerCase())
    );
    const existingDeptList = fileDepartments.filter(dept => 
      existingDeptNames.includes(dept.toLowerCase())
    );

    // Additional validations
    if (employees.length > 1000) {
      warnings.push('Large upload detected. Consider splitting into smaller batches for better performance.');
    }

    const previewData = {
      employees: employees.filter(emp => !existingEmails.includes(emp.email)), // Only new employees
      newDepartments,
      existingDepartments: existingDeptList,
      employeeCount: employees.filter(emp => !existingEmails.includes(emp.email)).length,
      validation: {
        hasErrors: errors.length > 0,
        errors,
        warnings,
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
router.post('/api/admin/employees/bulk-upload', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const organizationId = (req.user as any).organization_id;
    const { employees, createDepartments } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ message: 'Invalid employee data' });
    }

    let departmentsCreated = 0;
    let employeesCreated = 0;

    // Create new departments first
    if (createDepartments && Array.isArray(createDepartments)) {
      for (const departmentName of createDepartments) {
        try {
          await storage.createDepartment({
            organization_id: organizationId,
            name: departmentName,
            description: `Auto-created during bulk employee upload`,
            color: '#6B7280',
            created_by: req.user!.id,
          });
          departmentsCreated++;
        } catch (error) {
          console.error(`Error creating department ${departmentName}:`, error);
          // Continue with other departments
        }
      }
    }

    // Create employees
    for (const employeeData of employees) {
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

        await storage.createUser(userData);
        employeesCreated++;
      } catch (error) {
        console.error(`Error creating employee ${employeeData.email}:`, error);
        // Continue with other employees
      }
    }

    res.json({
      message: 'Bulk upload completed successfully',
      departmentsCreated,
      employeesCreated,
      totalRequested: employees.length,
    });

  } catch (error) {
    console.error('Error executing bulk upload:', error);
    res.status(500).json({ message: 'Failed to execute bulk upload' });
  }
});

export default router;