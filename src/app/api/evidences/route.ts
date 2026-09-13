import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { EvidenceSubmission } from '@/types/database.types'

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-evidences.json')

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

interface EvidencesStorageSchema {
  evidences: EvidenceSubmission[]
}

let memoryCache: EvidencesStorageSchema | null = null

async function ensureDataFile(): Promise<EvidencesStorageSchema> {
  if (memoryCache) return memoryCache

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (fs.existsSync(FILE_PATH)) {
      const content = await fs.promises.readFile(FILE_PATH, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.evidences)) {
        memoryCache = { evidences: parsed.evidences }
        return memoryCache
      }
    }

    const initialData: EvidencesStorageSchema = { evidences: [] }
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8')
    memoryCache = initialData
    return memoryCache
  } catch (err) {
    console.error('[api/evidences] Error ensuring data file:', err)
    return { evidences: [] }
  }
}

async function saveEvidencesFile(data: EvidencesStorageSchema): Promise<void> {
  memoryCache = data
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('[api/evidences] Error writing file:', err)
  }
}

export async function GET() {
  const storage = await ensureDataFile()
  let evidences = [...storage.evidences]

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { data } = await supabase.from('evidence_submissions').select('*').order('submitted_at', { ascending: false })
      if (data && Array.isArray(data)) {
        const localMap = new Map(evidences.map(e => [e.evidence_id, e]))
        for (const item of data) {
          if (!localMap.has(item.evidence_id)) {
            evidences.push(item)
          }
        }
      }
    } catch (e) {
      console.warn('[api/evidences] Supabase GET failed', e)
    }
  }

  evidences.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
  return NextResponse.json({ success: true, evidences })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...evData } = body
    const storage = await ensureDataFile()

    if (action === 'create') {
      const newEv: EvidenceSubmission = {
        evidence_id: evData.evidence_id || crypto.randomUUID(),
        project_id: evData.project_id,
        sender_id: evData.sender_id || null,
        file_name: evData.file_name || '',
        file_path: evData.file_path || '',
        file_type: evData.file_type || '',
        description: evData.description || null,
        submitted_at: evData.submitted_at || new Date().toISOString()
      }

      storage.evidences.unshift(newEv)
      await saveEvidencesFile(storage)

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          await supabase.from('evidence_submissions').insert(newEv)
        } catch (e) {
          console.warn('[api/evidences] Supabase insert failed', e)
        }
      }

      return NextResponse.json({ success: true, evidence: newEv })
    }

    if (action === 'delete') {
      const { evidence_id } = body
      storage.evidences = storage.evidences.filter(e => e.evidence_id !== evidence_id)
      await saveEvidencesFile(storage)

      const supabase = getSafeSupabaseClient()
      if (supabase) {
        try {
          await supabase.from('evidence_submissions').delete().eq('evidence_id', evidence_id)
        } catch (e) {
          console.warn('[api/evidences] Supabase delete failed', e)
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
