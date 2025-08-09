CREATE TABLE IF NOT EXISTS event_consumptions (
  consumer TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, idempotency_key)
);

-- RLS example (optional, if you store tenant_id):
ALTER TABLE event_consumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_on_event_consumptions ON event_consumptions;
CREATE POLICY tenant_on_event_consumptions ON event_consumptions
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id')::text);