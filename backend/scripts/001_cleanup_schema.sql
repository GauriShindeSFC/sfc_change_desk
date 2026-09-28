-- ==============================================================================
-- Migration: 001_cleanup_schema.sql
-- Description: Removes obsolete Workflows table, Department, Drafts, Risk, and SLA
-- Safety Guarantee: All request records, IDs, approval stages & history,
--                   users, and category assignments are 100% preserved.
-- ==============================================================================

BEGIN;

-- 1. Drop Foreign Key Constraints referencing workflows table
ALTER TABLE public.change_requests 
  DROP CONSTRAINT IF EXISTS change_requests_workflow_id_fkey;

ALTER TABLE public.catalog_subcategories 
  DROP CONSTRAINT IF EXISTS catalog_subcategories_workflow_id_fkey;

-- 2. Drop obsolete columns from change_requests
ALTER TABLE public.change_requests 
  DROP COLUMN IF EXISTS workflow_id,
  DROP COLUMN IF EXISTS is_draft,
  DROP COLUMN IF EXISTS risk;

-- 3. Drop obsolete columns from catalog_subcategories
ALTER TABLE public.catalog_subcategories 
  DROP COLUMN IF EXISTS workflow_id,
  DROP COLUMN IF EXISTS risk,
  DROP COLUMN IF EXISTS sla;

-- 4. Drop obsolete column from travel_requests
ALTER TABLE public.travel_requests 
  DROP COLUMN IF EXISTS department;

-- 5. Drop the standalone workflows table
DROP TABLE IF EXISTS public.workflows;

COMMIT;
