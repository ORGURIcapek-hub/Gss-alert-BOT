import { mockProjectAssignments } from '@/lib/mock-data'
import { ProjectAssignment } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall } from './service-helpers'
import { getInMemoryUsers } from './user-service'
import { getInMemoryProjects, setInMemoryProjects, notifyProjectsChannel } from './project-service'

let inMemoryProjectAssignments: ProjectAssignment[] = [...mockProjectAssignments]

/** Fetch project assignments */
export async function fetchProjectAssignments(projectId?: string): Promise<ProjectAssignment[]> {
  // Check persistent API first
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        if (data?.success && Array.isArray(data.assignments)) {
          inMemoryProjectAssignments = data.assignments
          if (projectId) {
            return data.assignments.filter((a: ProjectAssignment) => a.project_id === projectId)
          }
          return data.assignments
        }
      }
    } catch {}
  }

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
    } catch {}
  }

  return projectId
    ? inMemoryProjectAssignments.filter(a => a.project_id === projectId)
    : inMemoryProjectAssignments
}

/** Assign a project role (Head or Member) and persist to server */
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

  // Persist to Server API /api/projects
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_role',
          project_id: data.project_id,
          user_id: data.user_id,
          role_type: data.role_type,
          assigned_by: data.assigned_by
        })
      })
    } catch (e) {
      console.warn('[assignment-service] POST /api/projects failed, fallback to local', e)
    }
  }

  // Remove existing assignment of this user in this project if any
  inMemoryProjectAssignments = inMemoryProjectAssignments.filter(
    a => !(a.project_id === data.project_id && a.user_id === data.user_id)
  )
  inMemoryProjectAssignments.unshift(assignment)

  // Update inMemoryProjects assignees or head
  const projects = getInMemoryProjects()
  const users = getInMemoryUsers()
  const targetUser = users.find(u => u.user_id === data.user_id) || null

  const updatedProjects = projects.map(p => {
    if (p.project_id === data.project_id) {
      if (data.role_type === 'Head') {
        return {
          ...p,
          head_of_project: data.user_id,
          head: targetUser || p.head
        }
      } else {
        const assignees = p.assignees ? [...p.assignees] : []
        const exists = assignees.some(a => a.user_id === data.user_id)
        if (!exists) {
          assignees.push({
            project_id: data.project_id,
            user_id: data.user_id,
            assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)',
            assigned_date: new Date().toISOString(),
            user: targetUser || undefined
          })
        }
        return {
          ...p,
          assignees
        }
      }
    }
    return p
  })

  setInMemoryProjects(updatedProjects)
  notifyProjectsChannel()
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
    const updatedProjects = projects.map(p => {
      if (p.project_id === target.project_id && p.assignees) {
        return {
          ...p,
          assignees: p.assignees.filter(a => a.user_id !== target.user_id)
        }
      }
      return p
    })
    setInMemoryProjects(updatedProjects)
    notifyProjectsChannel()
  }
}
