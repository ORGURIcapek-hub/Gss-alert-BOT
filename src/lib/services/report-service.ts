import { mockDashboardReports, mockNormalReports, mockEvaluations } from '@/lib/mock-data'
import { DashboardReport, DashboardReportWithDetails, ExecutiveSummaryProjectSnapshot, NormalReport, Evaluation } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall, fetchWithDeduplication, invalidateApiCache } from './service-helpers'

let inMemoryDashboardReports: DashboardReportWithDetails[] = [...mockDashboardReports]
let inMemoryNormalReports: NormalReport[] = [...mockNormalReports]
let inMemoryEvaluations: Evaluation[] = [...mockEvaluations]

export async function fetchDashboardReports(): Promise<DashboardReportWithDetails[]> {
  if (typeof window !== 'undefined') {
    try {
      const json = await fetchWithDeduplication<{ success: boolean; reports: DashboardReportWithDetails[] }>(
        '/api/dashboard-reports',
        { ttl: 2500 }
      )
      if (json?.success && Array.isArray(json.reports)) {
        inMemoryDashboardReports = json.reports
        return json.reports
      }
    } catch (e) {
      console.warn('[report-service] fetch /api/dashboard-reports failed, fallback', e)
    }
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    const data = await dbCall<DashboardReportWithDetails[]>(
      () => (supabase.from('dashboard') as any).select('*').order('created_at', { ascending: false }),
      'fetchDashboardReports'
    )
    if (data && data.length > 0) return data
  }
  return inMemoryDashboardReports
}

export async function createDashboardReport(reportData: {
  overall_okr_info: string
  okr_head_evaluation_score: number
  head_id: string
  head_name?: string
  academic_year?: number
  project_ids?: string[]
  project_snapshots?: ExecutiveSummaryProjectSnapshot[]
}): Promise<DashboardReportWithDetails> {
  const newId = crypto.randomUUID()
  const newReport: DashboardReportWithDetails = {
    dashboard_id: newId,
    overall_okr_info: reportData.overall_okr_info,
    okr_head_evaluation_score: reportData.okr_head_evaluation_score,
    head_id: reportData.head_id,
    head_name: reportData.head_name || 'หัวหน้าโครงการ OKR',
    academic_year: reportData.academic_year || 2568,
    project_ids: reportData.project_ids || [],
    project_snapshots: reportData.project_snapshots || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  invalidateApiCache('/api/dashboard-reports')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/dashboard-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...newReport
        })
      })
    } catch (e) {
      console.warn('[report-service] POST /api/dashboard-reports failed', e)
    }
  }

  inMemoryDashboardReports.unshift(newReport)
  return newReport
}

export async function fetchNormalReports(): Promise<NormalReport[]> {
  if (typeof window !== 'undefined') {
    try {
      const json = await fetchWithDeduplication<{ success: boolean; reports: NormalReport[] }>(
        '/api/normal-reports',
        { ttl: 2500 }
      )
      if (json?.success && Array.isArray(json.reports)) {
        inMemoryNormalReports = json.reports
        return json.reports
      }
    } catch (e) {
      console.warn('[report-service] fetch /api/normal-reports failed', e)
    }
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    const data = await dbCall<NormalReport[]>(
      () => (supabase.from('normal_reports') as any).select('*').order('created_at', { ascending: false }),
      'fetchNormalReports'
    )
    if (data && data.length > 0) return data
  }
  return inMemoryNormalReports
}

export async function createNormalReport(reportData: {
  project_id?: string
  project_name: string
  project_details?: string
  responsible_person_name?: string
  head_name?: string
  project_outcome?: string
  initial_expected_outcome?: string
  head_evaluation_score: number
  team_evaluation_score: number
  created_by?: string
}): Promise<NormalReport> {
  const newId = crypto.randomUUID()
  const newReport: NormalReport = {
    report_id: newId,
    project_id: reportData.project_id || null,
    project_name: reportData.project_name,
    project_details: reportData.project_details || null,
    responsible_person_name: reportData.responsible_person_name || null,
    head_name: reportData.head_name || null,
    project_outcome: reportData.project_outcome || null,
    initial_expected_outcome: reportData.initial_expected_outcome || null,
    head_evaluation_score: reportData.head_evaluation_score,
    team_evaluation_score: reportData.team_evaluation_score,
    created_by: reportData.created_by || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  invalidateApiCache('/api/normal-reports')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/normal-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...newReport })
      })
    } catch (e) {
      console.warn('[report-service] POST /api/normal-reports failed', e)
    }
  }

  inMemoryNormalReports.unshift(newReport)
  return newReport
}

function filterEvaluations(filter?: { report_id?: string; dashboard_id?: string }): Evaluation[] {
  if (filter?.report_id) {
    return inMemoryEvaluations.filter(e => e.report_id === filter.report_id)
  }
  if (filter?.dashboard_id) {
    return inMemoryEvaluations.filter(e => e.dashboard_id === filter.dashboard_id)
  }
  return inMemoryEvaluations
}

