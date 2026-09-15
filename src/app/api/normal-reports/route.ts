import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { NormalReport } from '@/types/database.types'
import { writeJsonAtomic, readJsonSafe } from '@/lib/atomic-storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-normal-reports.json')
const PROJECTS_FILE_PATH = path.join(DATA_DIR, 'persisted-projects.json')

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

interface NormalReportsStorageSchema {
  reports: NormalReport[]
}

let memoryCache: NormalReportsStorageSchema | null = null

async function ensureDataFile(): Promise<NormalReportsStorageSchema> {
  const data = await readJsonSafe<NormalReportsStorageSchema | null>(FILE_PATH, null)
  if (data && Array.isArray(data.reports)) {
    memoryCache = { reports: data.reports }
    return memoryCache
  }

  if (memoryCache) return memoryCache

  const fallback: NormalReportsStorageSchema = { reports: [] }
  await writeJsonAtomic(FILE_PATH, fallback)
  memoryCache = fallback
  return memoryCache
}

async function saveReportsFile(data: NormalReportsStorageSchema): Promise<void> {
  memoryCache = data
  try {
    await writeJsonAtomic(FILE_PATH, data)
  } catch (err) {
    console.error('[api/normal-reports] Error writing reports file:', err)
  }
}

export async function GET() {
  const storage = await ensureDataFile()
  let reports = [...storage.reports]

  const projectsData = await readJsonSafe<any>(PROJECTS_FILE_PATH, null)
  const deletedProjectIds = new Set<string>(Array.isArray(projectsData?.deletedProjectIds) ? projectsData.deletedProjectIds : [])

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { data } = await supabase
        .from('normal_reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (data && Array.isArray(data)) {
        const localMap = new Map(reports.map(r => [r.report_id, r]))
        for (const item of data) {
          if (!localMap.has(item.report_id)) {
            reports.push(item)
          }
        }
      }
    } catch (e) {
      console.warn('[api/normal-reports] Supabase GET fallback to file', e)
    }
  }

  if (deletedProjectIds.size > 0) {
    reports = reports.filter(r => !r.project_id || !deletedProjectIds.has(r.project_id))
  }

  reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ success: true, reports })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...reportData } = body
    const storage = await ensureDataFile()

    if (action === 'create') {
      const newReport: NormalReport = {
        report_id: reportData.report_id || crypto.randomUUID(),
        project_id: reportData.project_id || null,
        project_name: reportData.project_name || '',
        project_details: reportData.project_details || null,
        responsible_person_name: reportData.responsible_person_name || null,
        head_name: reportData.head_name || null,
        project_outcome: reportData.project_outcome || null,
        initial_expected_outcome: reportData.initial_expected_outcome || null,
        head_evaluation_score: reportData.head_evaluation_score ?? 0,
        team_evaluation_score: reportData.team_evaluation_score ?? 0,
        created_by: reportData.created_by || null,
        created_at: reportData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      storage.reports.unshift(newReport)
      await saveReportsFile(storage)

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          await supabase.from('normal_reports').insert(newReport)
        } catch (e) {
          console.warn('[api/normal-reports] Supabase insert failed', e)
        }
      }

      return NextResponse.json({ success: true, report: newReport })
    }

    if (action === 'delete') {
      const { report_id } = body
      storage.reports = storage.reports.filter(r => r.report_id !== report_id)
      await saveReportsFile(storage)

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          await supabase.from('normal_reports').delete().eq('report_id', report_id)
        } catch (e) {
          console.warn('[api/normal-reports] Supabase delete failed', e)
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[api/normal-reports] POST error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
