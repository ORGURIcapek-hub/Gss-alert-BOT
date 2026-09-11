import { mockDashboardReports, mockNormalReports, mockEvaluations } from '@/lib/mock-data'
import { DashboardReport, DashboardReportWithDetails, ExecutiveSummaryProjectSnapshot, NormalReport, Evaluation } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall } from './service-helpers'

let inMemoryDashboardReports: DashboardReportWithDetails[] = [...mockDashboardReports]
let inMemoryNormalReports: NormalReport[] = [...mockNormalReports]
let inMemoryEvaluations: Evaluation[] = [...mockEvaluations]

/** Fetch dashboard reports with persistent API integration */
export async function fetchDashboardReports(): Promise<DashboardReportWithDetails[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/dashboard-reports')
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.reports)) {
          inMemoryDashboardReports = json.reports
          return json.reports
        }
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

/** Create a dashboard report with project snapshots */
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
    academic_year: reportData.academic_year || 2567,
    project_ids: reportData.project_ids || [],
    project_snapshots: reportData.project_snapshots || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // 1. Post to persistent API route
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

  // 2. Supabase insert if available
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('dashboard') as any).insert({
      dashboard_id: newReport.dashboard_id,
      overall_okr_info: newReport.overall_okr_info,
      okr_head_evaluation_score: newReport.okr_head_evaluation_score,
      head_id: newReport.head_id,
      head_name: newReport.head_name,
      academic_year: newReport.academic_year,
      created_at: newReport.created_at,
      updated_at: newReport.updated_at
    }), 'createDashboardReport')
  }

  inMemoryDashboardReports.unshift(newReport)
  return newReport
}


/** Fetch normal reports */
export async function fetchNormalReports(): Promise<NormalReport[]> {
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

/** Create a normal operational report */
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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('normal_reports') as any).insert(newReport), 'createNormalReport')
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

/** Fetch 1-5 star evaluations */
export async function fetchEvaluations(filter?: { report_id?: string; dashboard_id?: string }): Promise<Evaluation[]> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    let query = (supabase.from('evaluations') as any).select('*')
    if (filter?.report_id) query = query.eq('report_id', filter.report_id)
    if (filter?.dashboard_id) query = query.eq('dashboard_id', filter.dashboard_id)
    const data = await dbCall<Evaluation[]>(() => query, 'fetchEvaluations')
    if (data && data.length > 0) return data
  }
  return filterEvaluations(filter)
}

/** Save or update 1-5 star evaluation record */
export async function saveEvaluationRecord(data: {
  report_id?: string | null
  dashboard_id?: string | null
  evaluator_id: string
  head_score: number
  team_score?: number | null
}): Promise<Evaluation> {
  const newId = crypto.randomUUID()
  const evaluation: Evaluation = {
    eval_id: newId,
    report_id: data.report_id || null,
    dashboard_id: data.dashboard_id || null,
    evaluator_id: data.evaluator_id,
    head_score: data.head_score,
    team_score: data.team_score !== undefined ? data.team_score : null,
    created_at: new Date().toISOString()
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evaluations') as any).insert(evaluation), 'saveEvaluationRecord')
  }

  const existingIdx = inMemoryEvaluations.findIndex(e =>
    (data.report_id && e.report_id === data.report_id) ||
    (data.dashboard_id && e.dashboard_id === data.dashboard_id)
  )

  if (existingIdx !== -1) {
    inMemoryEvaluations[existingIdx] = evaluation
  } else {
    inMemoryEvaluations.unshift(evaluation)
  }

  // Update parent report scores if normal report
  if (data.report_id) {
    const normalRep = inMemoryNormalReports.find(r => r.report_id === data.report_id)
    if (normalRep) {
      normalRep.head_evaluation_score = data.head_score * 20
      if (data.team_score) {
        normalRep.team_evaluation_score = data.team_score * 20
      }
    }
  }

  if (data.dashboard_id) {
    const dashRep = inMemoryDashboardReports.find(d => d.dashboard_id === data.dashboard_id)
    if (dashRep) {
      dashRep.okr_head_evaluation_score = data.head_score * 20
    }
    if (typeof window !== 'undefined') {
      try {
        fetch('/api/dashboard-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rate',
            dashboard_id: data.dashboard_id,
            score: data.head_score * 20
          })
        }).catch(e => console.warn('[report-service] rate sync error', e))
      } catch (e) {
        console.warn('[report-service] rate call failed', e)
      }
    }
  }

  return evaluation
}
