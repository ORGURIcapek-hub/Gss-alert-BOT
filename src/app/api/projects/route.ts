import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ProjectWithHeadAndAssignees, ProjectAssignment, ProjectStatus, UserProfile } from '@/types/database.types'
import { writeJsonAtomic, readJsonSafe } from '@/lib/atomic-storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-projects.json')
const USERS_FILE_PATH = path.join(DATA_DIR, 'persisted-users.json')
const EVIDENCES_FILE_PATH = path.join(DATA_DIR, 'persisted-evidences.json')
const NORMAL_REPORTS_FILE_PATH = path.join(DATA_DIR, 'persisted-normal-reports.json')
const EVALUATIONS_FILE_PATH = path.join(DATA_DIR, 'persisted-evaluations.json')
const DASHBOARD_REPORTS_FILE_PATH = path.join(DATA_DIR, 'persisted-dashboard-reports.json')
const OKRS_FILE_PATH = path.join(DATA_DIR, 'persisted-okrs.json')

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
  } catch { }
  return []
}

async function getStoredEvidences(): Promise<any[]> {
  try {
    if (fs.existsSync(EVIDENCES_FILE_PATH)) {
      const content = await fs.promises.readFile(EVIDENCES_FILE_PATH, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.evidences)) {
        return parsed.evidences
      }
    }
  } catch { }
  return []
}

async function getStoredOKRs(): Promise<any[]> {
  try {
    if (fs.existsSync(OKRS_FILE_PATH)) {
      const content = await fs.promises.readFile(OKRS_FILE_PATH, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.okrs)) {
        return parsed.okrs
      }
    }
  } catch { }
  return []
}

async function ensureDataFile(): Promise<ProjectStorageSchema> {
  if (memoryCache) return memoryCache

  const fallback: ProjectStorageSchema = {
    projects: [],
    assignments: [],
    deletedProjectIds: []
  }

  const data = await readJsonSafe<ProjectStorageSchema | null>(FILE_PATH, null)
  if (data && Array.isArray(data.projects)) {
    memoryCache = {
      projects: data.projects,
      assignments: Array.isArray(data.assignments) ? data.assignments : [],
      deletedProjectIds: Array.isArray(data.deletedProjectIds) ? data.deletedProjectIds : []
    }
    return memoryCache
  }

  if (memoryCache) {
    return memoryCache
  }

  await writeJsonAtomic(FILE_PATH, fallback)
  memoryCache = fallback
  return memoryCache
}

async function saveStorage(data: ProjectStorageSchema): Promise<void> {
  memoryCache = data
  lastSupabaseProjectsSync = 0
  try {
    if (process.env.VERCEL) return
    await writeJsonAtomic(FILE_PATH, data)
  } catch (err) {
    console.warn('[api/projects] Error saving storage:', err)
  }
}

let lastSupabaseProjectsSync = 0
const SUPABASE_SYNC_INTERVAL = 10000

