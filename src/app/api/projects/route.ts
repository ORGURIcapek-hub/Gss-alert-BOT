import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ProjectWithHeadAndAssignees, ProjectAssignment, ProjectStatus, UserProfile } from '@/types/database.types'

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-projects.json')
const USERS_FILE_PATH = path.join(DATA_DIR, 'persisted-users.json')

function getSafeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const { createClient } = require('@supabase/supabase-js')
    return createClient(url, key)
  } catch {
    return null
  }
}

interface ProjectStorageSchema {
  projects: ProjectWithHeadAndAssignees[]
  assignments: ProjectAssignment[]
  deletedProjectIds: string[]
}

let memoryCache: ProjectStorageSchema | null = null

async function getStoredUsers(): Promise<UserProfile[]> {
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const content = await fs.promises.readFile(USERS_FILE_PATH, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.users)) {
        return parsed.users
      }
    }
  } catch {}
  return []
}

async function ensureDataFile(): Promise<ProjectStorageSchema> {
  if (memoryCache) return memoryCache

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (fs.existsSync(FILE_PATH)) {
      const content = await fs.promises.readFile(FILE_PATH, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.projects)) {
        memoryCache = {
          projects: parsed.projects,
          assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
          deletedProjectIds: Array.isArray(parsed.deletedProjectIds) ? parsed.deletedProjectIds : []
        }
        return memoryCache
      }
    }

    const initialData: ProjectStorageSchema = {
      projects: [],
      assignments: [],
      deletedProjectIds: []
    }

    await fs.promises.writeFile(FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8')
    memoryCache = initialData
    return memoryCache
  } catch (err) {
    console.error('[api/projects] Error ensuring data file:', err)
    return {
      projects: [],
      assignments: [],
      deletedProjectIds: []
    }
  }
}

async function saveStorage(data: ProjectStorageSchema): Promise<void> {
  memoryCache = data
  try {
    if (process.env.VERCEL) return
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[api/projects] Error saving storage:', err)
  }
}

