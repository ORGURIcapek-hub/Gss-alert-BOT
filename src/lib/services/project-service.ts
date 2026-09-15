import { mockOKRs, mockProjects } from '@/lib/mock-data'
import { OKR, OKRQuarter, ProjectWithHeadAndAssignees, ProjectStatus } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall, getCachedUsers, fetchWithDeduplication, invalidateApiCache } from './service-helpers'
import { getInMemoryUsers } from './user-service'
import { removeProjectReportsInMemory, clearAllReportsInMemory, notifyEvaluationsChannel } from './report-service'

const PROJECTS_CACHE_KEY = 'sdu_okr_projects_cache'

export function getCachedProjects(): ProjectWithHeadAndAssignees[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROJECTS_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setCachedProjects(projects: ProjectWithHeadAndAssignees[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(projects))
  } catch {}
}

export function notifyProjectsChannel() {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('sdu_okr_sync_channel')
      channel.postMessage({ type: 'PROJECTS_UPDATED', timestamp: Date.now() })
      channel.close()
    }
  } catch {}
}

export function notifyOKRsChannel() {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('sdu_okr_sync_channel')
      channel.postMessage({ type: 'OKRS_UPDATED', timestamp: Date.now() })
      channel.close()
    }
  } catch {}
}

let inMemoryOKRs: OKR[] = [...mockOKRs]
let inMemoryProjects: ProjectWithHeadAndAssignees[] = [...mockProjects]

export function getInMemoryProjects(): ProjectWithHeadAndAssignees[] {
  return inMemoryProjects
}

export function setInMemoryProjects(projects: ProjectWithHeadAndAssignees[]): void {
  inMemoryProjects = projects
  setCachedProjects(projects)
}

export function enrichProjectWithOverdue(project: ProjectWithHeadAndAssignees): ProjectWithHeadAndAssignees {
  let isOverdue = false
  let daysOverdue = 0
  let daysRemaining = 0
  let effectiveStatus: ProjectStatus = project.status || 'In Progress'

  if (project.end_date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(project.end_date)
    dueDate.setHours(0, 0, 0, 0)

    if (!isNaN(dueDate.getTime())) {
      const diffMs = dueDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays < 0 && project.progress_percentage < 100) {
        isOverdue = true
        daysOverdue = Math.abs(diffDays)
        effectiveStatus = 'Delayed'
      } else if (diffDays >= 0) {
        daysRemaining = diffDays
      }
    }
  }

  if (project.progress_percentage === 100) {
    effectiveStatus = 'Completed'
  }

  return {
    ...project,
    isOverdue,
    daysOverdue,
    daysRemaining,
    status: effectiveStatus,
    year: project.okr?.year || null,
    quarter: project.okr?.quarter || null
  }
}

export async function fetchOKRs(year?: number): Promise<OKR[]> {
  if (typeof window !== 'undefined') {
    try {
      const url = year ? `/api/okrs?year=${year}` : '/api/okrs'
      const data = await fetchWithDeduplication<{ success: boolean; okrs: OKR[] }>(url, { ttl: 2500 })
      if (data?.success && Array.isArray(data.okrs)) {
        inMemoryOKRs = data.okrs
        return data.okrs
      }
    } catch {}
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    let query = (supabase.from('okrs') as any).select('*')
    if (year) query = query.eq('year', year)
    const data = await dbCall<OKR[]>(() => query.order('created_at', { ascending: false }), 'fetchOKRs')
    if (data && data.length > 0) return data
  }
  return year ? inMemoryOKRs.filter(o => o.year === year) : inMemoryOKRs
}

