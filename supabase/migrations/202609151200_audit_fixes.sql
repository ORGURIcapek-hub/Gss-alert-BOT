DROP VIEW IF EXISTS public."Project_Assignments" CASCADE;
DROP VIEW IF EXISTS public."Evidence_Submissions" CASCADE;
DROP VIEW IF EXISTS public."Evaluations" CASCADE;
DROP VIEW IF EXISTS public."Projects" CASCADE;
DROP VIEW IF EXISTS public."OKRs" CASCADE;
DROP VIEW IF EXISTS public."Users" CASCADE;

DROP TABLE IF EXISTS public.project_assignees CASCADE;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS yearly_roles JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.evidence_submissions
    ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.evaluations
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS executive_score INT CHECK (executive_score BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.evidences
    ALTER COLUMN file_path TYPE TEXT;

CREATE INDEX IF NOT EXISTS idx_evaluations_project ON public.evaluations(project_id);

DROP POLICY IF EXISTS "Allow Upload OKR-files" ON storage.objects;
CREATE POLICY "Allow Upload OKR-files" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'OKR-files');

DROP POLICY IF EXISTS "Allow Update OKR-files" ON storage.objects;
CREATE POLICY "Allow Update OKR-files" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'OKR-files')
    WITH CHECK (bucket_id = 'OKR-files');

DROP POLICY IF EXISTS "Allow Delete OKR-files" ON storage.objects;
CREATE POLICY "Allow Delete OKR-files" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'OKR-files');
