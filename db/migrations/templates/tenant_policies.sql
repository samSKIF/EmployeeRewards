-- Enable RLS and tenant policy (replace <TABLE> with table name)
ALTER TABLE <TABLE> ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON <TABLE>;
CREATE POLICY tenant_isolation ON <TABLE>
  USING (tenant_id = current_setting('app.tenant_id')::text);

-- Set tenant at session start in your code:
-- SELECT set_config('app.tenant_id', '<TENANT_ID>', false);