export async function fetchEvaluations(filter?: { report_id?: string; dashboard_id?: string; project_id?: string }): Promise<Evaluation[]> {
  if (typeof window !== 'undefined') {
    try {
      const json = await fetchWithDeduplication<{ success: boolean; evaluations: Evaluation[] }>(
        '/api/evaluations',
        { ttl: 2500 }
      )
      if (json?.success && Array.isArray(json.evaluations)) {
        inMemoryEvaluations = json.evaluations
      }
    } catch (e) {
      console.warn('[report-service] fetch /api/evaluations failed', e)
    }
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    let query = (supabase.from('evaluations') as any).select('*')
    if (filter?.report_id) query = query.eq('report_id', filter.report_id)
    if (filter?.dashboard_id) query = query.eq('dashboard_id', filter.dashboard_id)
    if (filter?.project_id) query = query.eq('project_id', filter.project_id)
    const data = await dbCall<Evaluation[]>(() => query, 'fetchEvaluations')
    if (data && data.length > 0) return data
  }

  if (filter?.report_id) {
    return inMemoryEvaluations.filter(e => e.report_id === filter.report_id)
  }
  if (filter?.dashboard_id) {
    return inMemoryEvaluations.filter(e => e.dashboard_id === filter.dashboard_id)
  }
  if (filter?.project_id) {
    return inMemoryEvaluations.filter(e => e.project_id === filter.project_id)
  }
  return inMemoryEvaluations
}

export function notifyEvaluationsChannel() {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('sdu_okr_sync_channel')
      channel.postMessage({ type: 'EVALUATIONS_UPDATED', timestamp: Date.now() })
      channel.close()
    }
  } catch {}
}

export async function saveEvaluationRecord(data: {
  report_id?: string | null
  dashboard_id?: string | null
  project_id?: string | null
  evaluator_id: string
  head_score: number
  team_score?: number | null
  executive_score?: number | null
}): Promise<Evaluation> {
  const clampScore = (s: number | null | undefined): number | null => {
    if (s === undefined || s === null) return null
    if (!Number.isFinite(s)) return null
    const n = Math.round(s)
    return n >= 1 && n <= 5 ? n : null
  }
  const newId = crypto.randomUUID()
  const targetKeys = (['report_id', 'dashboard_id', 'project_id'] as const).filter(k => data[k])
  const matchesTarget = (e: Evaluation) =>
    e.evaluator_id === data.evaluator_id &&
    targetKeys.length > 0 &&
    targetKeys.every(k => e[k] === data[k])
  const existingMatch = inMemoryEvaluations.find(matchesTarget)
  const incomingHead = clampScore(data.head_score)
  const inheritedHead = existingMatch ? clampScore(existingMatch.head_score) : null
  const evaluation: Evaluation = {
    eval_id: newId,
    report_id: data.report_id || null,
    dashboard_id: data.dashboard_id || null,
    project_id: data.project_id || null,
    evaluator_id: data.evaluator_id,
    head_score: incomingHead ?? inheritedHead ?? Math.min(5, Math.max(1, Math.round(data.head_score || 1))),
    team_score: clampScore(data.team_score),
    executive_score: clampScore(data.executive_score),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  invalidateApiCache('/api/evaluations')
  if (data.dashboard_id) invalidateApiCache('/api/dashboard-reports')
  if (data.report_id) invalidateApiCache('/api/normal-reports')

  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_or_update', ...evaluation })
      })
    } catch (e) {
      console.warn('[report-service] POST /api/evaluations failed', e)
    }
  }

  const existingIdx = inMemoryEvaluations.findIndex(e =>
    e.evaluator_id === evaluation.evaluator_id &&
    targetKeys.length > 0 &&
    targetKeys.every(k => e[k] === evaluation[k])
  )

  if (existingIdx !== -1) {
    evaluation.eval_id = inMemoryEvaluations[existingIdx].eval_id
    inMemoryEvaluations[existingIdx] = evaluation
  } else {
    inMemoryEvaluations.unshift(evaluation)
  }

  if (data.report_id) {
    const normalRep = inMemoryNormalReports.find(r => r.report_id === data.report_id)
    if (normalRep) {
      normalRep.head_evaluation_score = data.head_score * 20
      if (data.team_score) {
        normalRep.team_evaluation_score = data.team_score * 20
      }
    }
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/normal-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_scores',
            report_id: data.report_id,
            head_evaluation_score: evaluation.head_score * 20,
            team_evaluation_score: evaluation.team_score !== null ? evaluation.team_score * 20 : undefined
          })
        })
      } catch (e) {
        console.warn('[report-service] POST /api/normal-reports update_scores failed', e)
      }
    }
  }

  if (data.dashboard_id) {
    const dashRep = inMemoryDashboardReports.find(d => d.dashboard_id === data.dashboard_id)
    const effectiveScore = data.executive_score !== null && data.executive_score !== undefined
      ? data.executive_score * 20
      : data.head_score * 20
    if (dashRep) {
      dashRep.okr_head_evaluation_score = effectiveScore
    }
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/dashboard-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rate',
            dashboard_id: data.dashboard_id,
            score: effectiveScore
          })
        })
        invalidateApiCache('/api/dashboard-reports')
      } catch (e) {
        console.warn('[report-service] rate call failed', e)
      }
    }
  }

  notifyEvaluationsChannel()
  return evaluation
}

export function removeProjectReportsInMemory(projectId: string) {
  const deletedReportIds = new Set(
    inMemoryNormalReports.filter(r => r.project_id === projectId).map(r => r.report_id)
  )
  inMemoryNormalReports = inMemoryNormalReports.filter(r => r.project_id !== projectId)
  inMemoryEvaluations = inMemoryEvaluations.filter(e =>
    e.project_id !== projectId && (!e.report_id || !deletedReportIds.has(e.report_id))
  )
  inMemoryDashboardReports = inMemoryDashboardReports.map(d => ({
    ...d,
    project_ids: (d.project_ids || []).filter(id => id !== projectId),
    project_snapshots: (d.project_snapshots || []).filter(s => s.project_id !== projectId)
  }))
}

export function clearAllReportsInMemory() {
  inMemoryNormalReports = []
  inMemoryEvaluations = []
  inMemoryDashboardReports = inMemoryDashboardReports.map(d => ({
    ...d,
    project_ids: [],
    project_snapshots: []
  }))
}
