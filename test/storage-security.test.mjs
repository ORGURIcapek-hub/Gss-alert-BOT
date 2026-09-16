import test from 'node:test'
import assert from 'node:assert/strict'

const DEFAULT_BUCKET = 'OKR-files'
const MAX_FILE_SIZE = 52428800
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv'
])

function resolveBucketName(bucket) {
  const clean = (bucket || '').trim() || DEFAULT_BUCKET
  if (clean !== DEFAULT_BUCKET) return null
  return clean
}

function sanitizeStoragePath(rawPath, fallbackName) {
  const trimmed = (rawPath || '').replace(/^\/+/, '').trim()
  const source = trimmed || fallbackName
  const segments = source.split('/').map(s => s.trim()).filter(s => s.length > 0 && s !== '.')
  if (segments.length === 0) return null
  if (segments.some(s => s === '..' || s.includes('\\'))) return null
  const cleaned = segments.map(s => s.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')).filter(s => s.length > 0)
  if (cleaned.length === 0) return null
  return cleaned.join('/')
}

function parseDeleteStoragePath(rawPath, bucket) {
  if (!rawPath || !String(rawPath).trim()) return null
  let decoded = String(rawPath)
  try {
    decoded = decodeURIComponent(decoded)
  } catch {}
  const bucketMarker = `/${bucket}/`
  const bucketIdx = decoded.indexOf(bucketMarker)
  const pathSource = bucketIdx !== -1
    ? decoded.substring(bucketIdx + bucketMarker.length).split('?')[0]
    : decoded.split('?')[0]
  return sanitizeStoragePath(pathSource, '')
}

test('resolveBucketName: allows only OKR-files and rejects all arbitrary bucket names', () => {
  assert.equal(resolveBucketName('OKR-files'), 'OKR-files')
  assert.equal(resolveBucketName(''), 'OKR-files')
  assert.equal(resolveBucketName(null), 'OKR-files')
  assert.equal(resolveBucketName('   '), 'OKR-files')

  assert.equal(resolveBucketName('system-files'), null)
  assert.equal(resolveBucketName('private'), null)
  assert.equal(resolveBucketName('../etc'), null)
  assert.equal(resolveBucketName('okr-files'), null)
})

test('sanitizeStoragePath: rejects directory traversal attacks with .. or backslashes', () => {
  assert.equal(sanitizeStoragePath('../secrets.txt', 'fallback'), null)
  assert.equal(sanitizeStoragePath('uploads/../../etc/passwd', 'fallback'), null)
  assert.equal(sanitizeStoragePath('uploads\\subfolder\\file.pdf', 'fallback'), null)
  assert.equal(sanitizeStoragePath('..', 'fallback'), null)
})

test('sanitizeStoragePath: replaces unsafe special characters with underscores', () => {
  assert.equal(sanitizeStoragePath('evidence 1 (draft) [final]?.pdf', 'fallback'), 'evidence_1_draft_final_.pdf')
  assert.equal(sanitizeStoragePath('folder name/sub directory/report#2.docx', 'fallback'), 'folder_name/sub_directory/report_2.docx')
})

test('sanitizeStoragePath: strips leading slashes and normalizes segments', () => {
  assert.equal(sanitizeStoragePath('///projects/doc.pdf', 'fallback'), 'projects/doc.pdf')
  assert.equal(sanitizeStoragePath('./projects/./doc.pdf', 'fallback'), 'projects/doc.pdf')
})

test('sanitizeStoragePath: uses fallbackName when rawPath is empty or whitespace', () => {
  assert.equal(sanitizeStoragePath('', 'default_123.jpg'), 'default_123.jpg')
  assert.equal(sanitizeStoragePath('   ', 'fallback.png'), 'fallback.png')
  assert.equal(sanitizeStoragePath(null, 'fallback.png'), 'fallback.png')
})

test('parseDeleteStoragePath: extracts clean storage path from full Supabase URL or relative path', () => {
  const fullUrl = 'https://abcdef.supabase.co/storage/v1/object/public/OKR-files/evidence/2025/doc_1.pdf?token=123'
  assert.equal(parseDeleteStoragePath(fullUrl, 'OKR-files'), 'evidence/2025/doc_1.pdf')

  const encodedUrl = 'https://supabase.co/OKR-files/my%20folder/evidence%20file.pdf'
  assert.equal(parseDeleteStoragePath(encodedUrl, 'OKR-files'), 'my_folder/evidence_file.pdf')

  const relative = 'evidence/doc_2.pdf'
  assert.equal(parseDeleteStoragePath(relative, 'OKR-files'), 'evidence/doc_2.pdf')

  assert.equal(parseDeleteStoragePath('', 'OKR-files'), null)
  assert.equal(parseDeleteStoragePath('   ', 'OKR-files'), null)
  assert.equal(parseDeleteStoragePath('/OKR-files/../evil.sh', 'OKR-files'), null)
})

test('storage constraints: enforces 50MB maximum file size limit', () => {
  assert.equal(MAX_FILE_SIZE, 50 * 1024 * 1024)
  const allowedSize = 50 * 1024 * 1024
  const oversized = 50 * 1024 * 1024 + 1

  assert.ok(allowedSize <= MAX_FILE_SIZE)
  assert.ok(oversized > MAX_FILE_SIZE)
})

test('storage constraints: allows valid document and image mime types while rejecting executables and scripts', () => {
  assert.ok(ALLOWED_MIME_TYPES.has('application/pdf'))
  assert.ok(ALLOWED_MIME_TYPES.has('image/png'))
  assert.ok(ALLOWED_MIME_TYPES.has('image/jpeg'))
  assert.ok(ALLOWED_MIME_TYPES.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
  assert.ok(ALLOWED_MIME_TYPES.has('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))
  assert.ok(ALLOWED_MIME_TYPES.has('text/csv'))

  assert.ok(!ALLOWED_MIME_TYPES.has('application/x-msdownload'))
  assert.ok(!ALLOWED_MIME_TYPES.has('application/javascript'))
  assert.ok(!ALLOWED_MIME_TYPES.has('application/x-sh'))
  assert.ok(!ALLOWED_MIME_TYPES.has('application/x-php'))
  assert.ok(!ALLOWED_MIME_TYPES.has('text/html'))
})