export async function createOKR(data: {
  okr_title: string
  okr_type: string
  year: number
  quarter?: string | null
  created_by?: string
}): Promise<OKR> {
  const newId = crypto.randomUUID()
  const now = new Date().toISOString()
  const validQuarters: OKRQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4']
  const normalizedQuarter: OKRQuarter | null = data.quarter && (validQuarters as string[]).includes(data.quarter)
    ? (data.quarter as OKRQuarter)
    : null
  const newOKR: OKR = {
    okr_id: newId,
    okr_title: data.okr_title,
    okr_type: data.okr_type || 'ยุทธศาสตร์คณะ',
    year: data.year || 2567,
    quarter: normalizedQuarter,
    status: 'In Progress',
    created_by: data.created_by || null,
    created_at: now,
    updated_at: now
  }

  invalidateApiCache('/api/okrs')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/okrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', okr: newOKR })
      })
    } catch (e) {
      console.warn('[createOKR] POST /api/okrs failed', e)
    }
  }

  inMemoryOKRs.unshift(newOKR)
  notifyOKRsChannel()
  return newOKR
}

export async function updateProjectOKR(projectId: string, okrId: string): Promise<void> {
  invalidateApiCache('/api/projects')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_project_okr',
          project_id: projectId,
          okr_id: okrId
        })
      })
    } catch (e) {
      console.warn('[updateProjectOKR] POST failed', e)
    }
  }

  const projects = getInMemoryProjects()
  const okr = inMemoryOKRs.find(o => o.okr_id === okrId) || null
  const updatedProjects = projects.map(p => {
    if (p.project_id === projectId) {
      return {
        ...p,
        okr_id: okrId,
        okr: okr || p.okr,
        updated_at: new Date().toISOString()
      }
    }
    return p
  })

  setInMemoryProjects(updatedProjects)
  notifyProjectsChannel()
}

export async function fetchProjects(
  filters?: {
    year?: number
    quarter?: string
    department?: string
    status?: string
  },
  forceRefresh: boolean = false
): Promise<ProjectWithHeadAndAssignees[]> {
  if (forceRefresh) {
    invalidateApiCache('/api/projects')
  }

  if (typeof window !== 'undefined') {
    try {
      const data = await fetchWithDeduplication<{ success: boolean; projects: ProjectWithHeadAndAssignees[] }>(
        '/api/projects',
        { ttl: 2500, forceRefresh }
      )
      if (data?.success && Array.isArray(data.projects)) {
        inMemoryProjects = data.projects
        setCachedProjects(data.projects)
        let list = data.projects.map(enrichProjectWithOverdue)
        if (filters?.department && filters.department !== 'ทั้งหมด') {
          list = list.filter((p: ProjectWithHeadAndAssignees) => p.department === filters.department)
        }
        if (filters?.status && filters.status !== 'all') {
          list = list.filter((p: ProjectWithHeadAndAssignees) => p.status === filters.status)
        }
        if (filters?.year) {
          list = list.filter((p: ProjectWithHeadAndAssignees) => {
            const pYear = p.year || p.okr?.year
            return pYear ? Number(pYear) === Number(filters.year) : true
          })
        }
        if (filters?.quarter && filters.quarter !== 'ALL') {
          list = list.filter((p: ProjectWithHeadAndAssignees) => (p.okr ? p.okr.quarter === filters.quarter : true))
        }
        return list
      }
    } catch {
    }
  }

  const cached = getCachedProjects()
  if (cached && cached.length > 0) {
    inMemoryProjects = cached
  }

  let memList = inMemoryProjects.map(enrichProjectWithOverdue)
  if (filters?.department && filters.department !== 'ทั้งหมด') {
    memList = memList.filter(p => p.department === filters.department)
  }
  if (filters?.status && filters.status !== 'all') {
    memList = memList.filter(p => p.status === filters.status)
  }
  if (filters?.year) {
    memList = memList.filter(p => {
      const pYear = p.year || p.okr?.year
      return pYear ? Number(pYear) === Number(filters.year) : true
    })
  }
  if (filters?.quarter && filters.quarter !== 'ALL') {
    memList = memList.filter(p => (p.okr ? p.okr.quarter === filters.quarter : true))
  }
  return memList
}

