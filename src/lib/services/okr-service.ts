import { createClient } from '@/lib/supabase/client'
import { mockUsers, mockOKRs, mockProjects, mockDashboardReports, mockNormalReports, mockProjectAssignments, mockEvidenceSubmissions, mockEvaluations } from '@/lib/mock-data'
import { OKR, ProjectWithHeadAndAssignees, UserProfile, UserRole, ProjectStatus, DashboardReport, NormalReport, ProjectAssignment, EvidenceSubmission, Evaluation } from '@/types/database.types'

let inMemoryProjects = [...mockProjects]
let inMemoryUsers = [...mockUsers]
let inMemoryOKRs = [...mockOKRs]
let inMemoryDashboardReports = [...mockDashboardReports]
let inMemoryNormalReports = [...mockNormalReports]
let inMemoryProjectAssignments = [...mockProjectAssignments]
let inMemoryEvidenceSubmissions = [...mockEvidenceSubmissions]
let inMemoryEvaluations = [...mockEvaluations]

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

export async function deleteEvidenceRecord(evidenceId: string, projectId: string): Promise<void> {
  try {
    const supabase = createClient()
    await (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId)
  } catch {}

  const proj = inMemoryProjects.find(p => p.project_id === projectId)
  if (proj && proj.evidences) {
    proj.evidences = proj.evidences.filter(e => e.evidence_id !== evidenceId)
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

// ==========================================
// Table Dashboard (Executive Dashboard Reports)
// ==========================================
export async function fetchDashboardReports(): Promise<DashboardReport[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase.from('dashboard') as any)
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) {
      return inMemoryDashboardReports
    }
    return data as DashboardReport[]
  } catch {
    return inMemoryDashboardReports
  }
}

export async function createDashboardReport(reportData: {
  overall_okr_info: string
  okr_head_evaluation_score: number
  head_id: string
  head_name?: string
  academic_year?: number
}): Promise<DashboardReport> {
  const newId = crypto.randomUUID()
  const newReport: DashboardReport = {
    dashboard_id: newId,
    overall_okr_info: reportData.overall_okr_info,
    okr_head_evaluation_score: reportData.okr_head_evaluation_score,
    head_id: reportData.head_id,
    head_name: reportData.head_name || 'หัวหน้าโครงการ OKR',
    academic_year: reportData.academic_year || 2567,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  try {
    const supabase = createClient()
    await (supabase.from('dashboard') as any).insert(newReport)
  } catch {}

  inMemoryDashboardReports.unshift(newReport)
  return newReport
}

// ==========================================
// Table Normal Report (General Reports)
// ==========================================
export async function fetchNormalReports(): Promise<NormalReport[]> {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase.from('normal_reports') as any)
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) {
      return inMemoryNormalReports
    }
    return data as NormalReport[]
  } catch {
    return inMemoryNormalReports
  }
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

  try {
    const supabase = createClient()
    await (supabase.from('normal_reports') as any).insert(newReport)
  } catch {}

  inMemoryNormalReports.unshift(newReport)
  return newReport
}

