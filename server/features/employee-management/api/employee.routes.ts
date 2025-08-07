// Employee Routes - API Endpoints
// Defines all HTTP routes for employee management vertical slice

import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../../../middleware/auth';
import { EmployeeController } from './employee.controller';

const router = Router();
const employeeController = new EmployeeController();

// Employee CRUD operations
router.get('/', verifyToken, verifyAdmin, employeeController.getEmployees);
router.get('/departments', verifyToken, verifyAdmin, employeeController.getDepartments);
router.get('/department/:department', verifyToken, verifyAdmin, employeeController.getEmployeesByDepartment);
router.get('/:id', verifyToken, verifyAdmin, employeeController.getEmployeeById);
router.post('/', verifyToken, verifyAdmin, employeeController.createEmployee);
router.put('/:id', verifyToken, verifyAdmin, employeeController.updateEmployee);
router.delete('/:id', verifyToken, verifyAdmin, employeeController.deactivateEmployee);

export default router;