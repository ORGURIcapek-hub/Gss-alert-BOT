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
// STORAGE KEYS & ROBUST HELPERS (SSR Safe)
// =============================================================================
const DELETED_USERS_STORAGE_KEY = 'sdu_okr_deleted_user_ids'
const USER_STATUS_STORAGE_KEY = 'sdu_okr_user_status_map'
const REGISTERED_USERS_STORAGE_KEY = 'sdu_okr_registered_users'
const USER_PASSWORDS_STORAGE_KEY = 'sdu_okr_user_passwords'

function safeGetStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch (err) {
    console.warn(`[okr-storage] Error reading key "${key}":`, err)
    return defaultValue
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`[okr-storage] Error writing key "${key}":`, err)
  }
}

export function getUserStatusMap(): Record<string, 'pending' | 'approved' | 'rejected'> {
  return safeGetStorage(USER_STATUS_STORAGE_KEY, {})
}

export function setUserStatusInMap(userId: string, status: 'pending' | 'approved' | 'rejected'): void {
  const map = getUserStatusMap()
  map[userId] = status
  safeSetStorage(USER_STATUS_STORAGE_KEY, map)
}

export function getRegisteredUsers(): UserProfile[] {
  return safeGetStorage<UserProfile[]>(REGISTERED_USERS_STORAGE_KEY, [])
}

export function saveRegisteredUser(user: UserProfile): void {
  const list = getRegisteredUsers()
  const idx = list.findIndex(u => u.user_id === user.user_id || u.email.toLowerCase() === user.email.toLowerCase())
  if (idx !== -1) {
    list[idx] = user
  } else {
    list.unshift(user)
  }
  safeSetStorage(REGISTERED_USERS_STORAGE_KEY, list)
}

export const USER_PROFILES_STORAGE_KEY = 'sdu_okr_user_profile_overrides'

export function getUserProfileOverrides(): Record<string, Partial<UserProfile>> {
  return safeGetStorage<Record<string, Partial<UserProfile>>>(USER_PROFILES_STORAGE_KEY, {})
}

export function saveUserProfileOverride(userId: string, updates: Partial<UserProfile>): void {
  const map = getUserProfileOverrides()
  map[userId] = { ...(map[userId] || {}), ...updates }
  safeSetStorage(USER_PROFILES_STORAGE_KEY, map)
}

export function getUserPasswordsMap(): Record<string, string> {
  return safeGetStorage<Record<string, string>>(USER_PASSWORDS_STORAGE_KEY, {})
}

export function setUserPasswordInMap(userId: string, newPassword: string): void {
  const map = getUserPasswordsMap()
  map[userId] = newPassword
  safeSetStorage(USER_PASSWORDS_STORAGE_KEY, map)
}

export function getDeletedUserIds(): string[] {
  return safeGetStorage(DELETED_USERS_STORAGE_KEY, [])
}

export function recordDeletedUserId(userId: string): void {
  const list = getDeletedUserIds()
  if (!list.includes(userId)) {
    list.push(userId)
    safeSetStorage(DELETED_USERS_STORAGE_KEY, list)
  }
}

export function unrecordDeletedUserId(userId: string): void {
  const list = getDeletedUserIds().filter(id => id !== userId)
  safeSetStorage(DELETED_USERS_STORAGE_KEY, list)
}

/**
 * Safe Supabase Client Initializer:
 * Avoids uncaught fatal exceptions when environment variables are not set during local mock development.
 */
function getSafeSupabaseClient() {
  try {
    return createClient()
  } catch (err) {
    // Only log once in dev without spamming
    return null
  }
}

