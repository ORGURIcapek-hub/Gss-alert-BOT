import { createClient } from '@/lib/supabase/client'
import {
  mockUsers,
  mockOKRs,
  mockProjects,
  mockDashboardReports,
  mockNormalReports,
  mockProjectAssignments,
  mockEvidenceSubmissions,
  mockEvaluations
} from '@/lib/mock-data'
import {
  OKR,
  ProjectWithHeadAndAssignees,
  UserProfile,
  UserRole,
  ProjectStatus,
  DashboardReport,
  NormalReport,
  ProjectAssignment,
  EvidenceSubmission,
  Evaluation
} from '@/types/database.types'

// =============================================================================
// IN-MEMORY DATA STORES (Client Fallback & Offline Simulation)
// =============================================================================
let inMemoryProjects = [...mockProjects]
let inMemoryUsers = [...mockUsers]
let inMemoryOKRs = [...mockOKRs]
let inMemoryDashboardReports = [...mockDashboardReports]
let inMemoryNormalReports = [...mockNormalReports]
let inMemoryProjectAssignments = [...mockProjectAssignments]
let inMemoryEvidenceSubmissions = [...mockEvidenceSubmissions]
let inMemoryEvaluations = [...mockEvaluations]

// =============================================================================
// STORAGE & HELPERS (SSR Safe)
// =============================================================================
const USERS_CACHE_KEY = 'sdu_okr_users_cache'

function getCachedUsers(): UserProfile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setCachedUsers(users: UserProfile[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users))
  } catch {}
}

/** Safe Supabase Client Initializer */
function getSafeSupabaseClient() {
  try {
    return createClient()
  } catch {
    return null
  }
}

async function dbCall<T>(fn: () => Promise<{ data: T | null; error: { message: string } | null }>, label: string): Promise<T | null> {
  try {
    const { data, error } = await fn()
    if (error) {
      console.warn(`[okr-service] ${label} error:`, error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn(`[okr-service] ${label} exception:`, err)
    return null
  }
}

/** Maps a UserRole to its management_order integer. */
function getManagementOrder(role?: string): number {
  if (role === 'admin') return 1
  if (role === 'executive') return 2
  if (role === 'head_okr') return 3
  return 4
}

// =============================================================================
// USER SERVICE (Unified via Server-Side Persistent API /api/users)
// =============================================================================

export async function fetchUsers(): Promise<UserProfile[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        if (data?.success && Array.isArray(data.users) && data.users.length > 0) {
          inMemoryUsers = data.users
          setCachedUsers(data.users)
          return data.users
        }
      }
    } catch {
      // Fall through to cache/in-memory
    }
  }

  const cached = getCachedUsers()
  if (cached.length > 0) {
    inMemoryUsers = cached
    return cached
  }

  return inMemoryUsers
}

export async function updateUserRoleRecord(userId: string, role: UserRole): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role })
      })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.map(u => (u.user_id === userId ? { ...u, role, management_order: getManagementOrder(role) } : u))
  setCachedUsers(inMemoryUsers)
}

export async function updateUserPasswordRecord(userId: string, newPassword: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_password', userId, password: newPassword })
      })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.map(u => (u.user_id === userId ? { ...u, password: newPassword } : u))
  setCachedUsers(inMemoryUsers)
}

export async function deleteUserRecord(userId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.filter(u => u.user_id !== userId)
  inMemoryProjectAssignments = inMemoryProjectAssignments.filter(a => a.user_id !== userId)
  inMemoryProjects.forEach(p => {
    if (p.head_of_project === userId) {
      p.head_of_project = ''
      p.head = null
    }
    if (p.assignees) {
      p.assignees = p.assignees.filter(a => a.user_id !== userId)
    }
  })
  setCachedUsers(inMemoryUsers)
}

