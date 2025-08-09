import { Router } from 'express';
import { publish } from '../services/event-bus';
import { isDraining } from '../bootstrap/shutdown';

const router = Router();

router.get('/__ready', async (req, res) => {
  const checks: Record<string, any> = {};

  // Process
  checks.process = { ok: true, uptime_s: Math.floor(process.uptime()) };

  // Event bus (stub)
  try {
    await publish('__probe__', { t: Date.now() });
    checks.event_bus = { ok: true };
  } catch (e: any) {
    checks.event_bus = { ok: false, error: e?.message || String(e) };
  }

  // Postgres (best effort)
  try {
    let poolMod: any = null;
    try { poolMod = await import('../db/postgres/pool'); } catch {}
    if (!poolMod) { try { poolMod = await import('../db/postgres/index'); } catch {} }

    const pool = poolMod?.pool ?? poolMod?.default ?? (typeof poolMod?.getPool === 'function' ? poolMod.getPool() : null);
    if (pool?.connect) {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      checks.postgres = { ok: true };
    } else {
      checks.postgres = { ok: 'skipped' };
    }
  } catch (e: any) {
    checks.postgres = { ok: false, error: e?.message || String(e) };
  }

  // Mongo (best effort)
  try {
    let mongoMod: any = null;
    try { mongoMod = await import('../mongodb'); } catch {}
    if (!mongoMod) { try { mongoMod = await import('../db/mongo/index'); } catch {} }

    const db = typeof mongoMod?.getDb === 'function' ? await mongoMod.getDb() : null;
    if (db?.command) {
      await db.command({ ping: 1 });
      checks.mongo = { ok: true };
    } else {
      checks.mongo = { ok: 'skipped' };
    }
  } catch (e: any) {
    checks.mongo = { ok: false, error: e?.message || String(e) };
  }

  const draining = isDraining();
  if (draining) {
    return res.status(503).json({
      ok: false,
      status: 'draining',
      checks,
      ts: new Date().toISOString(),
      correlation_id: (req as any).correlationId
    });
  }

  const ok = Object.values(checks).every((c: any) => c.ok === true || c.ok === 'skipped' || c.ok === 'unknown');
  res.status(ok ? 200 : 503).json({
    ok,
    checks,
    ts: new Date().toISOString(),
    correlation_id: (req as any).correlationId
  });
});

export default router;