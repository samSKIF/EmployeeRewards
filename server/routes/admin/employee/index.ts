import { Router } from 'express';
import employeeBasicRoutes from './employeeBasicRoutes';
import employeeUpdateRoutes from './employeeUpdateRoutes';
import employeeSearchRoutes from './employeeSearchRoutes';
import employeeBulkRoutes from './employeeBulkRoutes';

const router = Router();

// Mount all employee route modules
router.use('/', employeeBasicRoutes);
router.use('/', employeeUpdateRoutes);
router.use('/', employeeSearchRoutes);
router.use('/', employeeBulkRoutes);

export default router;