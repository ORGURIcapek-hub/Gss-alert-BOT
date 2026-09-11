import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { DashboardReportWithDetails } from '@/types/database.types'

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

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (fs.existsSync(FILE_PATH)) {
      const content = await fs.promises.readFile(FILE_PATH, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.reports)) {
        memoryCache = {
          reports: parsed.reports
        }
        return memoryCache
      }
    }

    const initialData: ReportsStorageSchema = {
      reports: []
    }

    await fs.promises.writeFile(FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8')
    memoryCache = initialData
    return memoryCache
  } catch (err) {
    console.error('[api/dashboard-reports] Error ensuring data file:', err)
    return { reports: [] }
  }
}

async function saveReportsFile(data: ReportsStorageSchema): Promise<void> {
  memoryCache = data
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('[api/dashboard-reports] Error writing reports file:', err)
  }
}

export async function GET() {
  const storage = await ensureDataFile()
  let reports = [...storage.reports]

  // If Supabase is configured, also fetch from Supabase and merge
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
            // merge supabase score if updated
            const local = localMap.get(item.dashboard_id)!
            local.okr_head_evaluation_score = item.okr_head_evaluation_score ?? local.okr_head_evaluation_score
          }
        }
      }
    } catch (e) {
      console.warn('[api/dashboard-reports] Supabase GET fallback to file', e)
    }
  }

  // Sort descending
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
        academic_year: body.academic_year || 2567,
        project_ids: Array.isArray(body.project_ids) ? body.project_ids : [],
        project_snapshots: Array.isArray(body.project_snapshots) ? body.project_snapshots : [],
        created_at: body.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      storage.reports.unshift(newReport)
      await saveReportsFile(storage)

      // Supabase insert if available
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
      const found = storage.reports.find(r => r.dashboard_id === dashboard_id)
      if (found) {
        found.okr_head_evaluation_score = score
        found.updated_at = new Date().toISOString()
        await saveReportsFile(storage)

        const supabase = getSafeSupabaseClient()
        if (supabase) {
          try {
            await supabase
              .from('dashboard')
              .update({ okr_head_evaluation_score: score, updated_at: found.updated_at })
              .eq('dashboard_id', dashboard_id)
          } catch (e) {
            console.warn('[api/dashboard-reports] Supabase rate update failed', e)
          }
        }
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      const { dashboard_id } = body
      storage.reports = storage.reports.filter(r => r.dashboard_id !== dashboard_id)
      await saveReportsFile(storage)

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

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[api/dashboard-reports] POST error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
