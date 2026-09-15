ALTER TABLE public.okrs
    ADD COLUMN IF NOT EXISTS object TEXT,
    ADD COLUMN IF NOT EXISTS key_result TEXT;

CREATE INDEX IF NOT EXISTS idx_okrs_object ON public.okrs(object);
CREATE INDEX IF NOT EXISTS idx_okrs_key_result ON public.okrs(key_result);
