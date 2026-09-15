import { getSafeSupabaseClient } from './service-helpers'

export const STORAGE_BUCKET = 'OKR-files'

export interface StorageUploadResult {
  success: boolean
  url: string
  path: string
  fileName: string
  fileSize: number
  fileType: string
  error?: string
}

export interface StorageDeleteResult {
  success: boolean
  error?: string
}

export function getStoragePublicUrl(storagePath: string): string {
  if (!storagePath) return ''
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('data:')) {
    return storagePath
  }
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const cleanPath = storagePath.replace(/^\/+/, '')
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`
  }
  return storagePath
}

export function extractStoragePath(urlOrPath: string): string {
  if (!urlOrPath) return ''
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://') && !urlOrPath.startsWith('/')) {
    return urlOrPath
  }
  const bucketMarker = `/${STORAGE_BUCKET}/`
  const bucketIdx = urlOrPath.indexOf(bucketMarker)
  if (bucketIdx !== -1) {
    const rawPath = urlOrPath.substring(bucketIdx + bucketMarker.length)
    return rawPath.split('?')[0]
  }
  return urlOrPath
}

export function isStorageUrl(url: string): boolean {
  if (!url) return false
  return url.includes(`/${STORAGE_BUCKET}/`)
}

export function sanitizeStorageSegment(segment: string): string {
  const cleaned = (segment || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  if (!cleaned || cleaned === '.' || cleaned === '..') return '_'
  return cleaned
}

export function sanitizeStorageFolder(folderPath: string): string {
  return (folderPath || '')
    .split('/')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== '.' && s !== '..' && !s.includes('\\'))
    .map(sanitizeStorageSegment)
    .join('/')
}

export async function uploadFileToStorage(
  file: File | Blob,
  options: {
    folder: string
    subfolder?: string
    fileName?: string
  }
): Promise<StorageUploadResult> {
  const originalName = options.fileName || (file instanceof File ? file.name : 'uploaded-file')
  const cleanName = sanitizeStorageSegment(originalName)
  const timestamp = Date.now()
  const uniqueFileName = `${timestamp}_${cleanName}`
  const folderPath = sanitizeStorageFolder(options.subfolder ? `${options.folder}/${options.subfolder}` : options.folder) || sanitizeStorageSegment(options.folder)
  const targetPath = `${folderPath}/${uniqueFileName}`

  if (typeof window !== 'undefined') {
    try {
      const formData = new FormData()
      formData.append('file', file, uniqueFileName)
      formData.append('path', targetPath)
      formData.append('bucket', STORAGE_BUCKET)
      formData.append('fileName', originalName)

      const response = await fetch('/api/storage', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (response.ok && data.success) {
        return {
          success: true,
          url: data.url,
          path: data.path,
          fileName: originalName,
          fileSize: data.fileSize || file.size,
          fileType: data.fileType || file.type
        }
      }
      return {
        success: false,
        url: '',
        path: targetPath,
        fileName: originalName,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        error: data.error || 'อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      }
    } catch (apiErr: any) {
      return {
        success: false,
        url: '',
        path: targetPath,
        fileName: originalName,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        error: apiErr?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
      }
    }
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(targetPath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        })

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(targetPath)

        return {
          success: true,
          url: publicUrlData.publicUrl,
          path: targetPath,
          fileName: originalName,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream'
        }
      }
      return {
        success: false,
        url: '',
        path: targetPath,
        fileName: originalName,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        error: uploadError.message || 'อัปโหลดไฟล์ไปยัง Supabase Storage ไม่สำเร็จ'
      }
    } catch (clientErr: any) {
      return {
        success: false,
        url: '',
        path: targetPath,
        fileName: originalName,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        error: clientErr?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase Storage'
      }
    }
  }

  return {
    success: false,
    url: '',
    path: targetPath,
    fileName: originalName,
    fileSize: file.size,
    fileType: file.type || 'application/octet-stream',
    error: 'ไม่สามารถเชื่อมต่อ Supabase Storage ได้ กรุณาตรวจสอบการตั้งค่า'
  }
}

export async function deleteFileFromStorage(storagePathOrUrl: string): Promise<StorageDeleteResult> {
  if (!storagePathOrUrl) {
    return { success: true }
  }

  if (storagePathOrUrl.startsWith('data:') || storagePathOrUrl.startsWith('https://example.com') || storagePathOrUrl.startsWith('https://images.unsplash.com') || storagePathOrUrl.startsWith('https://www.w3.org')) {
    return { success: true }
  }

  const storagePath = extractStoragePath(storagePathOrUrl)
  if (!storagePath) {
    return { success: true }
  }

  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/storage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: storagePath,
          bucket: STORAGE_BUCKET
        })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (e: any) {
      return { success: false, error: e?.message || 'ลบไฟล์ไม่สำเร็จ' }
    }
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      if (!error) {
        return { success: true }
      }
      return { success: false, error: error.message }
    } catch (e: any) {
      return { success: false, error: e?.message || 'ลบไฟล์จาก Supabase Storage ไม่สำเร็จ' }
    }
  }

  return { success: false, error: 'ไม่สามารถเชื่อมต่อ Supabase Storage ได้' }
}
