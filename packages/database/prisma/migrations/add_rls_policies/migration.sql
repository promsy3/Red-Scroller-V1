-- Add PostgreSQL RLS policies for tenant isolation (defense-in-depth beneath NestJS guards)

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Matter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiaryEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Create a function to extract firmId from session variable set by application
CREATE OR REPLACE FUNCTION get_current_firm_id() RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_firm_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL::uuid; -- Return NULL if not set (will be blocked by RLS policies)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policy for Client table
CREATE POLICY "Client_isolation_policy" ON "Client"
  FOR ALL
  TO PUBLIC
  USING (
    "firmId" = get_current_firm_id()
  );

-- RLS policy for Matter table
CREATE POLICY "Matter_isolation_policy" ON "Matter"
  FOR ALL
  TO PUBLIC
  USING (
    "firmId" = get_current_firm_id()
  );

-- RLS policy for Document table
CREATE POLICY "Document_isolation_policy" ON "Document"
  FOR ALL
  TO PUBLIC
  USING (
    "firmId" = get_current_firm_id()
  );

-- RLS policy for DiaryEvent table
CREATE POLICY "DiaryEvent_isolation_policy" ON "DiaryEvent"
  FOR ALL
  TO PUBLIC
  USING (
    "firmId" = get_current_firm_id()
  );

-- RLS policy for AuditLog table
CREATE POLICY "AuditLog_isolation_policy" ON "AuditLog"
  FOR ALL
  TO PUBLIC
  USING (
    "firmId" = get_current_firm_id()
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