// =============================================================================
// GET: Fetch all active projects and optional assignments
// =============================================================================
export async function GET(req: NextRequest) {
  try {
    const storage = await ensureDataFile()
    const supabase = getSafeSupabaseClient()
    const allUsers = await getStoredUsers()

    // If Supabase is available, sync with Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase.from('projects').select(`
          *,
          okr:okrs!projects_okr_id_fkey(*),
          head:users!projects_head_of_project_fkey(*),
          assignees:project_assignees(*, user:users(*)),
          evidences(*)
        `)

        if (!error && data && data.length > 0) {
          const validSupabaseProjects = data.filter((p: any) => !storage.deletedProjectIds.includes(p.project_id))
          const supabaseIds = new Set(validSupabaseProjects.map((p: any) => p.project_id))
          const localOnly = storage.projects.filter(p => !storage.deletedProjectIds.includes(p.project_id) && !supabaseIds.has(p.project_id))
          const merged = [
            ...validSupabaseProjects.map((sp: any) => {
              const localProj = storage.projects.find(lp => lp.project_id === sp.project_id)
              const localEvs = localProj?.evidences || []
              const spEvs = sp.evidences || []
              const seen = new Set(spEvs.map((e: any) => e.evidence_id))
              const combined = [...spEvs]
              for (const le of localEvs) {
                if (!seen.has(le.evidence_id)) {
                  combined.push(le)
                }
              }
              return {
                ...sp,
                evidences: combined
              }
            }),
            ...localOnly
          ]
          storage.projects = merged
          await saveStorage(storage)
          return NextResponse.json({ success: true, projects: merged, assignments: storage.assignments })
        }
      } catch (err) {
        console.warn('[api/projects] Supabase fetch error, fallback to local', err)
      }
    }

    // Filter out deleted projects and enrich missing user heads / assignees
    const validProjects = storage.projects
      .filter(p => !storage.deletedProjectIds.includes(p.project_id))
      .map(p => {
        const head = p.head || allUsers.find(u => u.user_id === p.head_of_project) || null
        const assignees = (p.assignees || []).map(a => ({
          ...a,
          user: a.user || allUsers.find(u => u.user_id === a.user_id) || undefined
        }))
        return {
          ...p,
          head,
          assignees
        }
      })

    return NextResponse.json({
      success: true,
      projects: validProjects,
      assignments: storage.assignments
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST: Create Project, Assign Role, Update Progress, Upload Evidence
// =============================================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    const storage = await ensureDataFile()
    const allUsers = await getStoredUsers()
    const supabase = getSafeSupabaseClient()

    // 1. CREATE PROJECT
    if (action === 'create_project') {
      const { project } = body
      if (!project || !project.project_id || !project.project_name) {
        return NextResponse.json({ success: false, error: 'Missing required project data' }, { status: 400 })
      }

      // Enrich head and assignees
      const headUser = project.head || allUsers.find(u => u.user_id === project.head_of_project) || null
      const enrichedProject: ProjectWithHeadAndAssignees = {
        ...project,
        head: headUser,
        assignees: project.assignees || [],
        evidences: project.evidences || []
      }

      storage.projects = [enrichedProject, ...storage.projects.filter(p => p.project_id !== project.project_id)]
      await saveStorage(storage)

      if (supabase) {
        try {
          await supabase.from('projects').upsert({
            project_id: project.project_id,
            okr_id: project.okr_id,
            project_name: project.project_name,
            project_type: project.project_type,
            description: project.description,
            main_objective: project.main_objective,
            sub_objective: project.sub_objective,
            department: project.department,
            head_of_project: project.head_of_project,
            budget: project.budget,
            start_date: project.start_date,
            end_date: project.end_date,
            progress_percentage: project.progress_percentage || 0,
            spent_amount: project.spent_amount || 0,
            status: project.status || 'In Progress'
          })
        } catch (e) {
          console.warn('[api/projects] Supabase insert error:', e)
        }
      }

      return NextResponse.json({ success: true, project: enrichedProject })
    }

    // 2. ASSIGN ROLE (Head or Member)
    if (action === 'assign_role') {
      const { project_id, user_id, role_type, assigned_by } = body
      if (!project_id || !user_id || !role_type) {
        return NextResponse.json({ success: false, error: 'Missing assignment parameters' }, { status: 400 })
      }

      const targetUser = allUsers.find(u => u.user_id === user_id) || null
      const assignmentId = crypto.randomUUID()
      const newAssignment: ProjectAssignment = {
        assignment_id: assignmentId,
        project_id,
        user_id,
        role_type,
        assigned_by: assigned_by || null,
        created_at: new Date().toISOString()
      }

      // Remove existing assignment for same user & project
      storage.assignments = [
        newAssignment,
        ...storage.assignments.filter(a => !(a.project_id === project_id && a.user_id === user_id))
      ]

      // Update project in storage
      storage.projects = storage.projects.map(p => {
        if (p.project_id === project_id) {
          if (role_type === 'Head') {
            return {
              ...p,
              head_of_project: user_id,
              head: targetUser || p.head,
              updated_at: new Date().toISOString()
            }
          } else {
            const assignees = p.assignees ? [...p.assignees] : []
            const exists = assignees.some(a => a.user_id === user_id)
            if (!exists) {
              assignees.push({
                project_id,
                user_id,
                assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)',
                assigned_date: new Date().toISOString(),
                user: targetUser || undefined
              })
            }
            return {
              ...p,
              assignees,
              updated_at: new Date().toISOString()
            }
          }
        }
        return p
      })

      await saveStorage(storage)

      if (supabase) {
        try {
          await supabase.from('project_assignments').insert(newAssignment)
        } catch (e) {
          console.warn('[api/projects] Supabase assignment error:', e)
        }
      }

      const updatedProject = storage.projects.find(p => p.project_id === project_id)
      return NextResponse.json({ success: true, assignment: newAssignment, project: updatedProject })
    }

    // 3. UPDATE PROGRESS
    if (action === 'update_progress') {
      const { project_id, progress, bottleneck, status, spent } = body
      storage.projects = storage.projects.map(p => {
        if (p.project_id === project_id) {
          return {
            ...p,
            progress_percentage: progress,
            bottleneck: bottleneck !== undefined ? bottleneck : p.bottleneck,
            status: status || p.status,
            spent_amount: spent !== undefined ? spent : p.spent_amount,
            updated_at: new Date().toISOString()
          }
        }
        return p
      })

      await saveStorage(storage)

      if (supabase) {
        try {
          await supabase
            .from('projects')
            .update({
              progress_percentage: progress,
              bottleneck,
              status,
              spent_amount: spent,
              updated_at: new Date().toISOString()
            })
            .eq('project_id', project_id)
        } catch (e) {
          console.warn('[api/projects] Supabase update progress error:', e)
        }
      }

      return NextResponse.json({ success: true })
    }

    // 4. SUBMIT EVIDENCE
    if (action === 'submit_evidence') {
      const { submission } = body
      if (submission && submission.project_id) {
        const newEvId = submission.evidence_id || crypto.randomUUID()
        const newEv = {
          evidence_id: newEvId,
          project_id: submission.project_id,
          uploaded_by: submission.sender_id,
          file_name: submission.file_name,
          file_path: submission.file_path,
          file_size: submission.file_size || 1024 * 1024 * 2,
          description: submission.description || `แนบหลักฐานไฟล์ ${submission.file_name}`,
          upload_date: new Date().toISOString()
        }

        storage.projects = storage.projects.map(p => {
          if (p.project_id === submission.project_id) {
            const evidences = p.evidences ? [newEv, ...p.evidences.filter(e => e.evidence_id !== newEvId)] : [newEv]
            return { ...p, evidences }
          }
          return p
        })
        await saveStorage(storage)

        if (supabase) {
          try {
            await supabase.from('evidence_submissions').insert({
              evidence_id: newEvId,
              project_id: submission.project_id,
              sender_id: submission.sender_id,
              file_name: submission.file_name,
              file_path: submission.file_path,
              file_type: submission.file_type || 'application/pdf',
              submitted_at: new Date().toISOString()
            })
            await supabase.from('evidences').insert(newEv)
          } catch (e) {
            console.warn('[api/projects] Supabase submit evidence error:', e)
          }
        }
      }
      return NextResponse.json({ success: true })
    }

    // 5. DELETE EVIDENCE
    if (action === 'delete_evidence') {
      const { evidence_id, project_id } = body
      if (evidence_id) {
        storage.projects = storage.projects.map(p => {
          if (!project_id || p.project_id === project_id) {
            return {
              ...p,
              evidences: (p.evidences || []).filter(e => e.evidence_id !== evidence_id)
            }
          }
          return p
        })
        await saveStorage(storage)

        if (supabase) {
          try {
            await supabase.from('evidence_submissions').delete().eq('evidence_id', evidence_id)
            await supabase.from('evidences').delete().eq('evidence_id', evidence_id)
          } catch (e) {
            console.warn('[api/projects] Supabase delete evidence error:', e)
          }
        }
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 })
  }
}

// =============================================================================
// DELETE: Delete project or clear all
// =============================================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const clearAll = searchParams.get('clearAll')
    const storage = await ensureDataFile()
    const supabase = getSafeSupabaseClient()

    if (clearAll === 'true') {
      storage.projects = []
      storage.assignments = []
      storage.deletedProjectIds = []
      await saveStorage(storage)

      if (supabase) {
        try {
          await supabase.from('projects').delete().neq('project_id', '00000000-0000-0000-0000-000000000000')
        } catch {}
      }

      return NextResponse.json({ success: true, message: 'All projects cleared' })
    }

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }

    storage.projects = storage.projects.filter(p => p.project_id !== projectId)
    storage.assignments = storage.assignments.filter(a => a.project_id !== projectId)
    if (!storage.deletedProjectIds.includes(projectId)) {
      storage.deletedProjectIds.push(projectId)
    }
    await saveStorage(storage)

    if (supabase) {
      try {
        await supabase.from('projects').delete().eq('project_id', projectId)
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Project deleted' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Delete error' }, { status: 500 })
  }
}
