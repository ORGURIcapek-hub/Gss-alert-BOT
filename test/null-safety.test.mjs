import test from 'node:test'
import assert from 'node:assert/strict'

test('null-safety: report filter handles null or missing project_name without throwing', () => {
  const reports = [
    { report_id: '1', project_name: 'ระบบสารสนเทศ', responsible_person_name: 'สมชาย' },
    { report_id: '2', project_name: null, responsible_person_name: 'สมหญิง' },
    { report_id: '3', project_name: undefined, responsible_person_name: null },
    { report_id: '4', project_name: '', responsible_person_name: undefined }
  ]

  const searchTerm = 'ระบบ'

  assert.doesNotThrow(() => {
    const filtered = reports.filter(r =>
      (r.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.responsible_person_name && r.responsible_person_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].report_id, '1')
  })
})

test('null-safety: executive summary snapshot search handles null fields gracefully', () => {
  const reports = [
    {
      dashboard_id: 'd1',
      head_name: null,
      overall_okr_info: undefined,
      project_snapshots: [
        { project_name: null, department: 'วิทยาศาสตร์' },
        { project_name: 'โครงการวิจัย AI', department: null }
      ]
    },
    {
      dashboard_id: 'd2',
      head_name: 'ผศ.ดร. นันทิกา',
      overall_okr_info: 'สรุปผลดีมาก',
      project_snapshots: null
    }
  ]

  const q = 'วิจัย'

  assert.doesNotThrow(() => {
    const matched = reports.filter(r => {
      return (
        r.head_name?.toLowerCase().includes(q) ||
        r.overall_okr_info?.toLowerCase().includes(q) ||
        r.project_snapshots?.some(ps => (ps.project_name || '').toLowerCase().includes(q) || (ps.department || '').toLowerCase().includes(q))
      )
    })
    assert.equal(matched.length, 1)
    assert.equal(matched[0].dashboard_id, 'd1')
  })
})

test('null-safety: evidence extension checks handle null file_name safely', () => {
  const evidences = [
    { evidence_id: 'e1', file_name: 'report.pdf' },
    { evidence_id: 'e2', file_name: 'photo.PNG' },
    { evidence_id: 'e3', file_name: null },
    { evidence_id: 'e4', file_name: undefined }
  ]

  assert.doesNotThrow(() => {
    const pdfs = evidences.filter(ev => (ev.file_name || '').toLowerCase().endsWith('.pdf'))
    assert.equal(pdfs.length, 1)
    assert.equal(pdfs[0].evidence_id, 'e1')
  })
})
