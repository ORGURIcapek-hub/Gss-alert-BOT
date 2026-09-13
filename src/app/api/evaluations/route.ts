import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Evaluation } from '@/types/database.types'

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

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (fs.existsSync(FILE_PATH)) {
      const content = await fs.promises.readFile(FILE_PATH, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.evaluations)) {
        memoryCache = { evaluations: parsed.evaluations }
        return memoryCache
      }
    }

    const initialData: EvaluationsStorageSchema = { evaluations: [] }
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8')
    memoryCache = initialData
    return memoryCache
  } catch (err) {
    console.error('[api/evaluations] Error ensuring data file:', err)
    return { evaluations: [] }
  }
}

async function saveEvaluationsFile(data: EvaluationsStorageSchema): Promise<void> {
  memoryCache = data
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
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
            // Merge newer values
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
        (evalData.report_id && e.report_id === evalData.report_id) ||
        (evalData.dashboard_id && e.dashboard_id === evalData.dashboard_id) ||
        (evalData.project_id && e.project_id === evalData.project_id) // For executive scores linked to project
      )

      let newEv: Evaluation
      if (existingIdx !== -1) {
        newEv = { ...storage.evaluations[existingIdx], ...evalData, updated_at: new Date().toISOString() }
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
