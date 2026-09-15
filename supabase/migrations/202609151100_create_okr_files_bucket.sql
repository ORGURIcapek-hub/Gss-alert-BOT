INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'OKR-files',
    'OKR-files',
    true,
    52428800,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public Access OKR-files" ON storage.objects;
CREATE POLICY "Public Access OKR-files" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'OKR-files');

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
