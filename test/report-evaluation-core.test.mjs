import test from 'node:test'
import assert from 'node:assert/strict'

function clampScore(s) {
  if (s === undefined || s === null) return null
  if (!Number.isFinite(s)) return null
  const n = Math.round(s)
  return n >= 1 && n <= 5 ? n : null
}

function createReportEvaluationContext() {
  let inMemoryNormalReports = [
    {
      report_id: 'rep-1',
      project_id: 'proj-1',
      project_name: 'โครงการวิจัย 1',
      head_evaluation_score: 80,
      team_evaluation_score: 60
    },
    {
      report_id: 'rep-2',
      project_id: 'proj-2',
      project_name: 'โครงการวิจัย 2',
      head_evaluation_score: 100,
      team_evaluation_score: 100
    }
  ]

  let inMemoryDashboardReports = [
    {
      dashboard_id: 'dash-1',
      overall_okr_info: 'สรุปภาพรวม OKR',
      okr_head_evaluation_score: 80,
      project_ids: ['proj-1', 'proj-2'],
      project_snapshots: [
        { project_id: 'proj-1', project_name: 'โครงการวิจัย 1' },
        { project_id: 'proj-2', project_name: 'โครงการวิจัย 2' }
      ]
    }
  ]

  let inMemoryEvaluations = [
    {
      eval_id: 'eval-1',
      report_id: 'rep-1',
      dashboard_id: null,
      project_id: 'proj-1',
      evaluator_id: 'user-eval-1',
      head_score: 4,
      team_score: 3,
      executive_score: null
    }
  ]

  function saveEvaluationRecord(data) {
    const newId = 'eval-' + Math.random().toString(36).slice(2, 9)
    const targetKeys = ['report_id', 'dashboard_id', 'project_id'].filter(k => data[k])
    const matchesTarget = e =>
      e.evaluator_id === data.evaluator_id &&
      targetKeys.length > 0 &&
      targetKeys.every(k => e[k] === data[k])

    const existingMatch = inMemoryEvaluations.find(matchesTarget)
    const incomingHead = clampScore(data.head_score)
    const inheritedHead = existingMatch ? clampScore(existingMatch.head_score) : null

    const evaluation = {
      eval_id: newId,
      report_id: data.report_id || null,
      dashboard_id: data.dashboard_id || null,
      project_id: data.project_id || null,
      evaluator_id: data.evaluator_id,
      head_score: incomingHead ?? inheritedHead ?? Math.min(5, Math.max(1, Math.round(data.head_score || 1))),
      team_score: clampScore(data.team_score),
      executive_score: clampScore(data.executive_score),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const existingIdx = inMemoryEvaluations.findIndex(matchesTarget)
    if (existingIdx !== -1) {
      evaluation.eval_id = inMemoryEvaluations[existingIdx].eval_id
      inMemoryEvaluations[existingIdx] = evaluation
    } else {
      inMemoryEvaluations.unshift(evaluation)
    }

    if (data.report_id) {
      const normalRep = inMemoryNormalReports.find(r => r.report_id === data.report_id)
      if (normalRep) {
        normalRep.head_evaluation_score = data.head_score * 20
        if (data.team_score) {
          normalRep.team_evaluation_score = data.team_score * 20
        }
      }
    }

    if (data.dashboard_id) {
      const dashRep = inMemoryDashboardReports.find(d => d.dashboard_id === data.dashboard_id)
      const effectiveScore =
        data.executive_score !== null && data.executive_score !== undefined
          ? data.executive_score * 20
          : data.head_score * 20
      if (dashRep) {
        dashRep.okr_head_evaluation_score = effectiveScore
      }
    }

    return evaluation
  }

  function removeProjectReportsInMemory(projectId) {
    const deletedReportIds = new Set(
      inMemoryNormalReports.filter(r => r.project_id === projectId).map(r => r.report_id)
    )
    inMemoryNormalReports = inMemoryNormalReports.filter(r => r.project_id !== projectId)
    inMemoryEvaluations = inMemoryEvaluations.filter(
      e => e.project_id !== projectId && (!e.report_id || !deletedReportIds.has(e.report_id))
    )
    inMemoryDashboardReports = inMemoryDashboardReports.map(d => ({
      ...d,
      project_ids: (d.project_ids || []).filter(id => id !== projectId),
      project_snapshots: (d.project_snapshots || []).filter(s => s.project_id !== projectId)
    }))
  }

  function clearAllReportsInMemory() {
    inMemoryNormalReports = []
    inMemoryEvaluations = []
    inMemoryDashboardReports = inMemoryDashboardReports.map(d => ({
      ...d,
      project_ids: [],
      project_snapshots: []
    }))
  }

  return {
    getNormalReports: () => inMemoryNormalReports,
    getDashboardReports: () => inMemoryDashboardReports,
    getEvaluations: () => inMemoryEvaluations,
    saveEvaluationRecord,
    removeProjectReportsInMemory,
    clearAllReportsInMemory
  }
}

test('clampScore: accepts valid integers 1 through 5', () => {
  assert.equal(clampScore(1), 1)
  assert.equal(clampScore(2), 2)
  assert.equal(clampScore(3), 3)
  assert.equal(clampScore(4), 4)
  assert.equal(clampScore(5), 5)
})

test('clampScore: rounds floats to nearest integer within 1-5', () => {
  assert.equal(clampScore(3.2), 3)
  assert.equal(clampScore(3.7), 4)
  assert.equal(clampScore(4.5), 5)
  assert.equal(clampScore(1.4), 1)
})

test('clampScore: rejects numbers outside 1-5 range and invalid inputs', () => {
  assert.equal(clampScore(0), null)
  assert.equal(clampScore(-1), null)
  assert.equal(clampScore(6), null)
  assert.equal(clampScore(10), null)
  assert.equal(clampScore(null), null)
  assert.equal(clampScore(undefined), null)
  assert.equal(clampScore(NaN), null)
  assert.equal(clampScore(Infinity), null)
  assert.equal(clampScore('string'), null)
})

test('saveEvaluationRecord: creates new evaluation when no previous evaluation exists', () => {
  const ctx = createReportEvaluationContext()
  const res = ctx.saveEvaluationRecord({
    report_id: 'rep-2',
    project_id: 'proj-2',
    evaluator_id: 'user-eval-2',
    head_score: 5,
    team_score: 4
  })

  assert.ok(res.eval_id)
  assert.equal(res.head_score, 5)
  assert.equal(res.team_score, 4)
  assert.equal(ctx.getEvaluations().length, 2)
})

test('saveEvaluationRecord: updates evaluation in place without creating duplicates when re-rated', () => {
  const ctx = createReportEvaluationContext()
  const initialCount = ctx.getEvaluations().length

  const updated = ctx.saveEvaluationRecord({
    report_id: 'rep-1',
    project_id: 'proj-1',
    evaluator_id: 'user-eval-1',
    head_score: 5,
    team_score: 5
  })

  assert.equal(ctx.getEvaluations().length, initialCount)
  assert.equal(updated.eval_id, 'eval-1')
  assert.equal(updated.head_score, 5)
  assert.equal(updated.team_score, 5)

  const inStore = ctx.getEvaluations().find(e => e.eval_id === 'eval-1')
  assert.equal(inStore.head_score, 5)
})

test('saveEvaluationRecord: syncs NormalReport head and team scores converted to percentage scale', () => {
  const ctx = createReportEvaluationContext()
  ctx.saveEvaluationRecord({
    report_id: 'rep-1',
    project_id: 'proj-1',
    evaluator_id: 'user-eval-1',
    head_score: 4,
    team_score: 3
  })

  const report = ctx.getNormalReports().find(r => r.report_id === 'rep-1')
  assert.equal(report.head_evaluation_score, 80)
  assert.equal(report.team_evaluation_score, 60)
})

test('saveEvaluationRecord: syncs DashboardReport okr_head_evaluation_score preferring executive_score', () => {
  const ctx = createReportEvaluationContext()
  ctx.saveEvaluationRecord({
    dashboard_id: 'dash-1',
    evaluator_id: 'user-exec-1',
    head_score: 3,
    executive_score: 5
  })

  const dash = ctx.getDashboardReports().find(d => d.dashboard_id === 'dash-1')
  assert.equal(dash.okr_head_evaluation_score, 100)

  ctx.saveEvaluationRecord({
    dashboard_id: 'dash-1',
    evaluator_id: 'user-head-1',
    head_score: 4,
    executive_score: null
  })

  const dash2 = ctx.getDashboardReports().find(d => d.dashboard_id === 'dash-1')
  assert.equal(dash2.okr_head_evaluation_score, 80)
})

test('removeProjectReportsInMemory: cascade removes normal reports and evaluations for deleted project', () => {
  const ctx = createReportEvaluationContext()
  ctx.removeProjectReportsInMemory('proj-1')

  const remainingReports = ctx.getNormalReports()
  assert.equal(remainingReports.length, 1)
  assert.equal(remainingReports[0].report_id, 'rep-2')

  const remainingEvals = ctx.getEvaluations()
  assert.equal(remainingEvals.length, 0)

  const dash = ctx.getDashboardReports()[0]
  assert.deepEqual(dash.project_ids, ['proj-2'])
  assert.equal(dash.project_snapshots.length, 1)
  assert.equal(dash.project_snapshots[0].project_id, 'proj-2')
})

test('clearAllReportsInMemory: empties all normal reports, evaluations, and resets dashboard references', () => {
  const ctx = createReportEvaluationContext()
  ctx.clearAllReportsInMemory()

  assert.equal(ctx.getNormalReports().length, 0)
  assert.equal(ctx.getEvaluations().length, 0)

  const dash = ctx.getDashboardReports()[0]
  assert.deepEqual(dash.project_ids, [])
  assert.deepEqual(dash.project_snapshots, [])
})
