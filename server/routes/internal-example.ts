import { Router } from 'express';
import { serviceAuth } from '../middleware/service-auth';

const router = Router();

// Protect this internal route: only callers with valid token & audience "server" are allowed
router.use('/internal', serviceAuth({ audience: 'server', required: true }));

router.get('/internal/ping', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

export default router;