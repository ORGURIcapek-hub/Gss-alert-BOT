import { mockOKRs, mockProjects } from '@/lib/mock-data'
import { OKR, ProjectWithHeadAndAssignees, ProjectStatus } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall, getCachedUsers } from './service-helpers'
import { getInMemoryUsers } from './user-service'

let inMemoryOKRs: OKR[] = [...mockOKRs]
let inMemoryProjects: ProjectWithHeadAndAssignees[] = [...mockProjects]

/** Retrieve current in-memory projects */
export function getInMemoryProjects(): ProjectWithHeadAndAssignees[] {
  return inMemoryProjects
}

/** Set in-memory projects */
export function setInMemoryProjects(projects: ProjectWithHeadAndAssignees[]): void {
  inMemoryProjects = projects
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

/** Fetch projects with optional filters */
export async function fetchProjects(filters?: {
  year?: number
  quarter?: string
  department?: string
  status?: string
}): Promise<ProjectWithHeadAndAssignees[]> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    let query = (supabase.from('projects') as any).select(`
      *,
      okr:okrs!projects_okr_id_fkey(*),
      head:users!projects_head_of_project_fkey(*),
      assignees:project_assignees(*, user:users(*)),
      evidences(*)
    `)
    if (filters?.department && filters.department !== 'ทั้งหมด') query = query.eq('department', filters.department)
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status as ProjectStatus)

    const data = await dbCall<ProjectWithHeadAndAssignees[]>(() => query, 'fetchProjects')
    if (data !== null) {
      let list = data.map(enrichProjectWithOverdue)

      if (filters?.year) {
        list = list.filter(p => (p.okr ? p.okr.year === filters.year : true))
      }
      if (filters?.quarter && filters.quarter !== 'ALL') {
        list = list.filter(p => (p.okr ? p.okr.quarter === filters.quarter : true))
      }
      return list
    }
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

/** Create a new project record */
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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(
      () => (supabase.from('projects') as any).insert({
        project_id: newId, okr_id: projectData.okr_id, project_name: projectData.project_name,
        project_type: projectData.project_type, description: projectData.description,
        main_objective: projectData.main_objective, sub_objective: projectData.sub_objective,
        department: projectData.department, head_of_project: projectData.head_of_project,
        budget: projectData.budget, start_date: projectData.start_date, end_date: projectData.end_date,
        progress_percentage: 0, spent_amount: 0, status: initialStatus
      }),
      'createProjectRecord'
    )
  }

  inMemoryProjects.unshift(newProj)
  return newProj
}

/** Delete a project record */
export async function deleteProjectRecord(projectId: string): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      await supabase.from('evidences').delete().eq('project_id', projectId)
      await supabase.from('project_assignees').delete().eq('project_id', projectId)
      await supabase.from('normal_reports').delete().eq('project_id', projectId)
      await supabase.from('projects').delete().eq('project_id', projectId)
    } catch (err) {
      console.warn('[project-service] deleteProjectRecord Supabase error:', err)
    }
  }

  inMemoryProjects = inMemoryProjects.filter(p => p.project_id !== projectId)
}

/** Clear all projects */
export async function clearAllProjectsRecord(): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      await supabase.from('evidences').delete().neq('evidence_id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('project_assignees').delete().neq('project_id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('normal_reports').delete().neq('report_id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('projects').delete().neq('project_id', '00000000-0000-0000-0000-000000000000')
    } catch (err) {
      console.warn('[project-service] clearAllProjectsRecord error:', err)
    }
  }

  inMemoryProjects = []
}

/** Update project progress and budget spent */
export async function updateProjectProgressRecord(
  projectId: string,
  progress: number,
  bottleneck: string | null,
  status: ProjectStatus,
  spent?: number
): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(
      () => (supabase.from('projects') as any)
        .update({ progress_percentage: progress, bottleneck, status, spent_amount: spent, updated_at: new Date().toISOString() })
        .eq('project_id', projectId),
      'updateProjectProgressRecord'
    )
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
}
