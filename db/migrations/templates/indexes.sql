-- Replace <TABLE> and fields as needed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<TABLE>_tenant_created
  ON <TABLE> (tenant_id, created_at DESC);