import { mockEvidenceSubmissions } from '@/lib/mock-data'
import { EvidenceSubmission, ProjectWithHeadAndAssignees, UserProfile, Evidence } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall, getCachedUsers } from './service-helpers'
import { getInMemoryUsers } from './user-service'
import { getInMemoryProjects, setInMemoryProjects, setCachedProjects, notifyProjectsChannel } from './project-service'

let inMemoryEvidenceSubmissions: EvidenceSubmission[] = [...mockEvidenceSubmissions]

/** Upload evidence file record */
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

  const projects = getInMemoryProjects()
  const updatedProjects = projects.map(p => {
    if (p.project_id === projectId) {
      const evidences = p.evidences ? [newEvidence, ...p.evidences.filter(e => e.evidence_id !== evidenceId)] : [newEvidence]
      return { ...p, evidences }
    }
    return p
  })
  setInMemoryProjects(updatedProjects)
  setCachedProjects(updatedProjects)
  notifyProjectsChannel()
}

/** Delete evidence record */
export async function deleteEvidenceRecord(evidenceId: string, projectId: string): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceRecord')
  }

  const projects = getInMemoryProjects()
  const updatedProjects = projects.map(p => {
    if (p.project_id === projectId && p.evidences) {
      return {
        ...p,
        evidences: p.evidences.filter(e => e.evidence_id !== evidenceId)
      }
    }
    return p
  })
  setInMemoryProjects(updatedProjects)
  setCachedProjects(updatedProjects)
  notifyProjectsChannel()
}

/** Fetch evidence submissions with sender & project populated */
export async function fetchEvidenceSubmissions(
  projectId?: string
): Promise<(EvidenceSubmission & { sender?: UserProfile; project?: ProjectWithHeadAndAssignees })[]> {
  const users = getInMemoryUsers()
  const cachedUsers = getCachedUsers()
  const projects = getInMemoryProjects()

  // Collect all submissions from inMemoryEvidenceSubmissions + any project.evidences not already present
  const allSubmissions: EvidenceSubmission[] = [...inMemoryEvidenceSubmissions]
  const seenIds = new Set(allSubmissions.map(s => s.evidence_id))

  for (const p of projects) {
    if (Array.isArray(p.evidences)) {
      for (const ev of p.evidences) {
        if (!seenIds.has(ev.evidence_id)) {
          seenIds.add(ev.evidence_id)
          allSubmissions.push({
            evidence_id: ev.evidence_id,
            project_id: p.project_id,
            sender_id: ev.uploaded_by || null,
            file_name: ev.file_name,
            file_path: ev.file_path,
            file_type: ev.file_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            submitted_at: ev.upload_date || new Date().toISOString()
          })
        }
      }
    }
  }

  let list = allSubmissions
  if (projectId) {
    list = list.filter(e => e.project_id === projectId)
  }

  return list.map(sub => {
    const sender = users.find(u => u.user_id === sub.sender_id) || cachedUsers.find(u => u.user_id === sub.sender_id) || undefined
    const project = projects.find(p => p.project_id === sub.project_id) || undefined
    return {
      ...sub,
      sender,
      project
    }
  })
}

/** Submit an evidence submission */
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

  // 1. Persist to Server API /api/projects
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_evidence',
          submission: {
            evidence_id: newId,
            project_id: data.project_id,
            sender_id: data.sender_id,
            file_name: data.file_name,
            file_path: data.file_path,
            file_type: data.file_type,
            description: data.description
          }
        })
      })
    } catch (e) {
      console.warn('[evidence-service] POST /api/projects failed, fallback to local', e)
    }
  }

  // 2. Supabase insert if configured
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidence_submissions') as any).insert(newSubmission), 'submitEvidenceSubmission')
  }

  inMemoryEvidenceSubmissions.unshift(newSubmission)

  // 3. Sync to project evidences in memory, cache, and notify channel
  const newEvidence: Evidence = {
    evidence_id: newId,
    project_id: data.project_id,
    uploaded_by: data.sender_id,
    file_name: data.file_name,
    file_path: data.file_path,
    file_size: 1024 * 1024 * 2,
    description: data.description || `แนบหลักฐานไฟล์ ${data.file_name}`,
    upload_date: new Date().toISOString()
  }

  const projects = getInMemoryProjects()
  const updatedProjects = projects.map(p => {
    if (p.project_id === data.project_id) {
      const evidences = p.evidences ? [newEvidence, ...p.evidences.filter(e => e.evidence_id !== newId)] : [newEvidence]
      return { ...p, evidences }
    }
    return p
  })
  setInMemoryProjects(updatedProjects)
  setCachedProjects(updatedProjects)
  notifyProjectsChannel()

  return newSubmission
}

/** Delete evidence submission */
export async function deleteEvidenceSubmission(evidenceId: string, projectId?: string): Promise<void> {
  // 1. Persist to Server API /api/projects
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_evidence',
          evidence_id: evidenceId,
          project_id: projectId
        })
      })
    } catch (e) {
      console.warn('[evidence-service] POST delete_evidence failed', e)
    }
  }

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidence_submissions') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceSubmission:submissions')
    await dbCall(() => (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceSubmission:evidences')
  }

  inMemoryEvidenceSubmissions = inMemoryEvidenceSubmissions.filter(e => e.evidence_id !== evidenceId)
  const projects = getInMemoryProjects()
  const updatedProjects = projects.map(p => {
    if (p.evidences) {
      return {
        ...p,
        evidences: p.evidences.filter(e => e.evidence_id !== evidenceId)
      }
    }
    return p
  })
  setInMemoryProjects(updatedProjects)
  setCachedProjects(updatedProjects)
  notifyProjectsChannel()
}
