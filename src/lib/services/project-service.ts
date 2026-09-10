import { mockOKRs, mockProjects } from '@/lib/mock-data'
import { OKR, ProjectWithHeadAndAssignees, ProjectStatus } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall, getCachedUsers } from './service-helpers'
import { getInMemoryUsers } from './user-service'

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

let inMemoryOKRs: OKR[] = [...mockOKRs]
let inMemoryProjects: ProjectWithHeadAndAssignees[] = [...mockProjects]

/** Retrieve current in-memory projects */
export function getInMemoryProjects(): ProjectWithHeadAndAssignees[] {
  return inMemoryProjects
}

/** Set in-memory projects */
export function setInMemoryProjects(projects: ProjectWithHeadAndAssignees[]): void {
  inMemoryProjects = projects
  setCachedProjects(projects)
}

/** Enrich project with overdue calculations and linked OKR metadata */
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

      if (diffDays < 0) {
        daysOverdue = Math.abs(diffDays)
        daysRemaining = 0
        if (project.status !== 'Completed') {
          isOverdue = true
          effectiveStatus = 'Delayed'
        }
      } else {
        daysRemaining = diffDays
        daysOverdue = 0
      }
    }
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

/** Fetch OKRs by optional year */
export async function fetchOKRs(year?: number): Promise<OKR[]> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    let query = (supabase.from('okrs') as any).select('*')
    if (year) query = query.eq('year', year)
    const data = await dbCall<OKR[]>(() => query.order('created_at', { ascending: false }), 'fetchOKRs')
    if (data && data.length > 0) return data
  }
  return year ? inMemoryOKRs.filter(o => o.year === year) : inMemoryOKRs
}

/** Fetch projects with persistent server storage fallback */
export async function fetchProjects(filters?: {
  year?: number
  quarter?: string
  department?: string
  status?: string
}): Promise<ProjectWithHeadAndAssignees[]> {
  // 1. Fetch from persistent Server API /api/projects
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
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
            list = list.filter((p: ProjectWithHeadAndAssignees) => (p.okr ? p.okr.year === filters.year : true))
          }
          if (filters?.quarter && filters.quarter !== 'ALL') {
            list = list.filter((p: ProjectWithHeadAndAssignees) => (p.okr ? p.okr.quarter === filters.quarter : true))
          }
          return list
        }
      }
    } catch {
      // Fallback to cache
    }
  }

  // 2. Fallback to localStorage cache
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
    memList = memList.filter(p => (p.okr ? p.okr.year === filters.year : true))
  }
  if (filters?.quarter && filters.quarter !== 'ALL') {
    memList = memList.filter(p => (p.okr ? p.okr.quarter === filters.quarter : true))
  }
  return memList
}

/** Create a new project record and persist to server */
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

  // 1. Persist to Server API /api/projects
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

/** Delete a project record */
export async function deleteProjectRecord(projectId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/projects?projectId=${encodeURIComponent(projectId)}`, {
        method: 'DELETE'
      })
    } catch {}
  }

  inMemoryProjects = inMemoryProjects.filter(p => p.project_id !== projectId)
  setCachedProjects(inMemoryProjects)
  notifyProjectsChannel()
}

/** Clear all projects */
export async function clearAllProjectsRecord(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects?clearAll=true', { method: 'DELETE' })
    } catch {}
  }

  inMemoryProjects = []
  setCachedProjects(inMemoryProjects)
  notifyProjectsChannel()
}

/** Update project progress and budget spent */
export async function updateProjectProgressRecord(
  projectId: string,
  progress: number,
  bottleneck: string | null,
  status: ProjectStatus,
  spent?: number
): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_progress',
          project_id: projectId,
          progress,
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
      progress_percentage: progress,
      bottleneck: bottleneck,
      status: status,
      spent_amount: spent !== undefined ? spent : inMemoryProjects[index].spent_amount,
      updated_at: new Date().toISOString()
    }
  }
  setCachedProjects(inMemoryProjects)
  notifyProjectsChannel()
}
