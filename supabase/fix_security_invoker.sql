-- =============================================================================
-- Fix: Enable SECURITY INVOKER on Views in Supabase (PostgreSQL 15+)
-- =============================================================================
-- Description:
-- By default, PostgreSQL views run with the privileges of the view owner (SECURITY DEFINER),
-- which bypasses Row Level Security (RLS) on underlying tables.
-- Setting (security_invoker = true) ensures that RLS policies are applied according
-- to the permissions of the current querying user (Invoker).
-- =============================================================================

-- Apply security_invoker = true to public views:
DO $$
BEGIN
    -- project_assignments
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'project_assignments') THEN
        ALTER VIEW public.project_assignments SET (security_invoker = true);
    END IF;

    -- evidence_submissions
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'evidence_submissions') THEN
        ALTER VIEW public.evidence_submissions SET (security_invoker = true);
    END IF;

    -- evaluations
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'evaluations') THEN
        ALTER VIEW public.evaluations SET (security_invoker = true);
    END IF;

    -- projects
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'projects') THEN
        ALTER VIEW public.projects SET (security_invoker = true);
    END IF;

    -- okrs
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'okrs') THEN
        ALTER VIEW public.okrs SET (security_invoker = true);
    END IF;

    -- users
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'users') THEN
        ALTER VIEW public.users SET (security_invoker = true);
    END IF;

    -- reports
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'reports') THEN
        ALTER VIEW public.reports SET (security_invoker = true);
    END IF;

    -- audit_logs
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'audit_logs') THEN
        ALTER VIEW public.audit_logs SET (security_invoker = true);
    END IF;
END $$;
