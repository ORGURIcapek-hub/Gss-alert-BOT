import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { OKR } from '@/types/database.types'
import { writeJsonAtomic, readJsonSafe } from '@/lib/atomic-storage'
import { mockOKRs } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-okrs.json')

function getSafeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const { createClient } = require('@supabase/supabase-js')
    return createClient(url, key)
  } catch {
    return null
  }
}

interface OKRStorageSchema {
  okrs: OKR[]
}

let memoryCache: OKRStorageSchema | null = null
let memoryCacheAt = 0
const MEMORY_CACHE_TTL = 5000

async function ensureDataFile(): Promise<OKRStorageSchema> {
  if (memoryCache && Date.now() - memoryCacheAt < MEMORY_CACHE_TTL) return memoryCache

  const fallback: OKRStorageSchema = { okrs: [...mockOKRs] }
  const data = await readJsonSafe<OKRStorageSchema | null>(FILE_PATH, null)
  if (data && Array.isArray(data.okrs)) {
    memoryCache = { okrs: data.okrs }
    memoryCacheAt = Date.now()
    return memoryCache
  }

  if (memoryCache) return memoryCache

  await writeJsonAtomic(FILE_PATH, fallback)
  memoryCache = fallback
  memoryCacheAt = Date.now()
  return memoryCache
}

async function saveStorage(data: OKRStorageSchema): Promise<void> {
  memoryCache = data
  memoryCacheAt = Date.now()
  if (process.env.VERCEL) return
  try {
    await writeJsonAtomic(FILE_PATH, data)
  } catch (err) {
    console.warn('[api/okrs] Error saving storage:', err)
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const yearParam = searchParams.get('year')
    const year = yearParam ? parseInt(yearParam, 10) : undefined

    const storage = await ensureDataFile()
    const supabase = getSafeSupabaseClient()

    if (supabase) {
      try {
        let query = (supabase.from('okrs') as any).select('*')
        if (year) query = query.eq('year', year)
        const { data, error } = await query.order('created_at', { ascending: false })
        if (!error && data && data.length > 0) {
          const remoteIds = new Set(data.map((o: any) => o.okr_id))
          const localOnly = storage.okrs.filter(o => !remoteIds.has(o.okr_id))
          const merged = [...data, ...localOnly]
          storage.okrs = merged
          await saveStorage(storage)
          return NextResponse.json({ success: true, okrs: year ? merged.filter(o => o.year === year) : merged })
        }
      } catch (e) {
        console.warn('[api/okrs] Supabase GET error:', e)
      }
    }

    const filtered = year ? storage.okrs.filter(o => o.year === year) : storage.okrs
    return NextResponse.json({ success: true, okrs: filtered })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch OKRs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    const storage = await ensureDataFile()
    const supabase = getSafeSupabaseClient()

    if (action === 'create' || !action) {
      const okrData = body.okr || body
      if (!okrData.okr_title) {
        return NextResponse.json({ success: false, error: 'Missing okr_title' }, { status: 400 })
      }

      const now = new Date().toISOString()
      const validQuarters = ['Q1', 'Q2', 'Q3', 'Q4']
      const normalizedQuarter = validQuarters.includes(okrData.quarter) ? okrData.quarter : null
      const newOKR: OKR = {
        okr_id: okrData.okr_id || crypto.randomUUID(),
        okr_title: okrData.okr_title,
        okr_type: okrData.okr_type || 'ยุทธศาสตร์คณะ',
        year: Number(okrData.year) || 2567,
        quarter: normalizedQuarter,
        status: okrData.status || 'In Progress',
        created_by: okrData.created_by || null,
        created_at: okrData.created_at || now,
        updated_at: now
      }

      storage.okrs = [newOKR, ...storage.okrs.filter(o => o.okr_id !== newOKR.okr_id)]
      await saveStorage(storage)

      if (supabase) {
        try {
          await (supabase.from('okrs') as any).upsert(newOKR)
        } catch (e) {
          console.warn('[api/okrs] Supabase upsert failed:', e)
        }
      }

      return NextResponse.json({ success: true, okr: newOKR })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
}
