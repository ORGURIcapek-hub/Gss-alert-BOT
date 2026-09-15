import { mockProjectAssignments } from '@/lib/mock-data'
import { ProjectAssignment } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall, fetchWithDeduplication, invalidateApiCache } from './service-helpers'
import { getInMemoryUsers } from './user-service'
import { getInMemoryProjects, setInMemoryProjects, notifyProjectsChannel } from './project-service'

let inMemoryProjectAssignments: ProjectAssignment[] = [...mockProjectAssignments]

export async function fetchProjectAssignments(projectId?: string): Promise<ProjectAssignment[]> {
  if (typeof window !== 'undefined') {
    try {
      const data = await fetchWithDeduplication<{ success: boolean; assignments: ProjectAssignment[] }>(
        '/api/projects?include=assignments',
        { ttl: 2500 }
      )
      if (data?.success && Array.isArray(data.assignments)) {
        inMemoryProjectAssignments = data.assignments
        if (projectId) {
          return data.assignments.filter((a: ProjectAssignment) => a.project_id === projectId)
        }
        return data.assignments
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

export async function assignProjectRoles(data: {
  project_id: string
  user_ids: string[]
  role_type: 'Head' | 'Member'
  assigned_by?: string
}): Promise<ProjectAssignment[]> {
  if (!data.user_ids || data.user_ids.length === 0) return []

  const newAssignments: ProjectAssignment[] = data.user_ids.map(uId => ({
    assignment_id: crypto.randomUUID(),
    project_id: data.project_id,
    user_id: uId,
    role_type: data.role_type,
    assigned_by: data.assigned_by || null,
    created_at: new Date().toISOString()
  }))

  invalidateApiCache('/api/projects')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_role',
          project_id: data.project_id,
          user_ids: data.user_ids,
          role_type: data.role_type,
          assigned_by: data.assigned_by
        })
      })
    } catch (e) {
      console.warn('[assignment-service] POST /api/projects failed, fallback to local', e)
    }
  }

  const assignedIdSet = new Set(data.user_ids)
  inMemoryProjectAssignments = inMemoryProjectAssignments.filter(
    a => {
      if (a.project_id !== data.project_id) return true
      if (assignedIdSet.has(a.user_id)) return false
      if (data.role_type === 'Head' && a.role_type === 'Head') return false
      return true
    }
  )
  inMemoryProjectAssignments = [...newAssignments, ...inMemoryProjectAssignments]

  const projects = getInMemoryProjects()
  const users = getInMemoryUsers()

  const updatedProjects = projects.map(p => {
    if (p.project_id === data.project_id) {
      if (data.role_type === 'Head') {
        const firstHead = users.find(u => u.user_id === data.user_ids[0]) || null
        return {
          ...p,
          head_of_project: data.user_ids[0],
          head: firstHead || p.head
        }
      } else {
        const assignees = p.assignees ? [...p.assignees] : []
        for (const uId of data.user_ids) {
          const exists = assignees.some(a => a.user_id === uId)
          if (!exists) {
            const targetUser = users.find(u => u.user_id === uId) || null
            assignees.push({
              project_id: data.project_id,
              user_id: uId,
              assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)',
              assigned_date: new Date().toISOString(),
              user: targetUser || undefined
            })
          }
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
  return newAssignments
}

export async function assignProjectRole(data: {
  project_id: string
  user_id: string
  role_type: 'Head' | 'Member'
  assigned_by?: string
}): Promise<ProjectAssignment> {
  const res = await assignProjectRoles({
    project_id: data.project_id,
    user_ids: [data.user_id],
    role_type: data.role_type,
    assigned_by: data.assigned_by
  })
  return res[0]
}

export async function removeProjectRole(assignmentId: string): Promise<void> {
  invalidateApiCache('/api/projects')

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

export function clearProjectAssignmentsFromMemory(projectId: string): void {
  inMemoryProjectAssignments = inMemoryProjectAssignments.filter(a => a.project_id !== projectId)
}