export async function updateUserProfileRecord(
  userId: string,
  updates: {
    name?: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    department?: string
    position?: string
  }
): Promise<UserProfile | null> {
  const computedFirstName = updates.first_name || (updates.name ? updates.name.split(' ')[0] : undefined)
  const computedLastName = updates.last_name || (updates.name ? updates.name.split(' ').slice(1).join(' ') : undefined)
  const computedName = updates.name || (computedFirstName && computedLastName ? `${computedFirstName} ${computedLastName}` : undefined)

  const sanitizedUpdates: Partial<UserProfile> = {
    ...updates,
    ...(computedFirstName ? { first_name: computedFirstName } : {}),
    ...(computedLastName ? { last_name: computedLastName } : {}),
    ...(computedName ? { name: computedName } : {}),
    updated_at: new Date().toISOString()
  }

  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', userId, updates: sanitizedUpdates })
      })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.map(u => (u.user_id === userId ? { ...u, ...sanitizedUpdates } : u))
  setCachedUsers(inMemoryUsers)
  return inMemoryUsers.find(u => u.user_id === userId) || null
}

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
  avatar_url?: string
  status?: 'pending' | 'approved' | 'rejected'
}): Promise<UserProfile> {
  const cleanEmail = userData.email.toLowerCase().trim()
  const computedFirstName = userData.first_name || (userData.name ? userData.name.split(' ')[0] : 'อาจารย์')
  const computedLastName = userData.last_name || (userData.name ? userData.name.split(' ').slice(1).join(' ') || 'ประจำภาควิชา' : 'ประจำภาควิชา')
  const computedName = userData.name || `${computedFirstName} ${computedLastName}`
  const computedUsername = userData.username || cleanEmail.split('@')[0]
  const userRole: UserRole = userData.role || 'teacher'
  const userStatus = userData.status || 'pending'
  const userPassword = userData.password || 'password123'
  const userAvatar = userData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'

  let createdUser: UserProfile | null = null

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          email: cleanEmail,
          username: computedUsername,
          name: computedName,
          first_name: computedFirstName,
          last_name: computedLastName,
          status: userStatus,
          password: userPassword,
          avatar_url: userAvatar
        })
      })
      const data = await res.json()
      if (res.ok && data.success && data.user) {
        createdUser = data.user
      } else if (data.error) {
        throw new Error(data.error)
      }
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch') && !e.message.includes('NetworkError')) {
        throw e
      }
      console.warn('[okr-service] POST /api/users network failed, fallback to local', e)
    }
  }

  const newUser: UserProfile = createdUser || {
    user_id: crypto.randomUUID(),
    username: computedUsername,
    name: computedName,
    email: cleanEmail,
    password: userPassword,
    first_name: computedFirstName,
    last_name: computedLastName,
    position: userData.position || 'อาจารย์ประจำภาควิชา',
    department: userData.department || 'ภาควิชาวิทยาการคอมพิวเตอร์',
    role: userRole,
    admin_type: userRole === 'admin' ? 'Super Admin' : null,
    executive_level: null,
    employment_status: 'Full-Time',
    management_order: getManagementOrder(userRole),
    avatar_url: userAvatar,
    status: userStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  inMemoryUsers = [newUser, ...inMemoryUsers.filter(u => u.user_id !== newUser.user_id)]
  setCachedUsers(inMemoryUsers)
  return newUser
}

export async function approveUserRecord(userId: string, assignedRole?: UserRole): Promise<UserProfile> {
  let updatedUser: UserProfile | null = null

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', userId, assignedRole })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถอนุมัติผู้ใช้งานได้')
      }
      if (data.user) {
        updatedUser = data.user
      }
    } catch (e: any) {
      console.error('[okr-service] approveUserRecord error:', e)
      throw e
    }
  }

  inMemoryUsers = inMemoryUsers.map(u => {
    if (u.user_id === userId) {
      return updatedUser || {
        ...u,
        status: 'approved',
        ...(assignedRole ? { role: assignedRole, management_order: getManagementOrder(assignedRole) } : {})
      }
    }
    return u
  })
  setCachedUsers(inMemoryUsers)
  return updatedUser || inMemoryUsers.find(u => u.user_id === userId)!
}

export async function rejectUserRecord(userId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', userId })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถปฏิเสธคำขอสมัครได้')
      }
    } catch (e: any) {
      console.error('[okr-service] rejectUserRecord error:', e)
      throw e
    }
  }

  inMemoryUsers = inMemoryUsers.map(u => (u.user_id === userId ? { ...u, status: 'rejected' } : u))
  setCachedUsers(inMemoryUsers)
}

export async function fetchPendingUsers(): Promise<UserProfile[]> {
  const users = await fetchUsers()
  return users.filter(u => u.status === 'pending')
}

// =============================================================================
// OKR SERVICE
// =============================================================================
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

// =============================================================================
// PROJECT SERVICE
// =============================================================================

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
  const headUser = inMemoryUsers.find(u => u.user_id === projectData.head_of_project) || getCachedUsers().find(u => u.user_id === projectData.head_of_project) || null

  const okrList = await fetchOKRs()
  const linkedOkr = okrList.find(o => o.okr_id === projectData.okr_id) || null

  // Check if overdue upon creation
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

export async function deleteProjectRecord(projectId: string): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      await supabase.from('evidences').delete().eq('project_id', projectId)
      await supabase.from('project_assignees').delete().eq('project_id', projectId)
      await supabase.from('normal_reports').delete().eq('project_id', projectId)
      await supabase.from('projects').delete().eq('project_id', projectId)
    } catch (err) {
      console.warn('[okr-service] deleteProjectRecord Supabase error:', err)
    }
  }

  inMemoryProjects = inMemoryProjects.filter(p => p.project_id !== projectId)
  inMemoryProjectAssignments = inMemoryProjectAssignments.filter(a => a.project_id !== projectId)
  inMemoryEvidenceSubmissions = inMemoryEvidenceSubmissions.filter(e => e.project_id !== projectId)
  inMemoryNormalReports = inMemoryNormalReports.filter(r => r.project_id !== projectId)
}

