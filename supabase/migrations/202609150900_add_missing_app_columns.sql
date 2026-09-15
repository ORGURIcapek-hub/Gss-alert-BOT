ALTER TABLE public.evidence_submissions
    ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.evaluations
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS executive_score INT CHECK (executive_score BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS yearly_roles JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_evaluations_project ON public.evaluations(project_id);
