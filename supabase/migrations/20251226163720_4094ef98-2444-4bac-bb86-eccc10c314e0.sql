-- Add explicit deny policies for audit_logs immutability
-- This makes the immutability requirement explicit in the schema

-- Explicitly prevent updates to audit logs
CREATE POLICY "Audit logs are immutable - no updates"
  ON public.audit_logs FOR UPDATE
  USING (false);

-- Explicitly prevent deletion of audit logs  
CREATE POLICY "Audit logs are immutable - no deletes"
  ON public.audit_logs FOR DELETE
  USING (false);