// ==========================================
// User Registration & Creation
// ==========================================
export async function registerUserRecord(userData: {
  username?: string
  name?: string
  first_name?: string
  last_name?: string
  email: string
  password?: string
  role?: UserRole
  department?: string
  position?: string
}): Promise<UserProfile> {
  const newId = crypto.randomUUID()
  const computedFirstName = userData.first_name || (userData.name ? userData.name.split(' ')[0] : 'อาจารย์')
  const computedLastName = userData.last_name || (userData.name ? userData.name.split(' ').slice(1).join(' ') || 'ประจำภาควิชา' : 'ประจำภาควิชา')
  const computedName = userData.name || `${computedFirstName} ${computedLastName}`
  const computedUsername = userData.username || userData.email.split('@')[0]

  const newUser: UserProfile = {
    user_id: newId,
    username: computedUsername,
    name: computedName,
    email: userData.email.toLowerCase().trim(),
    password: userData.password || 'password123',
    first_name: computedFirstName,
    last_name: computedLastName,
    position: userData.position || 'อาจารย์ประจำภาควิชา',
    department: userData.department || 'ภาควิชาวิทยาการคอมพิวเตอร์',
    role: userData.role || 'teacher',
    admin_type: null,
    executive_level: null,
    employment_status: 'Full-Time',
    management_order: userData.role === 'executive' ? 2 : userData.role === 'head_okr' ? 3 : 4,
    avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  try {
    const supabase = createClient()
    await (supabase.from('users') as any).insert(newUser)
  } catch {}

  inMemoryUsers.push(newUser)
  return newUser
}

// ==========================================
// Table Project_Assignments (Role & Member Assignments)
// ==========================================
export async function fetchProjectAssignments(projectId?: string): Promise<ProjectAssignment[]> {
  try {
    const supabase = createClient()
    let query = (supabase.from('project_assignments') as any).select('*')
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    const { data, error } = await query
    if (error || !data || data.length === 0) {
      return projectId
        ? inMemoryProjectAssignments.filter(a => a.project_id === projectId)
        : inMemoryProjectAssignments
    }
    return data as ProjectAssignment[]
  } catch {
    return projectId
      ? inMemoryProjectAssignments.filter(a => a.project_id === projectId)
      : inMemoryProjectAssignments
  }
}

export async function assignProjectRole(data: {
  project_id: string
  user_id: string
  role_type: 'Head' | 'Member'
  assigned_by?: string
}): Promise<ProjectAssignment> {
  const newId = crypto.randomUUID()
  const assignment: ProjectAssignment = {
    assignment_id: newId,
    project_id: data.project_id,
    user_id: data.user_id,
    role_type: data.role_type,
    assigned_by: data.assigned_by || null,
    created_at: new Date().toISOString()
  }

  try {
    const supabase = createClient()
    await (supabase.from('project_assignments') as any).insert(assignment)
  } catch {}

  // Remove existing assignment of this user in this project if any
  inMemoryProjectAssignments = inMemoryProjectAssignments.filter(
    a => !(a.project_id === data.project_id && a.user_id === data.user_id)
  )
  inMemoryProjectAssignments.unshift(assignment)

  // Update inMemoryProjects assignees or head
  const proj = inMemoryProjects.find(p => p.project_id === data.project_id)
  const targetUser = inMemoryUsers.find(u => u.user_id === data.user_id) || null

  if (proj) {
    if (data.role_type === 'Head') {
      proj.head_of_project = data.user_id
      proj.head = targetUser
    } else {
      if (!proj.assignees) proj.assignees = []
      const exists = proj.assignees.some(a => a.user_id === data.user_id)
      if (!exists) {
        proj.assignees.push({
          project_id: data.project_id,
          user_id: data.user_id,
          assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)',
          assigned_date: new Date().toISOString(),
          user: targetUser || undefined
        })
      }
    }
  }

  return assignment
}

export async function removeProjectRole(assignmentId: string): Promise<void> {
  try {
    const supabase = createClient()
    await (supabase.from('project_assignments') as any).delete().eq('assignment_id', assignmentId)
  } catch {}

  const target = inMemoryProjectAssignments.find(a => a.assignment_id === assignmentId)
  if (target) {
    inMemoryProjectAssignments = inMemoryProjectAssignments.filter(a => a.assignment_id !== assignmentId)
    const proj = inMemoryProjects.find(p => p.project_id === target.project_id)
    if (proj && proj.assignees) {
      proj.assignees = proj.assignees.filter(a => a.user_id !== target.user_id)
    }
  }
}