// =============================================================================
// USER SERVICE
// =============================================================================
export async function fetchUsers(): Promise<UserProfile[]> {
  const deletedIds = getDeletedUserIds()
  const statusMap = getUserStatusMap()
  const passwordMap = getUserPasswordsMap()
  const profileOverrides = getUserProfileOverrides()
  const registeredUsers = getRegisteredUsers()

  const enrichUser = (u: UserProfile): UserProfile => {
    const override = profileOverrides[u.user_id] || {}
    return {
      ...u,
      ...override,
      status: statusMap[u.user_id] || override.status || u.status || 'approved',
      password: passwordMap[u.user_id] || override.password || u.password || 'password123'
    }
  }

  let baseUsers: UserProfile[] = []

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await (supabase.from('users') as any)
        .select('*')
        .order('management_order', { ascending: true })

      if (!error && data && data.length > 0) {
        baseUsers = data as UserProfile[]
      } else if (error) {
        console.warn('[okr-service] fetchUsers error:', error.message)
      }
    } catch (err) {
      console.warn('[okr-service] fetchUsers exception:', err)
    }
  }

  if (baseUsers.length === 0) {
    baseUsers = inMemoryUsers
  }

  // Merge registered users from localStorage to ensure NO registered applicant is ever lost
  const mergedMap = new Map<string, UserProfile>()
  baseUsers.forEach(u => mergedMap.set(u.user_id, u))
  registeredUsers.forEach(u => mergedMap.set(u.user_id, u))

  return Array.from(mergedMap.values())
    .filter(u => !deletedIds.includes(u.user_id))
    .map(enrichUser)
}

export async function updateUserRoleRecord(userId: string, role: UserRole): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('users') as any).update({ role }).eq('user_id', userId)
      if (error) console.warn('[okr-service] updateUserRoleRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] updateUserRoleRecord exception:', err)
    }
  }

  const user = inMemoryUsers.find(u => u.user_id === userId)
  if (user) {
    user.role = role
  }

  const regUsers = getRegisteredUsers()
  const regUser = regUsers.find(u => u.user_id === userId)
  if (regUser) {
    regUser.role = role
    saveRegisteredUser(regUser)
  }
}

export async function updateUserPasswordRecord(userId: string, newPassword: string): Promise<void> {
  setUserPasswordInMap(userId, newPassword)

  // Update inMemoryUsers
  const user = inMemoryUsers.find(u => u.user_id === userId)
  if (user) {
    user.password = newPassword
  }

  // Update registeredUsers in localStorage if present
  const regUsers = getRegisteredUsers()
  const regUser = regUsers.find(u => u.user_id === userId)
  if (regUser) {
    regUser.password = newPassword
    saveRegisteredUser(regUser)
  }

  // Update in Supabase
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('users') as any)
        .update({ password: newPassword, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      if (error) console.warn('[okr-service] updateUserPasswordRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] updateUserPasswordRecord exception:', err)
    }
  }
}

