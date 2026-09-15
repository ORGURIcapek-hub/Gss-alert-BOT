import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

function resolveBucketName(bucket: string): string | null {
  const clean = (bucket || '').trim() || DEFAULT_BUCKET
  if (clean !== DEFAULT_BUCKET) return null
  return clean
}

function sanitizeStoragePath(rawPath: string, fallbackName: string): string | null {
  const trimmed = (rawPath || '').replace(/^\/+/, '').trim()
  const source = trimmed || fallbackName
  const segments = source.split('/').map(s => s.trim()).filter(s => s.length > 0 && s !== '.')
  if (segments.length === 0) return null
  if (segments.some(s => s === '..' || s.includes('\\'))) return null
  const cleaned = segments.map(s => s.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')).filter(s => s.length > 0)
  if (cleaned.length === 0) return null
  return cleaned.join('/')
}

function getAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) return null
  try {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawPath = (formData.get('path') as string) || ''
    const bucket = resolveBucketName((formData.get('bucket') as string) || DEFAULT_BUCKET)
    const originalFileName = (formData.get('fileName') as string) || file?.name || 'file'

    if (!bucket) {
      return NextResponse.json({ error: 'bucket ไม่ถูกต้อง' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์สำหรับการอัปโหลด' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'ขนาดไฟล์ต้องไม่เกิน 50MB' }, { status: 413 })
    }

    const contentType = file.type || 'application/octet-stream'
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'ประเภทไฟล์นี้ไม่ได้รับอนุญาต' }, { status: 400 })
    }

    const fallbackName = `${Date.now()}_${(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')}`
    const cleanPath = sanitizeStoragePath(rawPath, fallbackName)
    if (!cleanPath) {
      return NextResponse.json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' }, { status: 400 })
    }
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabase = getAdminClient()
    if (!supabase) {
      return NextResponse.json({ error: 'ไม่สามารถเชื่อมต่อ Supabase ได้ กรุณาตรวจสอบการตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(cleanPath, buffer, {
        contentType,
        upsert: true,
        cacheControl: '3600'
      })

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(cleanPath)

      return NextResponse.json({
        success: true,
        url: publicUrlData.publicUrl,
        path: cleanPath,
        fileName: originalFileName,
        fileSize: file.size,
        fileType: contentType
      })
    }

    if (uploadError.message?.toLowerCase().includes('not found')) {
      await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: [
          'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
          'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain', 'text/csv'
        ]
      })

      const { error: retryError } = await supabase.storage
        .from(bucket)
        .upload(cleanPath, buffer, {
          contentType,
          upsert: true,
          cacheControl: '3600'
        })

      if (!retryError) {
        const { data: retryUrl } = supabase.storage
          .from(bucket)
          .getPublicUrl(cleanPath)

        return NextResponse.json({
          success: true,
          url: retryUrl.publicUrl,
          path: cleanPath,
          fileName: originalFileName,
          fileSize: file.size,
          fileType: contentType
        })
      }

      return NextResponse.json({ error: `อัปโหลดไม่สำเร็จ: ${retryError.message}` }, { status: 500 })
    }

    return NextResponse.json({ error: `อัปโหลดไม่สำเร็จ: ${uploadError.message}` }, { status: 500 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawPath = body.path || ''
    const bucket = resolveBucketName(body.bucket || DEFAULT_BUCKET)

    if (!bucket) {
      return NextResponse.json({ error: 'bucket ไม่ถูกต้อง' }, { status: 400 })
    }

    if (!rawPath || !String(rawPath).trim()) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุไฟล์ที่ต้องการลบ' }, { status: 400 })
    }

    let decoded = String(rawPath)
    try {
      decoded = decodeURIComponent(decoded)
    } catch {}
    const bucketMarker = `/${bucket}/`
    const bucketIdx = decoded.indexOf(bucketMarker)
    const pathSource = bucketIdx !== -1
      ? decoded.substring(bucketIdx + bucketMarker.length).split('?')[0]
      : decoded.split('?')[0]
    const cleanPath = sanitizeStoragePath(pathSource, '')
    if (!cleanPath) {
      return NextResponse.json({ success: false, error: 'เส้นทางไฟล์ไม่ถูกต้อง' }, { status: 400 })
    }

    const supabase = getAdminClient()
    if (!supabase) {
      return NextResponse.json({ error: 'ไม่สามารถเชื่อมต่อ Supabase ได้' }, { status: 503 })
    }

    const { error } = await supabase.storage.from(bucket).remove([cleanPath])
    if (error) {
      return NextResponse.json({ error: `ลบไฟล์ไม่สำเร็จ: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'เกิดข้อผิดพลาดในการลบไฟล์' }, { status: 500 })
  }
}
