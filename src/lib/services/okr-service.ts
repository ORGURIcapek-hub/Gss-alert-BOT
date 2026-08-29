import { createClient } from '@/lib/supabase/client'
import { mockUsers, mockOKRs, mockProjects } from '@/lib/mock-data'
import { OKR, ProjectWithHeadAndAssignees, UserProfile, UserRole, ProjectStatus } from '@/types/database.types'

let inMemoryProjects = [...mockProjects]
let inMemoryUsers = [...mockUsers]
let inMemoryOKRs = [...mockOKRs]

export async function fetchUsers(): Promise<UserProfile[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase.from('users') as any).select('*').order('management_order', { ascending: true })
    if (error || !data || data.length === 0) {
      return inMemoryUsers
    }
    return data as UserProfile[]
  } catch {
    return inMemoryUsers
  }
}

export async function fetchOKRs(year?: number): Promise<OKR[]> {
  try {
    const supabase = createClient()
    let query = (supabase.from('okrs') as any).select('*')
    if (year) {
      query = query.eq('year', year)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error || !data || data.length === 0) {
      return year ? inMemoryOKRs.filter(o => o.year === year) : inMemoryOKRs
    }
    return data as OKR[]
  } catch {
    return year ? inMemoryOKRs.filter(o => o.year === year) : inMemoryOKRs
  }
}

export async function fetchProjects(filters?: {
  year?: number
  department?: string
  status?: string
}): Promise<ProjectWithHeadAndAssignees[]> {
  try {
    const supabase = createClient()
    let query = (supabase.from('projects') as any)
      .select(`
        *,
        head:users!projects_head_of_project_fkey(*),
        assignees:project_assignees(
          *,
          user:users(*)
        ),
        evidences(*)
      `)

    if (filters?.department && filters.department !== 'ทั้งหมด') {
      query = query.eq('department', filters.department)
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status as ProjectStatus)
    }

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      return filterMemoryProjects(filters)
    }
    return data as unknown as ProjectWithHeadAndAssignees[]
  } catch {
    return filterMemoryProjects(filters)
  }
}

function filterMemoryProjects(filters?: {
  year?: number
  department?: string
  status?: string
}): ProjectWithHeadAndAssignees[] {
  return inMemoryProjects.filter(p => {
    if (filters?.department && filters.department !== 'ทั้งหมด' && p.department !== filters.department) {
      return false
    }
    if (filters?.status && filters.status !== 'all' && p.status !== filters.status) {
      return false
    }
    return true
  })
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
  const headUser = inMemoryUsers.find(u => u.user_id === projectData.head_of_project) || null

  const newProj: ProjectWithHeadAndAssignees = {
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
    status: 'In Progress',
    bottleneck: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    head: headUser,
    assignees: [],
    evidences: []
  }

  try {
    const supabase = createClient()
    await (supabase.from('projects') as any).insert({
      project_id: newId,
      okr_id: projectData.okr_id,
      project_name: projectData.project_name,
      project_type: projectData.project_type,
      description: projectData.description,
      main_objective: projectData.main_objective,
      sub_objective: projectData.sub_objective,
      department: projectData.department,
      head_of_project: projectData.head_of_project,
      budget: projectData.budget,
      start_date: projectData.start_date,
      end_date: projectData.end_date,
      progress_percentage: 0,
      spent_amount: 0,
      status: 'In Progress'
    })
  } catch {}

  inMemoryProjects.unshift(newProj)
  return newProj
}

export async function updateProjectProgressRecord(
  projectId: string,
  progress: number,
  bottleneck: string | null,
  status: ProjectStatus,
  spent?: number
): Promise<void> {
  try {
    const supabase = createClient()
    await (supabase.from('projects') as any)
      .update({
        progress_percentage: progress,
        bottleneck: bottleneck,
        status: status,
        spent_amount: spent,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
  } catch {}

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

export async function uploadEvidenceRecord(
  projectId: string,
  userId: string,
  fileName: string,
  description: string
): Promise<void> {
  const evidenceId = crypto.randomUUID()
  const newEvidence = {
    evidence_id: evidenceId,
    project_id: projectId,
    uploaded_by: userId,
    file_name: fileName,
    file_path: `https://example.com/storage/evidences/${fileName}`,
    file_size: 1024 * 1024 * 2,
    description: description,
    upload_date: new Date().toISOString()
  }

  try {
    const supabase = createClient()
    await (supabase.from('evidences') as any).insert(newEvidence)
  } catch {}

  const proj = inMemoryProjects.find(p => p.project_id === projectId)
  if (proj) {
    if (!proj.evidences) proj.evidences = []
    proj.evidences.unshift(newEvidence)
  }
}

export async function updateUserRoleRecord(userId: string, role: UserRole): Promise<void> {
  try {
    const supabase = createClient()
    await (supabase.from('users') as any).update({ role }).eq('user_id', userId)
  } catch {}

  const user = inMemoryUsers.find(u => u.user_id === userId)
  if (user) {
    user.role = role
  }
}
