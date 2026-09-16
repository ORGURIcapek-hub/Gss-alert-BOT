import test from 'node:test'
import assert from 'node:assert/strict'

function createEvidenceTestContext() {
  let inMemoryUsers = [
    { user_id: 'user-teach-1', name: 'อาจารย์ ธีรเดช', role: 'teacher' },
    { user_id: 'user-teach-2', name: 'อาจารย์ ปรียา', role: 'teacher' }
  ]

  let inMemoryProjects = [
    {
      project_id: 'proj-1',
      project_name: 'โครงการพัฒนาทักษะดิจิทัล',
      evidences: [
        {
          evidence_id: 'ev-emb-1',
          project_id: 'proj-1',
          file_name: 'summary_report.pdf',
          file_path: 'OKR-files/proj-1/summary_report.pdf',
          file_size: 2048576,
          uploaded_by: 'user-teach-1',
          upload_date: '2026-01-15T08:30:00.000Z',
          description: 'รายงานผลฉบับสมบูรณ์'
        }
      ]
    },
    {
      project_id: 'proj-2',
      project_name: 'โครงการบริการวิชาการเคมี',
      evidences: []
    }
  ]

  let inMemorySubmissions = [
    {
      evidence_id: 'ev-emb-1',
      project_id: 'proj-1',
      sender_id: 'user-teach-1',
      file_name: 'summary_report.pdf',
      file_path: 'OKR-files/proj-1/summary_report.pdf',
      file_type: 'application/pdf',
      description: 'รายงานผลฉบับสมบูรณ์',
      submitted_at: '2026-01-15T08:30:00.000Z'
    },
    {
      evidence_id: 'ev-standalone-1',
      project_id: 'proj-1',
      sender_id: 'user-teach-2',
      file_name: 'activity_photo.jpg',
      file_path: 'OKR-files/proj-1/activity_photo.jpg',
      file_type: 'image/jpeg',
      description: 'ภาพถ่ายกิจกรรม',
      submitted_at: '2026-01-16T09:00:00.000Z'
    }
  ]

  function fetchEvidenceSubmissions(projectId) {
    const allSubmissions = [...inMemorySubmissions]
    const seenIds = new Set(allSubmissions.map(s => s.evidence_id))

    for (const p of inMemoryProjects) {
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
      const sender = inMemoryUsers.find(u => u.user_id === sub.sender_id) || undefined
      const project = inMemoryProjects.find(p => p.project_id === sub.project_id) || undefined
      return {
        ...sub,
        sender,
        project
      }
    })
  }

  function submitEvidenceSubmission(data) {
    const newId = 'ev-' + Math.random().toString(36).slice(2, 9)
    const newSubmission = {
      evidence_id: newId,
      project_id: data.project_id,
      sender_id: data.sender_id,
      file_name: data.file_name,
      file_path: data.file_path,
      file_type: data.file_type || (data.file_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      description: data.description || null,
      submitted_at: new Date().toISOString()
    }

    inMemorySubmissions.unshift(newSubmission)

    const newEvidence = {
      evidence_id: newId,
      project_id: data.project_id,
      uploaded_by: data.sender_id,
      file_name: data.file_name,
      file_path: data.file_path,
      file_size: data.file_size || 1024 * 1024 * 2,
      description: data.description || `แนบหลักฐานไฟล์ ${data.file_name}`,
      upload_date: new Date().toISOString()
    }

    inMemoryProjects = inMemoryProjects.map(p => {
      if (p.project_id === data.project_id) {
        const evidences = p.evidences ? [newEvidence, ...p.evidences.filter(e => e.evidence_id !== newId)] : [newEvidence]
        return { ...p, evidences }
      }
      return p
    })

    return newSubmission
  }

  function deleteEvidenceSubmission(evidenceId) {
    inMemorySubmissions = inMemorySubmissions.filter(e => e.evidence_id !== evidenceId)
    inMemoryProjects = inMemoryProjects.map(p => {
      if (p.evidences) {
        return {
          ...p,
          evidences: p.evidences.filter(e => e.evidence_id !== evidenceId)
        }
      }
      return p
    })
  }

  function clearEvidenceSubmissionsFromMemory(projectId) {
    inMemorySubmissions = inMemorySubmissions.filter(e => e.project_id !== projectId)
  }

  return {
    getProjects: () => inMemoryProjects,
    getSubmissions: () => inMemorySubmissions,
    fetchEvidenceSubmissions,
    submitEvidenceSubmission,
    deleteEvidenceSubmission,
    clearEvidenceSubmissionsFromMemory
  }
}