export async function clearAllProjectsRecord(): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      await supabase.from('evidences').delete().neq('evidence_id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('project_assignees').delete().neq('project_id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('normal_reports').delete().neq('report_id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('projects').delete().neq('project_id', '00000000-0000-0000-0000-000000000000')
    } catch (err) {
      console.warn('[okr-service] clearAllProjectsRecord error:', err)
    }
  }

  inMemoryProjects = []
  inMemoryProjectAssignments = []
  inMemoryEvidenceSubmissions = []
  inMemoryNormalReports = []
}

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

// =============================================================================
// EVIDENCE & SUBMISSIONS SERVICE
// =============================================================================
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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidences') as any).insert(newEvidence), 'uploadEvidenceRecord')
  }

  const proj = inMemoryProjects.find(p => p.project_id === projectId)
  if (proj) {
    if (!proj.evidences) proj.evidences = []
    proj.evidences.unshift(newEvidence)
  }
}

export async function deleteEvidenceRecord(evidenceId: string, projectId: string): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceRecord')
  }

  const proj = inMemoryProjects.find(p => p.project_id === projectId)
  if (proj && proj.evidences) {
    proj.evidences = proj.evidences.filter(e => e.evidence_id !== evidenceId)
  }
}

export async function fetchEvidenceSubmissions(
  projectId?: string
): Promise<(EvidenceSubmission & { sender?: UserProfile; project?: ProjectWithHeadAndAssignees })[]> {
  let list = inMemoryEvidenceSubmissions
  if (projectId) {
    list = list.filter(e => e.project_id === projectId)
  }

  return list.map(sub => {
    const sender = inMemoryUsers.find(u => u.user_id === sub.sender_id) || getCachedUsers().find(u => u.user_id === sub.sender_id) || undefined
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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidence_submissions') as any).insert(newSubmission), 'submitEvidenceSubmission')
  }

  inMemoryEvidenceSubmissions.unshift(newSubmission)

  // Sync to project evidences for backward compatibility
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
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidence_submissions') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceSubmission:submissions')
    await dbCall(() => (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceSubmission:evidences')
  }

  inMemoryEvidenceSubmissions = inMemoryEvidenceSubmissions.filter(e => e.evidence_id !== evidenceId)
  inMemoryProjects.forEach(p => {
    if (p.evidences) {
      p.evidences = p.evidences.filter(e => e.evidence_id !== evidenceId)
    }
  })
}

// =============================================================================
// PROJECT ASSIGNMENTS SERVICE
// =============================================================================
export async function fetchProjectAssignments(projectId?: string): Promise<ProjectAssignment[]> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      let query = (supabase.from('project_assignments') as any).select('*')
      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as ProjectAssignment[]
      }
      if (error) console.warn('[okr-service] fetchProjectAssignments error:', error.message)
    } catch (err) {
      console.warn('[okr-service] fetchProjectAssignments exception:', err)
    }
  }

  return projectId
    ? inMemoryProjectAssignments.filter(a => a.project_id === projectId)
    : inMemoryProjectAssignments
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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('project_assignments') as any).insert(assignment), 'assignProjectRole')
  }

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
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('project_assignments') as any).delete().eq('assignment_id', assignmentId), 'removeProjectRole')
  }

  const target = inMemoryProjectAssignments.find(a => a.assignment_id === assignmentId)
  if (target) {
    inMemoryProjectAssignments = inMemoryProjectAssignments.filter(a => a.assignment_id !== assignmentId)
    const proj = inMemoryProjects.find(p => p.project_id === target.project_id)
    if (proj && proj.assignees) {
      proj.assignees = proj.assignees.filter(a => a.user_id !== target.user_id)
    }
  }
}

// =============================================================================
// DASHBOARD REPORTS (Executive Dashboard)
// =============================================================================
export async function fetchDashboardReports(): Promise<DashboardReport[]> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    const data = await dbCall<DashboardReport[]>(
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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('dashboard') as any).insert(newReport), 'createDashboardReport')
  }

  inMemoryDashboardReports.unshift(newReport)
  return newReport
}

// =============================================================================
// NORMAL REPORTS (Operational Reports)
// =============================================================================
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

// =============================================================================
// EVALUATIONS SERVICE (1-5 Star Ratings)
// =============================================================================
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
  }

  return evaluation
}