export async function createProjectRecord(projectData: {
  okr_id: string
  project_name: string
  project_type: string
  description: string
  main_objective: string
  sub_objective: string
  department: string
  head_of_project: string
  budget: number
  start_date: string
  end_date: string
}): Promise<ProjectWithHeadAndAssignees> {
  const newId = crypto.randomUUID()
  const users = getInMemoryUsers()
  const headUser = users.find(u => u.user_id === projectData.head_of_project) || getCachedUsers().find(u => u.user_id === projectData.head_of_project) || null

  const okrList = await fetchOKRs()
  const linkedOkr = okrList.find(o => o.okr_id === projectData.okr_id) || null

  let initialStatus: ProjectStatus = 'In Progress'
  if (projectData.end_date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(projectData.end_date)
    dueDate.setHours(0, 0, 0, 0)
    if (!isNaN(dueDate.getTime()) && dueDate.getTime() < today.getTime()) {
      initialStatus = 'Delayed'
    }
  }

  const newProj: ProjectWithHeadAndAssignees = enrichProjectWithOverdue({
    project_id: newId,
    okr_id: projectData.okr_id,
    project_name: projectData.project_name,
    project_type: projectData.project_type,
    description: projectData.description,
    main_objective: projectData.main_objective,
    sub_objective: projectData.sub_objective,
    department: projectData.department,
    start_date: projectData.start_date,
    end_date: projectData.end_date,
    head_of_project: projectData.head_of_project,
    progress_percentage: 0,
    budget: projectData.budget,
    spent_amount: 0,
    status: initialStatus,
    bottleneck: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    head: headUser,
    assignees: [],
    evidences: [],
    okr: linkedOkr,
    year: linkedOkr?.year || null,
    quarter: linkedOkr?.quarter || null
  })

  invalidateApiCache('/api/projects')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_project', project: newProj })
      })
    } catch (e) {
      console.warn('[project-service] POST /api/projects failed, fallback to local', e)
    }
  }

  inMemoryProjects.unshift(newProj)
  setCachedProjects(inMemoryProjects)
  notifyProjectsChannel()
  return newProj
}

export async function deleteProjectRecord(projectId: string): Promise<void> {
  inMemoryProjects = inMemoryProjects.filter(p => p.project_id !== projectId)
  setCachedProjects(inMemoryProjects)
  removeProjectReportsInMemory(projectId)
  invalidateApiCache('/api/projects')
  invalidateApiCache('/api/normal-reports')
  invalidateApiCache('/api/evaluations')
  invalidateApiCache('/api/dashboard-reports')
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/projects?projectId=${encodeURIComponent(projectId)}`, {
        method: 'DELETE'
      })
    } catch {}
  }
  notifyProjectsChannel()
  notifyEvaluationsChannel()
}

export async function clearAllProjectsRecord(): Promise<void> {
  invalidateApiCache('/api/projects')
  invalidateApiCache('/api/normal-reports')
  invalidateApiCache('/api/evaluations')
  invalidateApiCache('/api/dashboard-reports')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects?clearAll=true', { method: 'DELETE' })
    } catch {}
  }

  inMemoryProjects = []
  setCachedProjects(inMemoryProjects)
  clearAllReportsInMemory()
  notifyProjectsChannel()
  notifyEvaluationsChannel()
}

export async function updateProjectProgressRecord(
  projectId: string,
  progress: number,
  bottleneck: string | null,
  status: ProjectStatus,
  spent?: number
): Promise<void> {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)))
  invalidateApiCache('/api/projects')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_progress',
          project_id: projectId,
          progress: clampedProgress,
          bottleneck,
          status,
          spent
        })
      })
    } catch {}
  }

  const index = inMemoryProjects.findIndex(p => p.project_id === projectId)
  if (index !== -1) {
    inMemoryProjects[index] = {
      ...inMemoryProjects[index],
      progress_percentage: clampedProgress,
      bottleneck: bottleneck,
      status: status,
      spent_amount: spent !== undefined ? spent : inMemoryProjects[index].spent_amount,
      updated_at: new Date().toISOString()
    }
  }
  setCachedProjects(inMemoryProjects)
  notifyProjectsChannel()
}