test('fetchEvidenceSubmissions: merges standalone submissions with embedded project evidences and deduplicates', () => {
  const ctx = createEvidenceTestContext()
  const results = ctx.fetchEvidenceSubmissions('proj-1')

  assert.equal(results.length, 2)
  const ids = results.map(r => r.evidence_id)
  assert.equal(new Set(ids).size, 2)
  assert.ok(ids.includes('ev-emb-1'))
  assert.ok(ids.includes('ev-standalone-1'))
})

test('fetchEvidenceSubmissions: infers MIME types correctly for PDF and images', () => {
  const ctx = createEvidenceTestContext()
  const results = ctx.fetchEvidenceSubmissions('proj-1')

  const pdfItem = results.find(r => r.file_name.endsWith('.pdf'))
  assert.equal(pdfItem.file_type, 'application/pdf')

  const imgItem = results.find(r => r.file_name.endsWith('.jpg'))
  assert.equal(imgItem.file_type, 'image/jpeg')
})

test('fetchEvidenceSubmissions: hydrates sender and project objects into submission record', () => {
  const ctx = createEvidenceTestContext()
  const results = ctx.fetchEvidenceSubmissions('proj-1')

  const first = results.find(r => r.evidence_id === 'ev-emb-1')
  assert.ok(first.sender)
  assert.equal(first.sender.name, 'อาจารย์ ธีรเดช')
  assert.ok(first.project)
  assert.equal(first.project.project_name, 'โครงการพัฒนาทักษะดิจิทัล')
})

test('fetchEvidenceSubmissions: filters strictly when projectId is provided', () => {
  const ctx = createEvidenceTestContext()

  const proj1Results = ctx.fetchEvidenceSubmissions('proj-1')
  assert.equal(proj1Results.length, 2)

  const proj2Results = ctx.fetchEvidenceSubmissions('proj-2')
  assert.equal(proj2Results.length, 0)
})

test('submitEvidenceSubmission: adds submission and embeds into project.evidences', () => {
  const ctx = createEvidenceTestContext()
  const sub = ctx.submitEvidenceSubmission({
    project_id: 'proj-2',
    sender_id: 'user-teach-1',
    file_name: 'test_evidence.pdf',
    file_path: 'OKR-files/proj-2/test_evidence.pdf',
    file_type: 'application/pdf',
    description: 'เอกสารอ้างอิงโครงการ'
  })

  assert.ok(sub.evidence_id)
  assert.equal(sub.project_id, 'proj-2')

  const proj2 = ctx.getProjects().find(p => p.project_id === 'proj-2')
  assert.equal(proj2.evidences.length, 1)
  assert.equal(proj2.evidences[0].file_name, 'test_evidence.pdf')
  assert.equal(proj2.evidences[0].uploaded_by, 'user-teach-1')
})

test('deleteEvidenceSubmission: removes evidence from both submissions and project.evidences', () => {
  const ctx = createEvidenceTestContext()
  ctx.deleteEvidenceSubmission('ev-emb-1')

  const submissions = ctx.getSubmissions()
  assert.equal(submissions.some(s => s.evidence_id === 'ev-emb-1'), false)

  const proj1 = ctx.getProjects().find(p => p.project_id === 'proj-1')
  assert.equal(proj1.evidences.some(e => e.evidence_id === 'ev-emb-1'), false)
  assert.equal(proj1.evidences.length, 0)
})

test('clearEvidenceSubmissionsFromMemory: purges submissions matching projectId only', () => {
  const ctx = createEvidenceTestContext()
  ctx.clearEvidenceSubmissionsFromMemory('proj-1')

  const remaining = ctx.getSubmissions()
  assert.equal(remaining.length, 0)
})
