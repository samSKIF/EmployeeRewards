import type { Router } from 'express';
import { Router as ExpressRouter } from 'express';

const router: Router = ExpressRouter();

router.get('/__health', (_req, res) => {
  const info: any = {
    ok: true,
    ts: new Date().toISOString()
  };
  res.status(200).json(info);
});

export default router;