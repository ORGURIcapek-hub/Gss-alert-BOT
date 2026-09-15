import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { Evaluation } from '@/types/database.types'
import { writeJsonAtomic, readJsonSafe } from '@/lib/atomic-storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-evaluations.json')
const PROJECTS_FILE_PATH = path.join(DATA_DIR, 'persisted-projects.json')
const NORMAL_REPORTS_FILE_PATH = path.join(DATA_DIR, 'persisted-normal-reports.json')

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

interface EvaluationsStorageSchema {
  evaluations: Evaluation[]
}

let memoryCache: EvaluationsStorageSchema | null = null

async function ensureDataFile(): Promise<EvaluationsStorageSchema> {
  const data = await readJsonSafe<EvaluationsStorageSchema | null>(FILE_PATH, null)
  if (data && Array.isArray(data.evaluations)) {
    memoryCache = { evaluations: data.evaluations }
    return memoryCache
  }

  if (memoryCache) return memoryCache

  const fallback: EvaluationsStorageSchema = { evaluations: [] }
  await writeJsonAtomic(FILE_PATH, fallback)
  memoryCache = fallback
  return memoryCache
}

async function saveEvaluationsFile(data: EvaluationsStorageSchema): Promise<void> {
  memoryCache = data
  try {
    await writeJsonAtomic(FILE_PATH, data)
  } catch (err) {
    console.error('[api/evaluations] Error writing file:', err)
  }
}

export async function GET() {
  const storage = await ensureDataFile()
  let evaluations = [...storage.evaluations]

  const projectsData = await readJsonSafe<any>(PROJECTS_FILE_PATH, null)
  const deletedProjectIds = new Set<string>(Array.isArray(projectsData?.deletedProjectIds) ? projectsData.deletedProjectIds : [])

  const reportsData = await readJsonSafe<any>(NORMAL_REPORTS_FILE_PATH, null)
  const validReportIds = new Set<string>(
    Array.isArray(reportsData?.reports)
      ? reportsData.reports.filter((r: any) => !r.project_id || !deletedProjectIds.has(r.project_id)).map((r: any) => r.report_id)
      : []
  )

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { data: remoteReports } = await supabase.from('normal_reports').select('report_id, project_id')
      if (remoteReports && Array.isArray(remoteReports)) {
        for (const r of remoteReports) {
          if (!r.project_id || !deletedProjectIds.has(r.project_id)) {
            validReportIds.add(r.report_id)
          }
        }
      }
    } catch (e) {
      console.warn('[api/evaluations] Supabase reports lookup failed', e)
    }
    try {
      const { data } = await supabase.from('evaluations').select('*').order('created_at', { ascending: false })
      if (data && Array.isArray(data)) {
        const localMap = new Map(evaluations.map(e => [e.eval_id, e]))
        for (const item of data) {
          if (!localMap.has(item.eval_id)) {
            evaluations.push(item)
          } else {
            const local = localMap.get(item.eval_id)!
            local.head_score = item.head_score ?? local.head_score
            local.team_score = item.team_score ?? local.team_score
            local.executive_score = item.executive_score ?? local.executive_score
            local.project_id = item.project_id ?? local.project_id
            local.updated_at = item.updated_at ?? local.updated_at
          }
        }
      }
    } catch (e) {
      console.warn('[api/evaluations] Supabase GET failed', e)
    }
  }

  evaluations = evaluations.filter(e => {
    if (e.project_id && deletedProjectIds.has(e.project_id)) return false
    if (e.report_id && reportsData?.reports && !validReportIds.has(e.report_id)) return false
    return true
  })

  const newestByTarget = new Map<string, Evaluation>()
  for (const e of evaluations) {
    const key = `${e.evaluator_id || ''}|${e.report_id || ''}|${e.dashboard_id || ''}|${e.project_id || ''}`
    const prev = newestByTarget.get(key)
    if (!prev) {
      newestByTarget.set(key, e)
    } else {
      const prevTime = new Date(prev.updated_at || prev.created_at).getTime()
      const curTime = new Date(e.updated_at || e.created_at).getTime()
      if (curTime >= prevTime) newestByTarget.set(key, e)
    }
  }
  evaluations = Array.from(newestByTarget.values())

  evaluations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return NextResponse.json({ success: true, evaluations })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...evalData } = body
    const storage = await ensureDataFile()

    if (action === 'create_or_update') {
      if (!evalData.report_id && !evalData.dashboard_id && !evalData.project_id) {
        return NextResponse.json({ error: 'ต้องระบุรายงานหรือโครงการที่ประเมิน' }, { status: 400 })
      }
      const clampScore = (s: unknown): number | null => {
        if (s === undefined || s === null) return null
        const n = Math.round(Number(s))
        if (!Number.isFinite(n)) return null
        return Math.min(5, Math.max(1, n))
      }
      const headScore = clampScore(evalData.head_score)
      if (headScore === null) {
        return NextResponse.json({ error: 'ต้องระบุคะแนนหัวข้อหลัก 1-5' }, { status: 400 })
      }
      const teamScore = clampScore(evalData.team_score)
      const executiveScore = clampScore(evalData.executive_score)
      const targetKeys = (['report_id', 'dashboard_id', 'project_id'] as const).filter(k => evalData[k])
      const matchesTarget = (e: Evaluation) =>
        e.evaluator_id === evalData.evaluator_id &&
        targetKeys.length > 0 &&
        targetKeys.every(k => e[k] === evalData[k])
      const existingIdx = storage.evaluations.findIndex(matchesTarget)

      let newEv: Evaluation
      if (existingIdx !== -1) {
        const prev = storage.evaluations[existingIdx]
        newEv = {
          ...prev,
          eval_id: prev.eval_id,
          report_id: prev.report_id,
          dashboard_id: prev.dashboard_id,
          project_id: prev.project_id,
          evaluator_id: prev.evaluator_id,
          created_at: prev.created_at,
          head_score: headScore,
          team_score: evalData.team_score !== undefined ? teamScore : prev.team_score,
          executive_score: evalData.executive_score !== undefined ? executiveScore : prev.executive_score,
          updated_at: new Date().toISOString()
        }
        storage.evaluations[existingIdx] = newEv
      } else {
        newEv = {
          eval_id: evalData.eval_id || crypto.randomUUID(),
          report_id: evalData.report_id || null,
          dashboard_id: evalData.dashboard_id || null,
          project_id: evalData.project_id || null,
          evaluator_id: evalData.evaluator_id || null,
          head_score: headScore,
          team_score: teamScore,
          executive_score: executiveScore,
          created_at: evalData.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        storage.evaluations.unshift(newEv)
      }

      await saveEvaluationsFile(storage)

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          const evaluationRow = {
            eval_id: newEv.eval_id,
            report_id: newEv.report_id,
            dashboard_id: newEv.dashboard_id,
            project_id: newEv.project_id,
            evaluator_id: newEv.evaluator_id,
            head_score: newEv.head_score,
            team_score: newEv.team_score,
            executive_score: newEv.executive_score,
            updated_at: newEv.updated_at || new Date().toISOString()
          }
          if (existingIdx !== -1) {
            await supabase.from('evaluations').upsert(evaluationRow, { onConflict: 'eval_id' })
          } else {
            await supabase.from('evaluations').insert(evaluationRow)
          }
        } catch (e) {
          console.warn('[api/evaluations] Supabase ops failed', e)
        }
      }

      return NextResponse.json({ success: true, evaluation: newEv })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
