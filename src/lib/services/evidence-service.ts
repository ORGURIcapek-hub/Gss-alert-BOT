import { mockEvidenceSubmissions } from '@/lib/mock-data'
import { EvidenceSubmission, ProjectWithHeadAndAssignees, UserProfile } from '@/types/database.types'
import { getSafeSupabaseClient, dbCall, getCachedUsers } from './service-helpers'
import { getInMemoryUsers } from './user-service'
import { getInMemoryProjects } from './project-service'

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
  const proj = projects.find(p => p.project_id === projectId)
  if (proj) {
    if (!proj.evidences) proj.evidences = []
    proj.evidences.unshift(newEvidence)
  }
}

/** Delete evidence record */
export async function deleteEvidenceRecord(evidenceId: string, projectId: string): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceRecord')
  }

  const projects = getInMemoryProjects()
  const proj = projects.find(p => p.project_id === projectId)
  if (proj && proj.evidences) {
    proj.evidences = proj.evidences.filter(e => e.evidence_id !== evidenceId)
  }
}

/** Fetch evidence submissions with sender & project populated */
export async function fetchEvidenceSubmissions(
  projectId?: string
): Promise<(EvidenceSubmission & { sender?: UserProfile; project?: ProjectWithHeadAndAssignees })[]> {
  let list = inMemoryEvidenceSubmissions
  if (projectId) {
    list = list.filter(e => e.project_id === projectId)
  }

  const users = getInMemoryUsers()
  const cachedUsers = getCachedUsers()
  const projects = getInMemoryProjects()

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

  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidence_submissions') as any).insert(newSubmission), 'submitEvidenceSubmission')
  }

  inMemoryEvidenceSubmissions.unshift(newSubmission)

  // Sync to project evidences for backward compatibility
  const projects = getInMemoryProjects()
  const proj = projects.find(p => p.project_id === data.project_id)
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

/** Delete evidence submission */
export async function deleteEvidenceSubmission(evidenceId: string): Promise<void> {
  const supabase = getSafeSupabaseClient()
  if (supabase) {
    await dbCall(() => (supabase.from('evidence_submissions') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceSubmission:submissions')
    await dbCall(() => (supabase.from('evidences') as any).delete().eq('evidence_id', evidenceId), 'deleteEvidenceSubmission:evidences')
  }

  inMemoryEvidenceSubmissions = inMemoryEvidenceSubmissions.filter(e => e.evidence_id !== evidenceId)
  const projects = getInMemoryProjects()
  projects.forEach(p => {
    if (p.evidences) {
      p.evidences = p.evidences.filter(e => e.evidence_id !== evidenceId)
    }
  })
}
