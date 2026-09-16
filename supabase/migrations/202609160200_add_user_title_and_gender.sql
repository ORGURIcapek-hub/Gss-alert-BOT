ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS title VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female'));
