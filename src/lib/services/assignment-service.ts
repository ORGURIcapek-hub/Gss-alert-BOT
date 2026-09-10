import { mockProjectAssignments } from '@/lib/mock-data'
import { ProjectAssignment } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall } from './service-helpers'
import { getInMemoryUsers } from './user-service'
import { getInMemoryProjects } from './project-service'

let inMemoryProjectAssignments: ProjectAssignment[] = [...mockProjectAssignments]

/** Fetch project assignments */
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
      if (error) console.warn('[assignment-service] fetchProjectAssignments error:', error.message)
    } catch (err) {
      console.warn('[assignment-service] fetchProjectAssignments exception:', err)
    }
  }

  return projectId
    ? inMemoryProjectAssignments.filter(a => a.project_id === projectId)
    : inMemoryProjectAssignments
}

/** Assign a project role (Head or Member) */
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
  const projects = getInMemoryProjects()
  const users = getInMemoryUsers()
  const proj = projects.find(p => p.project_id === data.project_id)
  const targetUser = users.find(u => u.user_id === data.user_id) || null

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

/** Remove a project role assignment */
export async function removeProjectRole(assignmentId: string): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('project_assignments') as any).delete().eq('assignment_id', assignmentId), 'removeProjectRole')
  }

  const target = inMemoryProjectAssignments.find(a => a.assignment_id === assignmentId)
  if (target) {
    inMemoryProjectAssignments = inMemoryProjectAssignments.filter(a => a.assignment_id !== assignmentId)
    const projects = getInMemoryProjects()
    const proj = projects.find(p => p.project_id === target.project_id)
    if (proj && proj.assignees) {
      proj.assignees = proj.assignees.filter(a => a.user_id !== target.user_id)
    }
  }
}
