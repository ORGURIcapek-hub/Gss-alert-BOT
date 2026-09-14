import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { Evaluation } from '@/types/database.types'
import { writeJsonAtomic, readJsonSafe } from '@/lib/atomic-storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-evaluations.json')

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
  if (memoryCache) return memoryCache

  const fallback: EvaluationsStorageSchema = { evaluations: [] }
  const data = await readJsonSafe<EvaluationsStorageSchema | null>(FILE_PATH, null)
  if (data && Array.isArray(data.evaluations)) {
    memoryCache = { evaluations: data.evaluations }
    return memoryCache
  }

  if (memoryCache) return memoryCache

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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
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
          }
        }
      }
    } catch (e) {
      console.warn('[api/evaluations] Supabase GET failed', e)
    }
  }

  evaluations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return NextResponse.json({ success: true, evaluations })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...evalData } = body
    const storage = await ensureDataFile()

    if (action === 'create_or_update') {
      const existingIdx = storage.evaluations.findIndex(e =>
        e.evaluator_id === evalData.evaluator_id && (
          (evalData.report_id && e.report_id === evalData.report_id) ||
          (evalData.dashboard_id && e.dashboard_id === evalData.dashboard_id) ||
          (evalData.project_id && e.project_id === evalData.project_id)
        )
      )

      let newEv: Evaluation
      if (existingIdx !== -1) {
        const prev = storage.evaluations[existingIdx]
        newEv = {
          ...prev,
          ...evalData,
          head_score: evalData.head_score !== undefined ? evalData.head_score : prev.head_score,
          team_score: evalData.team_score !== undefined ? evalData.team_score : prev.team_score,
          executive_score: evalData.executive_score !== undefined ? evalData.executive_score : prev.executive_score,
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
          head_score: evalData.head_score ?? 0,
          team_score: evalData.team_score ?? null,
          executive_score: evalData.executive_score ?? null,
          created_at: evalData.created_at || new Date().toISOString()
        }
        storage.evaluations.unshift(newEv)
      }

      await saveEvaluationsFile(storage)

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          if (existingIdx !== -1) {
            await supabase.from('evaluations').update(newEv).eq('eval_id', newEv.eval_id)
          } else {
            await supabase.from('evaluations').insert(newEv)
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
