import { mockEvidenceSubmissions } from '@/lib/mock-data'
import { EvidenceSubmission, ProjectWithHeadAndAssignees, UserProfile, Evidence } from '@/types/database.types'
import { getCachedUsers, fetchWithDeduplication, invalidateApiCache } from './service-helpers'
import { getInMemoryUsers } from './user-service'
import { getInMemoryProjects, setInMemoryProjects, setCachedProjects, notifyProjectsChannel } from './project-service'
import { deleteFileFromStorage } from './storage-service'

let inMemoryEvidenceSubmissions: EvidenceSubmission[] = [...mockEvidenceSubmissions]

export async function fetchEvidenceSubmissions(
  projectId?: string
): Promise<(EvidenceSubmission & { sender?: UserProfile; project?: ProjectWithHeadAndAssignees })[]> {
  if (typeof window !== 'undefined') {
    try {
      const json = await fetchWithDeduplication<{ success: boolean; evidences: EvidenceSubmission[] }>(
        '/api/evidences',
        { ttl: 2500 }
      )
      if (json?.success && Array.isArray(json.evidences)) {
        inMemoryEvidenceSubmissions = json.evidences
      }
    } catch (e) {
      console.warn('[evidence-service] fetch /api/evidences failed', e)
    }
  }

  const users = getInMemoryUsers()
  const cachedUsers = getCachedUsers()
  const projects = getInMemoryProjects()

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
            description: ev.description || null,
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

export async function submitEvidenceSubmission(data: {
  project_id: string
  sender_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size?: number | null
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
    description: data.description || null,
    submitted_at: new Date().toISOString()
  }

  invalidateApiCache('/api/evidences')
  invalidateApiCache('/api/projects')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/evidences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          evidence_id: newId,
          project_id: data.project_id,
          sender_id: data.sender_id,
          file_name: data.file_name,
          file_path: data.file_path,
          file_type: data.file_type,
          description: data.description
        })
      })
    } catch (e) {
      console.warn('[evidence-service] POST /api/evidences failed, fallback to local', e)
    }

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
      console.warn('[evidence-service] POST /api/projects submit_evidence failed', e)
    }
  }

  inMemoryEvidenceSubmissions.unshift(newSubmission)

  const newEvidence: Evidence = {
    evidence_id: newId,
    project_id: data.project_id,
    uploaded_by: data.sender_id,
    file_name: data.file_name,
    file_path: data.file_path,
    file_size: data.file_size || 1024 * 1024 * 2,
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

export async function deleteEvidenceSubmission(evidenceId: string, projectId?: string): Promise<void> {

  invalidateApiCache('/api/evidences')
  invalidateApiCache('/api/projects')
  const doomed = inMemoryEvidenceSubmissions.find(e => e.evidence_id === evidenceId)
  const doomedPath = doomed?.file_path
  if (!doomedPath) {
    const projects = getInMemoryProjects()
    for (const p of projects) {
      const hit = p.evidences?.find(e => e.evidence_id === evidenceId)
      if (hit?.file_path) {
        await deleteFileFromStorage(hit.file_path)
        break
      }
    }
  } else {
    await deleteFileFromStorage(doomedPath)
  }
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/evidences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          evidence_id: evidenceId
        })
      })
    } catch (e) {
      console.warn('[evidence-service] POST /api/evidences delete failed', e)
    }

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
      console.warn('[evidence-service] POST /api/projects delete_evidence failed', e)
    }
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

export function clearEvidenceSubmissionsFromMemory(projectId: string): void {
  inMemoryEvidenceSubmissions = inMemoryEvidenceSubmissions.filter(e => e.project_id !== projectId)
}