export async function deleteUserRecord(userId: string): Promise<void> {
  recordDeletedUserId(userId)

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('users') as any).delete().eq('user_id', userId)
      if (error) console.warn('[okr-service] deleteUserRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] deleteUserRecord exception:', err)
    }
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

  const regUsers = getRegisteredUsers().filter(u => u.user_id !== userId)
  safeSetStorage(REGISTERED_USERS_STORAGE_KEY, regUsers)
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

  // 1. Save in local override storage for persistent hydration
  saveUserProfileOverride(userId, sanitizedUpdates)

  // 2. Update inMemoryUsers
  const user = inMemoryUsers.find(u => u.user_id === userId)
  if (user) {
    Object.assign(user, sanitizedUpdates)
  }

  // 3. Update registeredUsers if applicable
  const regUsers = getRegisteredUsers()
  const regUser = regUsers.find(u => u.user_id === userId)
  if (regUser) {
    Object.assign(regUser, sanitizedUpdates)
    saveRegisteredUser(regUser)
  }

  // 4. Update in Supabase
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('users') as any)
        .update(sanitizedUpdates)
        .eq('user_id', userId)
      if (error) console.warn('[okr-service] updateUserProfileRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] updateUserProfileRecord exception:', err)
    }
  }

  return user || null
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
  const newId = crypto.randomUUID()
  const computedFirstName = userData.first_name || (userData.name ? userData.name.split(' ')[0] : 'อาจารย์')
  const computedLastName = userData.last_name || (userData.name ? userData.name.split(' ').slice(1).join(' ') || 'ประจำภาควิชา' : 'ประจำภาควิชา')
  const computedName = userData.name || `${computedFirstName} ${computedLastName}`
  const computedUsername = userData.username || userData.email.split('@')[0]
  const userStatus = userData.status || 'pending'
  const userPassword = userData.password || 'password123'
  const userAvatar = userData.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`

  setUserStatusInMap(newId, userStatus)
  setUserPasswordInMap(newId, userPassword)

  const newUser: UserProfile = {
    user_id: newId,
    username: computedUsername,
    name: computedName,
    email: userData.email.toLowerCase().trim(),
    password: userPassword,
    first_name: computedFirstName,
    last_name: computedLastName,
    position: userData.position || 'อาจารย์ประจำภาควิชา',
    department: userData.department || 'ภาควิชาวิทยาการคอมพิวเตอร์',
    role: userData.role || 'teacher',
    admin_type: null,
    executive_level: null,
    employment_status: 'Full-Time',
    management_order: userData.role === 'executive' ? 2 : userData.role === 'head_okr' ? 3 : 4,
    avatar_url: userAvatar,
    status: userStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Always save in localStorage so admin sees it regardless of DB failures
  saveRegisteredUser(newUser)

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('users') as any).insert(newUser)
      if (error) console.warn('[okr-service] registerUserRecord db insert warning:', error.message)
    } catch (err) {
      console.warn('[okr-service] registerUserRecord exception:', err)
    }
  }

  inMemoryUsers.push(newUser)
  unrecordDeletedUserId(newId)
  return newUser
}

export async function approveUserRecord(userId: string, assignedRole?: UserRole): Promise<UserProfile> {
  setUserStatusInMap(userId, 'approved')
  const user = inMemoryUsers.find(u => u.user_id === userId)
  if (user) {
    user.status = 'approved'
    if (assignedRole) {
      user.role = assignedRole
      user.management_order = assignedRole === 'executive' ? 2 : assignedRole === 'head_okr' ? 3 : 4
    }
  }

  const regUsers = getRegisteredUsers()
  const regUser = regUsers.find(u => u.user_id === userId)
  if (regUser) {
    regUser.status = 'approved'
    if (assignedRole) {
      regUser.role = assignedRole
      regUser.management_order = assignedRole === 'executive' ? 2 : assignedRole === 'head_okr' ? 3 : 4
    }
    saveRegisteredUser(regUser)
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const updatePayload: any = { status: 'approved' }
      if (assignedRole) {
        updatePayload.role = assignedRole
        updatePayload.management_order = assignedRole === 'executive' ? 2 : assignedRole === 'head_okr' ? 3 : 4
      }
      const { error } = await (supabase.from('users') as any).update(updatePayload).eq('user_id', userId)
      if (error) console.warn('[okr-service] approveUserRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] approveUserRecord exception:', err)
    }
  }

  return user || (await fetchUsers()).find(u => u.user_id === userId)!
}

export async function rejectUserRecord(userId: string): Promise<void> {
  setUserStatusInMap(userId, 'rejected')
  const user = inMemoryUsers.find(u => u.user_id === userId)
  if (user) {
    user.status = 'rejected'
  }

  const regUsers = getRegisteredUsers()
  const regUser = regUsers.find(u => u.user_id === userId)
  if (regUser) {
    regUser.status = 'rejected'
    saveRegisteredUser(regUser)
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('users') as any).update({ status: 'rejected' }).eq('user_id', userId)
      if (error) console.warn('[okr-service] rejectUserRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] rejectUserRecord exception:', err)
    }
  }
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
    try {
      let query = (supabase.from('okrs') as any).select('*')
      if (year) {
        query = query.eq('year', year)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        return data as OKR[]
      }
      if (error) console.warn('[okr-service] fetchOKRs error:', error.message)
    } catch (err) {
      console.warn('[okr-service] fetchOKRs exception:', err)
    }
  }

  return year ? inMemoryOKRs.filter(o => o.year === year) : inMemoryOKRs
}

// =============================================================================
// PROJECT SERVICE
// =============================================================================
export async function fetchProjects(filters?: {
  year?: number
  department?: string
  status?: string
}): Promise<ProjectWithHeadAndAssignees[]> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
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
      if (!error && data && data.length > 0) {
        return data as unknown as ProjectWithHeadAndAssignees[]
      }
      if (error) console.warn('[okr-service] fetchProjects error:', error.message)
    } catch (err) {
      console.warn('[okr-service] fetchProjects exception:', err)
    }
  }

  return filterMemoryProjects(filters)
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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('projects') as any).insert({
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
      if (error) console.warn('[okr-service] createProjectRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] createProjectRecord exception:', err)
    }
  }

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
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('projects') as any)
        .update({
          progress_percentage: progress,
          bottleneck: bottleneck,
          status: status,
          spent_amount: spent,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
      if (error) console.warn('[okr-service] updateProjectProgressRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] updateProjectProgressRecord exception:', err)
    }
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
    try {
      const { error } = await (supabase.from('evidences') as any).insert(newEvidence)
      if (error) console.warn('[okr-service] uploadEvidenceRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] uploadEvidenceRecord exception:', err)
    }
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
    try {
      const { error } = await (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId)
      if (error) console.warn('[okr-service] deleteEvidenceRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] deleteEvidenceRecord exception:', err)
    }
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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    try {
      const { error } = await (supabase.from('evidence_submissions') as any).insert(newSubmission)
      if (error) console.warn('[okr-service] submitEvidenceSubmission error:', error.message)
    } catch (err) {
      console.warn('[okr-service] submitEvidenceSubmission exception:', err)
    }
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
    try {
      await (supabase.from('evidence_submissions') as any).delete().eq('evidence_id', evidenceId)
      await (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId)
    } catch (err) {
      console.warn('[okr-service] deleteEvidenceSubmission exception:', err)
    }
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
    try {
      const { error } = await (supabase.from('project_assignments') as any).insert(assignment)
      if (error) console.warn('[okr-service] assignProjectRole error:', error.message)
    } catch (err) {
      console.warn('[okr-service] assignProjectRole exception:', err)
    }
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
    try {
      const { error } = await (supabase.from('project_assignments') as any).delete().eq('assignment_id', assignmentId)
      if (error) console.warn('[okr-service] removeProjectRole error:', error.message)
    } catch (err) {
      console.warn('[okr-service] removeProjectRole exception:', err)
    }
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
    try {
      const { data, error } = await (supabase.from('dashboard') as any)
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        return data as DashboardReport[]
      }
      if (error) console.warn('[okr-service] fetchDashboardReports error:', error.message)
    } catch (err) {
      console.warn('[okr-service] fetchDashboardReports exception:', err)
    }
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
    try {
      const { error } = await (supabase.from('dashboard') as any).insert(newReport)
      if (error) console.warn('[okr-service] createDashboardReport error:', error.message)
    } catch (err) {
      console.warn('[okr-service] createDashboardReport exception:', err)
    }
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
    try {
      const { data, error } = await (supabase.from('normal_reports') as any)
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        return data as NormalReport[]
      }
      if (error) console.warn('[okr-service] fetchNormalReports error:', error.message)
    } catch (err) {
      console.warn('[okr-service] fetchNormalReports exception:', err)
    }
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
    try {
      const { error } = await (supabase.from('normal_reports') as any).insert(newReport)
      if (error) console.warn('[okr-service] createNormalReport error:', error.message)
    } catch (err) {
      console.warn('[okr-service] createNormalReport exception:', err)
    }
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
    try {
      let query = (supabase.from('evaluations') as any).select('*')
      if (filter?.report_id) {
        query = query.eq('report_id', filter.report_id)
      }
      if (filter?.dashboard_id) {
        query = query.eq('dashboard_id', filter.dashboard_id)
      }
      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data as Evaluation[]
      }
      if (error) console.warn('[okr-service] fetchEvaluations error:', error.message)
    } catch (err) {
      console.warn('[okr-service] fetchEvaluations exception:', err)
    }
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
    try {
      const { error } = await (supabase.from('evaluations') as any).insert(evaluation)
      if (error) console.warn('[okr-service] saveEvaluationRecord error:', error.message)
    } catch (err) {
      console.warn('[okr-service] saveEvaluationRecord exception:', err)
    }
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
