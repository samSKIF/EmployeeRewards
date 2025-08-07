// Recognition Routes - API Endpoints
// Defines all HTTP routes for recognition system vertical slice

import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../../../middleware/auth';
import { RecognitionController } from './recognition.controller';

const router = Router();
const recognitionController = new RecognitionController();

// Recognition CRUD operations
router.get('/', verifyToken, recognitionController.getRecognitions);
router.get('/stats', verifyToken, recognitionController.getRecognitionStats);
router.get('/history', verifyToken, recognitionController.getUserRecognitionHistory);
router.get('/:id', verifyToken, recognitionController.getRecognitionById);

// Peer recognition operations
router.post('/peer', verifyToken, recognitionController.createPeerRecognition);

// Recognition approval workflow (admin only)
router.post('/:id/approve', verifyToken, verifyAdmin, recognitionController.approveRecognition);
router.post('/:id/reject', verifyToken, verifyAdmin, recognitionController.rejectRecognition);

// Recognition settings management (admin only)
router.get('/settings', verifyToken, recognitionController.getRecognitionSettings);
router.put('/settings', verifyToken, verifyAdmin, recognitionController.updateRecognitionSettings);

// Manager budget management (admin only)
router.get('/manager-budgets', verifyToken, verifyAdmin, recognitionController.getManagerBudgets);
router.post('/manager-budgets', verifyToken, verifyAdmin, recognitionController.updateManagerBudget);

export default router;