// ==========================================
// Table Evidence_Submissions (Team Uploads & Head View)
// ==========================================
export async function fetchEvidenceSubmissions(projectId?: string): Promise<(EvidenceSubmission & { sender?: UserProfile; project?: ProjectWithHeadAndAssignees })[]> {
  let list = inMemoryEvidenceSubmissions
  if (projectId) {
    list = list.filter(e => e.project_id === projectId)
  }

  return list.map(sub => {
    const sender = inMemoryUsers.find(u => u.user_id === sub.sender_id) || undefined
    const project = inMemoryProjects.find(p => p.project_id === sub.project_id) || undefined
    return {
      ...sub,
      sender,
      project
    }
  })
}

export async function submitEvidenceSubmission(data: {
  project_id: string
  sender_id: string
  file_name: string
  file_path: string
  file_type: string
  description?: string
}): Promise<EvidenceSubmission> {
  const newId = crypto.randomUUID()
  const newSubmission: EvidenceSubmission = {
    evidence_id: newId,
    project_id: data.project_id,
    sender_id: data.sender_id,
    file_name: data.file_name,
    file_path: data.file_path,
    file_type: data.file_type,
    submitted_at: new Date().toISOString()
  }

  try {
    const supabase = createClient()
    await (supabase.from('evidence_submissions') as any).insert(newSubmission)
  } catch {}

  inMemoryEvidenceSubmissions.unshift(newSubmission)

  // Also sync to project evidences for backward compatibility
  const proj = inMemoryProjects.find(p => p.project_id === data.project_id)
  if (proj) {
    if (!proj.evidences) proj.evidences = []
    proj.evidences.unshift({
      evidence_id: newId,
      project_id: data.project_id,
      uploaded_by: data.sender_id,
      file_name: data.file_name,
      file_path: data.file_path,
      file_size: 1024 * 1024 * 2,
      description: data.description || `แนบหลักฐานไฟล์ ${data.file_name}`,
      upload_date: new Date().toISOString()
    })
  }

  return newSubmission
}

export async function deleteEvidenceSubmission(evidenceId: string): Promise<void> {
  try {
    const supabase = createClient()
    await (supabase.from('evidence_submissions') as any).delete().eq('evidence_id', evidenceId)
    await (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId)
  } catch {}

  inMemoryEvidenceSubmissions = inMemoryEvidenceSubmissions.filter(e => e.evidence_id !== evidenceId)
  inMemoryProjects.forEach(p => {
    if (p.evidences) {
      p.evidences = p.evidences.filter(e => e.evidence_id !== evidenceId)
    }
  })
}

// ==========================================
// Table Evaluations (Interactive 5-Level Ratings)
// ==========================================
export async function fetchEvaluations(filter?: { report_id?: string; dashboard_id?: string }): Promise<Evaluation[]> {
  try {
    const supabase = createClient()
    let query = (supabase.from('evaluations') as any).select('*')
    if (filter?.report_id) {
      query = query.eq('report_id', filter.report_id)
    }
    if (filter?.dashboard_id) {
      query = query.eq('dashboard_id', filter.dashboard_id)
    }
    const { data, error } = await query
    if (error || !data || data.length === 0) {
      return filterEvaluations(filter)
    }
    return data as Evaluation[]
  } catch {
    return filterEvaluations(filter)
  }
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

  try {
    const supabase = createClient()
    await (supabase.from('evaluations') as any).insert(evaluation)
  } catch {}

  // Update or add in memory
  const existingIdx = inMemoryEvaluations.findIndex(e =>
    (data.report_id && e.report_id === data.report_id) ||
    (data.dashboard_id && e.dashboard_id === data.dashboard_id)
  )

  if (existingIdx !== -1) {
    inMemoryEvaluations[existingIdx] = evaluation
  } else {
    inMemoryEvaluations.unshift(evaluation)
  }

  // Also update parent report scores if normal report
  if (data.report_id) {
    const normalRep = inMemoryNormalReports.find(r => r.report_id === data.report_id)
    if (normalRep) {
      normalRep.head_evaluation_score = data.head_score * 20 // map 1-5 to 20-100 for compatibility
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
  }

  return evaluation
}
