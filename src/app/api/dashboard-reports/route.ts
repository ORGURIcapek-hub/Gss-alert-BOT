import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { DashboardReportWithDetails } from '@/types/database.types'
import { writeJsonAtomic, readJsonSafe } from '@/lib/atomic-storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-dashboard-reports.json')

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

interface ReportsStorageSchema {
  reports: DashboardReportWithDetails[]
}

let memoryCache: ReportsStorageSchema | null = null

async function ensureDataFile(): Promise<ReportsStorageSchema> {
  if (memoryCache) return memoryCache

  const fallback: ReportsStorageSchema = { reports: [] }
  const data = await readJsonSafe<ReportsStorageSchema | null>(FILE_PATH, null)
  if (data && Array.isArray(data.reports)) {
    memoryCache = { reports: data.reports }
    return memoryCache
  }

  if (memoryCache) return memoryCache

  await writeJsonAtomic(FILE_PATH, fallback)
  memoryCache = fallback
  return memoryCache
}

async function saveReportsFile(data: ReportsStorageSchema): Promise<void> {
  memoryCache = data
  try {
    await writeJsonAtomic(FILE_PATH, data)
  } catch (err) {
    console.error('[api/dashboard-reports] Error writing reports file:', err)
  }
}

export async function GET() {
  const storage = await ensureDataFile()
  let reports = [...storage.reports]

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { data } = await supabase
        .from('dashboard')
        .select('*')
        .order('created_at', { ascending: false })

      if (data && Array.isArray(data)) {
        const localMap = new Map(reports.map(r => [r.dashboard_id, r]))
        for (const item of data) {
          if (!localMap.has(item.dashboard_id)) {
            reports.push(item)
          } else {

            const local = localMap.get(item.dashboard_id)!
            local.okr_head_evaluation_score = item.okr_head_evaluation_score ?? local.okr_head_evaluation_score
          }
        }
      }
    } catch (e) {
      console.warn('[api/dashboard-reports] Supabase GET fallback to file', e)
    }
  }

  reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ success: true, reports })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    const storage = await ensureDataFile()

    if (action === 'create') {
      const newReport: DashboardReportWithDetails = {
        dashboard_id: body.dashboard_id || crypto.randomUUID(),
        overall_okr_info: body.overall_okr_info || '',
        okr_head_evaluation_score: body.okr_head_evaluation_score ?? 80,
        head_id: body.head_id || null,
        head_name: body.head_name || 'หัวหน้าโครงการ OKR',
        academic_year: body.academic_year || 2568,
        project_ids: Array.isArray(body.project_ids) ? body.project_ids : [],
        project_snapshots: Array.isArray(body.project_snapshots) ? body.project_snapshots : [],
        created_at: body.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      storage.reports.unshift(newReport)
      await saveReportsFile(storage)

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          await supabase.from('dashboard').insert({
            dashboard_id: newReport.dashboard_id,
            overall_okr_info: newReport.overall_okr_info,
            okr_head_evaluation_score: newReport.okr_head_evaluation_score,
            head_id: newReport.head_id,
            head_name: newReport.head_name,
            academic_year: newReport.academic_year,
            created_at: newReport.created_at,
            updated_at: newReport.updated_at
          })
        } catch (e) {
          console.warn('[api/dashboard-reports] Supabase insert failed', e)
        }
      }

      return NextResponse.json({ success: true, report: newReport })
    }

    if (action === 'rate') {
      const { dashboard_id, score } = body
      if (!dashboard_id) {
        return NextResponse.json({ success: false, error: 'Missing dashboard_id' }, { status: 400 })
      }
      const numericScore = Number(score)
      if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
        return NextResponse.json({ success: false, error: 'คะแนนต้องอยู่ระหว่าง 0-100' }, { status: 400 })
      }
      const found = storage.reports.find(r => r.dashboard_id === dashboard_id)
      if (!found) {
        return NextResponse.json({ success: false, error: 'ไม่พบรายงานที่ระบุ' }, { status: 404 })
      }
      found.okr_head_evaluation_score = numericScore
      found.updated_at = new Date().toISOString()
      await saveReportsFile(storage)

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          await supabase
            .from('dashboard')
            .update({ okr_head_evaluation_score: numericScore, updated_at: found.updated_at })
            .eq('dashboard_id', dashboard_id)
        } catch (e) {
          console.warn('[api/dashboard-reports] Supabase rate update failed', e)
        }
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      const { dashboard_id } = body
      if (!dashboard_id) {
        return NextResponse.json({ success: false, error: 'Missing dashboard_id' }, { status: 400 })
      }
      storage.reports = storage.reports.filter(r => r.dashboard_id !== dashboard_id)
      await saveReportsFile(storage)

      try {
        const evalPath = path.join(DATA_DIR, 'persisted-evaluations.json')
        const evalData = await readJsonSafe<{ evaluations: any[] } | null>(evalPath, null)
        if (evalData && Array.isArray(evalData.evaluations)) {
          evalData.evaluations = evalData.evaluations.filter(e => e.dashboard_id !== dashboard_id)
          await writeJsonAtomic(evalPath, evalData)
        }
      } catch {}

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          await supabase.from('dashboard').delete().eq('dashboard_id', dashboard_id)
        } catch (e) {
          console.warn('[api/dashboard-reports] Supabase delete failed', e)
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[api/dashboard-reports] POST error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 })
  }
}