export async function GET(req: NextRequest) {
  try {
    const storage = await ensureDataFile()
    const supabase = getSafeSupabaseClient()
    const allUsers = await getStoredUsers()
    const storedEvidences = await getStoredEvidences()
    const storedOkrs = await getStoredOKRs()
    const shouldSyncSupabase = supabase && (Date.now() - lastSupabaseProjectsSync > SUPABASE_SYNC_INTERVAL)

    if (shouldSyncSupabase) {
      try {
        lastSupabaseProjectsSync = Date.now()
        const { data, error } = await supabase.from('projects').select(`
          *,
          okr:okrs!projects_okr_id_fkey(*),
          head:users!projects_head_of_project_fkey(*),
          assignments:project_assignments(*, user:users!project_assignments_user_id_fkey(*)),
          evidences(*)
        `)

        if (!error && data && data.length > 0) {
          const validSupabaseProjects = data.filter((p: any) => !storage.deletedProjectIds.includes(p.project_id))
          const supabaseIds = new Set(validSupabaseProjects.map((p: any) => p.project_id))
          const localOnly = storage.projects.filter(p => !storage.deletedProjectIds.includes(p.project_id) && !supabaseIds.has(p.project_id))
          const merged = [
            ...validSupabaseProjects.map((sp: any) => {
              const localProj = storage.projects.find(lp => lp.project_id === sp.project_id)
              const remoteAssignments: any[] = Array.isArray(sp.assignments) ? sp.assignments : []
              const headAssignment = remoteAssignments.find(a => a.role_type === 'Head')
              const remoteHead = sp.head || (headAssignment
                ? (headAssignment.user || allUsers.find(u => u.user_id === headAssignment.user_id) || null)
                : null)
              const remoteAssignees = remoteAssignments
                .filter(a => a.role_type === 'Member')
                .map(a => ({
                  project_id: sp.project_id,
                  user_id: a.user_id,
                  assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)',
                  assigned_date: a.created_at,
                  user: a.user || allUsers.find(u => u.user_id === a.user_id) || undefined
                }))
              const localAssignees = localProj?.assignees || []
              const assigneeMap = new Map()
              for (const la of localAssignees) assigneeMap.set(la.user_id, la)
              for (const ra of remoteAssignees) {
                if (!assigneeMap.has(ra.user_id)) assigneeMap.set(ra.user_id, ra)
              }
              const localEvs = localProj?.evidences || []
              const spEvs = sp.evidences || []
              const fileEvs = storedEvidences
                .filter(e => e.project_id === sp.project_id)
                .map(e => ({
                  evidence_id: e.evidence_id,
                  project_id: e.project_id,
                  uploaded_by: e.sender_id,
                  file_name: e.file_name,
                  file_path: e.file_path,
                  file_size: e.file_size || 1024 * 1024 * 2,
                  description: e.description || `แนบหลักฐานไฟล์ ${e.file_name}`,
                  upload_date: e.submitted_at || new Date().toISOString()
                }))
              const evMap = new Map()
              for (const le of localEvs) evMap.set(le.evidence_id, le)
              for (const se of spEvs) evMap.set(se.evidence_id, se)
              for (const fe of fileEvs) evMap.set(fe.evidence_id, fe)

              const projectYear = sp.year || sp.okr?.year || (sp.start_date ? new Date(sp.start_date).getFullYear() + 543 : 2568)

              const { assignments: _remoteAssignments, ...spRest } = sp
              return {
                ...spRest,
                year: projectYear,
                head: remoteHead,
                head_of_project: headAssignment ? headAssignment.user_id : sp.head_of_project,
                assignees: Array.from(assigneeMap.values()),
                evidences: Array.from(evMap.values())
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

    const validProjects = storage.projects
      .filter(p => !storage.deletedProjectIds.includes(p.project_id))
      .map(p => {
        const head = (p.head_of_project ? allUsers.find(u => u.user_id === p.head_of_project) : null) || p.head || null
        const assignees = (p.assignees || []).map(a => ({
          ...a,
          user: a.user || allUsers.find(u => u.user_id === a.user_id) || undefined
        }))

        const projectEvidences = p.evidences || []
        const matchedEvs = storedEvidences
          .filter(e => e.project_id === p.project_id)
          .map(e => ({
            evidence_id: e.evidence_id,
            project_id: e.project_id,
            uploaded_by: e.sender_id,
            file_name: e.file_name,
            file_path: e.file_path,
            file_size: e.file_size || 1024 * 1024 * 2,
            description: e.description || `แนบหลักฐานไฟล์ ${e.file_name}`,
            upload_date: e.submitted_at || new Date().toISOString()
          }))

        const evMap = new Map()
        for (const ev of projectEvidences) evMap.set(ev.evidence_id, ev)
        for (const ev of matchedEvs) evMap.set(ev.evidence_id, ev)

        const okr = storedOkrs.find(o => o.okr_id === p.okr_id) || p.okr || null
        const projectYear = p.year || okr?.year || (p.start_date ? new Date(p.start_date).getFullYear() + 543 : 2568)

        return {
          ...p,
          okr,
          year: projectYear,
          head,
          assignees,
          evidences: Array.from(evMap.values())
        }
      })

    const validAssignments = (storage.assignments || []).filter(a => !storage.deletedProjectIds.includes(a.project_id))

    return NextResponse.json({
      success: true,
      projects: validProjects,
      assignments: validAssignments
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    const storage = await ensureDataFile()
    const allUsers = await getStoredUsers()
    const supabase = getSafeSupabaseClient()

    if (action === 'create_project') {
      const { project } = body
      if (!project || !project.project_id || !project.project_name) {
        return NextResponse.json({ success: false, error: 'Missing required project data' }, { status: 400 })
      }

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

    if (action === 'assign_role' || action === 'assign_roles') {
      const { project_id, user_id, user_ids, role_type, assigned_by } = body
      const targetUserIds: string[] = Array.isArray(user_ids) && user_ids.length > 0
        ? user_ids
        : (user_id ? [user_id] : [])

      if (!project_id || targetUserIds.length === 0 || !role_type) {
        return NextResponse.json({ success: false, error: 'Missing assignment parameters' }, { status: 400 })
      }
      if (role_type !== 'Head' && role_type !== 'Member') {
        return NextResponse.json({ success: false, error: 'ประเภทบทบาทไม่ถูกต้อง' }, { status: 400 })
      }
      if (role_type === 'Head' && targetUserIds.length > 1) {
        return NextResponse.json({ success: false, error: 'หัวหน้าโครงการระบุได้ครั้งละ 1 คน' }, { status: 400 })
      }

      const newAssignments: ProjectAssignment[] = targetUserIds.map((uId: string) => ({
        assignment_id: crypto.randomUUID(),
        project_id,
        user_id: uId,
        role_type,
        assigned_by: assigned_by || null,
        created_at: new Date().toISOString()
      }))

      const assignedIdSet = new Set(targetUserIds)

      storage.assignments = [
        ...newAssignments,
        ...storage.assignments.filter(a => {
          if (a.project_id !== project_id) return true
          if (assignedIdSet.has(a.user_id)) return false
          if (role_type === 'Head' && a.role_type === 'Head') return false
          return true
        })
      ]

      storage.projects = storage.projects.map(p => {
        if (p.project_id === project_id) {
          if (role_type === 'Head') {
            const firstHeadId = targetUserIds[0]
            const targetUser = allUsers.find(u => u.user_id === firstHeadId) || null
            return {
              ...p,
              head_of_project: firstHeadId,
              head: targetUser || p.head,
              updated_at: new Date().toISOString()
            }
          } else {
            const assignees = p.assignees ? [...p.assignees] : []
            for (const uId of targetUserIds) {
              const exists = assignees.some(a => a.user_id === uId)
              if (!exists) {
                const targetUser = allUsers.find(u => u.user_id === uId) || null
                assignees.push({
                  project_id,
                  user_id: uId,
                  assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)',
                  assigned_date: new Date().toISOString(),
                  user: targetUser || undefined
                })
              }
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
          await supabase.from('project_assignments').delete().eq('project_id', project_id).in('user_id', targetUserIds)
          if (role_type === 'Head') {
            await supabase.from('project_assignments').delete().eq('project_id', project_id).eq('role_type', 'Head')
          }
          await supabase.from('project_assignments').insert(newAssignments)
          if (role_type === 'Head') {
            await supabase.from('projects').update({ head_of_project: targetUserIds[0] }).eq('project_id', project_id)
          }
        } catch (e) {
          console.warn('[api/projects] Supabase assignment error:', e)
        }
      }

      const updatedProject = storage.projects.find(p => p.project_id === project_id)
      return NextResponse.json({
        success: true,
        assignment: newAssignments[0],
        assignments: newAssignments,
        project: updatedProject
      })
    }

    if (action === 'update_project_okr') {
      const { project_id, okr_id } = body
      if (!project_id || !okr_id) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 })
      }

      if (supabase) {
        try {
          const { data: okrExists } = await supabase.from('okrs').select('okr_id').eq('okr_id', okr_id).maybeSingle()
          if (!okrExists) {
            return NextResponse.json({ success: false, error: 'ไม่พบ OKR ที่ระบุ' }, { status: 400 })
          }
        } catch (e) {
          console.warn('[api/projects] Supabase okr check error:', e)
        }
      }

      if (!storage.projects.some(p => p.project_id === project_id)) {
        return NextResponse.json({ success: false, error: 'ไม่พบโครงการที่ระบุ' }, { status: 404 })
      }

      storage.projects = storage.projects.map(p => {
        if (p.project_id === project_id) {
          return {
            ...p,
            okr_id,
            updated_at: new Date().toISOString()
          }
        }
        return p
      })

      await saveStorage(storage)

      if (supabase) {
        try {
          await supabase.from('projects').update({ okr_id, updated_at: new Date().toISOString() }).eq('project_id', project_id)
        } catch (e) {
          console.warn('[api/projects] Supabase update okr_id error:', e)
        }
      }

      const updatedProject = storage.projects.find(p => p.project_id === project_id)
      return NextResponse.json({ success: true, project: updatedProject })
    }

    if (action === 'update_progress') {
      const { project_id, bottleneck, status, spent } = body
      const progress = Math.min(100, Math.max(0, Math.round(Number(body.progress) || 0)))
      if (!project_id) {
        return NextResponse.json({ success: false, error: 'Missing project_id' }, { status: 400 })
      }
      const validStatuses = ['Draft', 'In Progress', 'Delayed', 'Completed', 'On Hold']
      if (status !== undefined && status !== null && !validStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: 'สถานะโครงการไม่ถูกต้อง' }, { status: 400 })
      }
      if (!storage.projects.some(p => p.project_id === project_id)) {
        return NextResponse.json({ success: false, error: 'ไม่พบโครงการที่ระบุ' }, { status: 404 })
      }
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
          const remoteUpdate: Record<string, unknown> = {
            progress_percentage: progress,
            updated_at: new Date().toISOString()
          }
          if (bottleneck !== undefined) remoteUpdate.bottleneck = bottleneck
          if (status) remoteUpdate.status = status
          if (spent !== undefined) remoteUpdate.spent_amount = spent
          await supabase
            .from('projects')
            .update(remoteUpdate)
            .eq('project_id', project_id)
        } catch (e) {
          console.warn('[api/projects] Supabase update progress error:', e)
        }
      }

      return NextResponse.json({ success: true })
    }

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
              description: submission.description || null,
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

      try {
        if (fs.existsSync(NORMAL_REPORTS_FILE_PATH)) {
          await writeJsonAtomic(NORMAL_REPORTS_FILE_PATH, { reports: [] })
        }
      } catch { }

      try {
        if (fs.existsSync(EVALUATIONS_FILE_PATH)) {
          await writeJsonAtomic(EVALUATIONS_FILE_PATH, { evaluations: [] })
        }
      } catch { }

      try {
        if (fs.existsSync(EVIDENCES_FILE_PATH)) {
          await writeJsonAtomic(EVIDENCES_FILE_PATH, { evidences: [] })
        }
      } catch { }

      try {
        if (fs.existsSync(DASHBOARD_REPORTS_FILE_PATH)) {
          const dashContent = await fs.promises.readFile(DASHBOARD_REPORTS_FILE_PATH, 'utf-8')
          const dashParsed = JSON.parse(dashContent)
          if (dashParsed && Array.isArray(dashParsed.reports)) {
            dashParsed.reports = dashParsed.reports.map((r: any) => ({
              ...r,
              project_ids: [],
              project_snapshots: []
            }))
            await writeJsonAtomic(DASHBOARD_REPORTS_FILE_PATH, dashParsed)
          }
        }
      } catch { }

      if (supabase) {
        try {
          await supabase.from('evaluations').delete().neq('eval_id', '00000000-0000-0000-0000-000000000000')
        } catch { }
        try {
          await supabase.from('normal_reports').delete().neq('report_id', '00000000-0000-0000-0000-000000000000')
        } catch { }
        try {
          await supabase.from('evidences').delete().neq('evidence_id', '00000000-0000-0000-0000-000000000000')
        } catch { }
        try {
          await supabase.from('evidence_submissions').delete().neq('evidence_id', '00000000-0000-0000-0000-000000000000')
        } catch { }
        try {
          await supabase.from('project_assignments').delete().neq('assignment_id', '00000000-0000-0000-0000-000000000000')
        } catch { }
        try {
          await supabase.from('projects').delete().neq('project_id', '00000000-0000-0000-0000-000000000000')
        } catch { }
      }

      return NextResponse.json({ success: true, message: 'All projects cleared' })
    }

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }

    const targetProject = storage.projects.find(p => p.project_id === projectId)
    const targetProjectName = targetProject?.project_name?.trim()

    storage.projects = storage.projects.filter(p => p.project_id !== projectId)
    storage.assignments = storage.assignments.filter(a => a.project_id !== projectId)
    if (!storage.deletedProjectIds.includes(projectId)) {
      storage.deletedProjectIds.push(projectId)
    }
    await saveStorage(storage)

    const deletedReportIds: string[] = []

    try {
      if (fs.existsSync(NORMAL_REPORTS_FILE_PATH)) {
        const nrContent = await fs.promises.readFile(NORMAL_REPORTS_FILE_PATH, 'utf-8')
        const nrParsed = JSON.parse(nrContent)
        if (nrParsed && Array.isArray(nrParsed.reports)) {
          for (const r of nrParsed.reports) {
            const matchesId = r.project_id === projectId
            const matchesName = Boolean(targetProjectName && r.project_name && r.project_name.trim() === targetProjectName)
            if (matchesId || matchesName) {
              deletedReportIds.push(r.report_id)
            }
          }
          nrParsed.reports = nrParsed.reports.filter((r: any) => {
            const matchesId = r.project_id === projectId
            const matchesName = Boolean(targetProjectName && r.project_name && r.project_name.trim() === targetProjectName)
            return !matchesId && !matchesName
          })
          await writeJsonAtomic(NORMAL_REPORTS_FILE_PATH, nrParsed)
        }
      }
    } catch { }

    try {
      if (fs.existsSync(EVALUATIONS_FILE_PATH)) {
        const evalContent = await fs.promises.readFile(EVALUATIONS_FILE_PATH, 'utf-8')
        const evalParsed = JSON.parse(evalContent)
        if (evalParsed && Array.isArray(evalParsed.evaluations)) {
          evalParsed.evaluations = evalParsed.evaluations.filter((e: any) => {
            if (e.project_id === projectId) return false
            if (e.report_id && deletedReportIds.includes(e.report_id)) return false
            return true
          })
          await writeJsonAtomic(EVALUATIONS_FILE_PATH, evalParsed)
        }
      }
    } catch { }

    try {
      if (fs.existsSync(EVIDENCES_FILE_PATH)) {
        const evContent = await fs.promises.readFile(EVIDENCES_FILE_PATH, 'utf-8')
        const evParsed = JSON.parse(evContent)
        if (evParsed && Array.isArray(evParsed.evidences)) {
          evParsed.evidences = evParsed.evidences.filter((e: any) => e.project_id !== projectId)
          await writeJsonAtomic(EVIDENCES_FILE_PATH, evParsed)
        }
      }
    } catch { }

    try {
      if (fs.existsSync(DASHBOARD_REPORTS_FILE_PATH)) {
        const dashContent = await fs.promises.readFile(DASHBOARD_REPORTS_FILE_PATH, 'utf-8')
        const dashParsed = JSON.parse(dashContent)
        if (dashParsed && Array.isArray(dashParsed.reports)) {
          dashParsed.reports = dashParsed.reports.map((r: any) => ({
            ...r,
            project_ids: (r.project_ids || []).filter((id: string) => id !== projectId),
            project_snapshots: (r.project_snapshots || []).filter((s: any) => s.project_id !== projectId)
          }))
          await writeJsonAtomic(DASHBOARD_REPORTS_FILE_PATH, dashParsed)
        }
      }
    } catch { }

    if (supabase) {
      for (const repId of deletedReportIds) {
        try {
          await supabase.from('evaluations').delete().eq('report_id', repId)
        } catch { }
      }
      try {
        await supabase.from('evaluations').delete().eq('project_id', projectId)
      } catch { }
      try {
        await supabase.from('normal_reports').delete().eq('project_id', projectId)
      } catch { }
      if (targetProjectName) {
        try {
          await supabase.from('normal_reports').delete().eq('project_name', targetProjectName)
        } catch { }
      }
      try {
        await supabase.from('evidences').delete().eq('project_id', projectId)
      } catch { }
      try {
        await supabase.from('evidence_submissions').delete().eq('project_id', projectId)
      } catch { }
      try {
        await supabase.from('project_assignments').delete().eq('project_id', projectId)
      } catch { }
      try {
        await supabase.from('projects').delete().eq('project_id', projectId)
      } catch { }
    }

    return NextResponse.json({ success: true, message: 'Project and associated reports deleted' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Delete error' }, { status: 500 })
  }
}
