import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiTestEnv } from './helpers/api-env.mjs'

const { NextRequest } = await import('next/server')

function jsonRequest(url, method, body) {
  return new NextRequest('http://localhost' + url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    duplex: 'half'
  })
}

test('normal reports route GET: returns reports sorted by created_at desc and filters deleted projects', async t => {
  const env = createApiTestEnv({ fixtureName: 'normal-rep-get' })
  t.after(() => env.restore())

  env.seed('persisted-projects.json', { projects: [], deletedProjectIds: ['p-deleted'] })
  const r1 = { report_id: 'rep-1', project_id: 'p-alive', project_name: 'โครงการ 1', created_at: '2025-01-01T00:00:00Z' }
  const r2 = { report_id: 'rep-2', project_id: 'p-alive', project_name: 'โครงการ 2', created_at: '2025-02-01T00:00:00Z' }
  const rDeleted = { report_id: 'rep-3', project_id: 'p-deleted', project_name: 'โครงการที่ลบแล้ว', created_at: '2025-03-01T00:00:00Z' }
  env.seed('persisted-normal-reports.json', { reports: [r1, r2, rDeleted] })

  const route = await env.importRoute('app/api/normal-reports/route.ts')
  const res = await route.GET(jsonRequest('/api/normal-reports', 'GET'))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.reports.length, 2)
  assert.equal(body.reports[0].report_id, 'rep-2')
  assert.equal(body.reports[1].report_id, 'rep-1')
})

test('normal reports route POST create: requires non-empty project_name', async t => {
  const env = createApiTestEnv({ fixtureName: 'normal-rep-create-validation' })
  t.after(() => env.restore())
  env.seed('persisted-normal-reports.json', { reports: [] })

  const route = await env.importRoute('app/api/normal-reports/route.ts')
  const res = await route.POST(jsonRequest('/api/normal-reports', 'POST', {
    action: 'create',
    project_name: '   '
  }))
  const body = await res.json()

  assert.equal(res.status, 400)
  assert.equal(body.success, false)
  assert.match(body.error, /กรุณาระบุชื่อโครงการ/)
})

test('normal reports route POST create: creates and prepends a new normal report', async t => {
  const env = createApiTestEnv({ fixtureName: 'normal-rep-create' })
  t.after(() => env.restore())
  env.seed('persisted-normal-reports.json', { reports: [] })

  const route = await env.importRoute('app/api/normal-reports/route.ts')
  const res = await route.POST(jsonRequest('/api/normal-reports', 'POST', {
    action: 'create',
    project_name: 'ระบบรายงานผล OKR ประจำปี',
    responsible_person_name: 'อาจารย์ กวิน',
    head_evaluation_score: 80,
    team_evaluation_score: 80
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.report.project_name, 'ระบบรายงานผล OKR ประจำปี')
  assert.ok(body.report.report_id)

  const stored = env.read('persisted-normal-reports.json').reports
  assert.equal(stored.length, 1)
  assert.equal(stored[0].report_id, body.report.report_id)
})

test('normal reports route POST update_scores: validates report_id and updates scores', async t => {
  const env = createApiTestEnv({ fixtureName: 'normal-rep-scores' })
  t.after(() => env.restore())

  const r = {
    report_id: 'target-rep',
    project_name: 'ทดสอบการให้คะแนน',
    head_evaluation_score: 60,
    team_evaluation_score: 60,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
  env.seed('persisted-normal-reports.json', { reports: [r] })

  const route = await env.importRoute('app/api/normal-reports/route.ts')

  const noId = await route.POST(jsonRequest('/api/normal-reports', 'POST', { action: 'update_scores' }))
  assert.equal(noId.status, 400)

  const notFound = await route.POST(jsonRequest('/api/normal-reports', 'POST', {
    action: 'update_scores',
    report_id: 'ghost-rep'
  }))
  assert.equal(notFound.status, 404)

  const successRes = await route.POST(jsonRequest('/api/normal-reports', 'POST', {
    action: 'update_scores',
    report_id: 'target-rep',
    head_evaluation_score: 100,
    team_evaluation_score: 90
  }))
  const body = await successRes.json()

  assert.equal(successRes.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.report.head_evaluation_score, 100)
  assert.equal(body.report.team_evaluation_score, 90)

  const stored = env.read('persisted-normal-reports.json').reports[0]
  assert.equal(stored.head_evaluation_score, 100)
  assert.equal(stored.team_evaluation_score, 90)
})

test('normal reports route POST delete: removes report and cascades to evaluations file', async t => {
  const env = createApiTestEnv({ fixtureName: 'normal-rep-delete' })
  t.after(() => env.restore())

  env.seed('persisted-normal-reports.json', {
    reports: [{ report_id: 'rep-kill', project_name: 'จะถูกลบ' }]
  })
  env.seed('persisted-evaluations.json', {
    evaluations: [
      { eval_id: 'ev-linked', report_id: 'rep-kill', head_score: 5 },
      { eval_id: 'ev-other', report_id: 'rep-safe', head_score: 4 }
    ]
  })

  const route = await env.importRoute('app/api/normal-reports/route.ts')
  const res = await route.POST(jsonRequest('/api/normal-reports', 'POST', {
    action: 'delete',
    report_id: 'rep-kill'
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)

  const reports = env.read('persisted-normal-reports.json').reports
  assert.equal(reports.length, 0)

  const evals = env.read('persisted-evaluations.json').evaluations
  assert.equal(evals.length, 1)
  assert.equal(evals[0].eval_id, 'ev-other')
})

test('dashboard reports route GET: returns all dashboard reports ordered by created_at desc', async t => {
  const env = createApiTestEnv({ fixtureName: 'dash-rep-get' })
  t.after(() => env.restore())

  const d1 = { dashboard_id: 'd1', academic_year: 2567, created_at: '2025-01-01T00:00:00Z' }
  const d2 = { dashboard_id: 'd2', academic_year: 2568, created_at: '2025-02-01T00:00:00Z' }
  env.seed('persisted-dashboard-reports.json', { reports: [d1, d2] })

  const route = await env.importRoute('app/api/dashboard-reports/route.ts')
  const res = await route.GET(jsonRequest('/api/dashboard-reports', 'GET'))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.reports.length, 2)
  assert.equal(body.reports[0].dashboard_id, 'd2')
})

test('dashboard reports route POST create: creates report with standard defaults', async t => {
  const env = createApiTestEnv({ fixtureName: 'dash-rep-create' })
  t.after(() => env.restore())
  env.seed('persisted-dashboard-reports.json', { reports: [] })

  const route = await env.importRoute('app/api/dashboard-reports/route.ts')
  const res = await route.POST(jsonRequest('/api/dashboard-reports', 'POST', {
    action: 'create',
    overall_okr_info: 'สรุปภาพรวมปี 2568'
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.report.overall_okr_info, 'สรุปภาพรวมปี 2568')
  assert.equal(body.report.academic_year, 2568)
  assert.equal(body.report.okr_head_evaluation_score, 80)
  assert.ok(body.report.dashboard_id)
})

test('dashboard reports route POST rate: validates 0-100 range and updates score', async t => {
  const env = createApiTestEnv({ fixtureName: 'dash-rep-rate' })
  t.after(() => env.restore())

  const d = { dashboard_id: 'd-rate', academic_year: 2568, okr_head_evaluation_score: 50, created_at: '2025-01-01T00:00:00Z' }
  env.seed('persisted-dashboard-reports.json', { reports: [d] })

  const route = await env.importRoute('app/api/dashboard-reports/route.ts')

  const noId = await route.POST(jsonRequest('/api/dashboard-reports', 'POST', { action: 'rate', score: 85 }))
  assert.equal(noId.status, 400)

  const outOfRangeHigh = await route.POST(jsonRequest('/api/dashboard-reports', 'POST', {
    action: 'rate',
    dashboard_id: 'd-rate',
    score: 150
  }))
  assert.equal(outOfRangeHigh.status, 400)
  assert.match((await outOfRangeHigh.json()).error, /0-100/)

  const outOfRangeLow = await route.POST(jsonRequest('/api/dashboard-reports', 'POST', {
    action: 'rate',
    dashboard_id: 'd-rate',
    score: -1
  }))
  assert.equal(outOfRangeLow.status, 400)

  const notFound = await route.POST(jsonRequest('/api/dashboard-reports', 'POST', {
    action: 'rate',
    dashboard_id: 'ghost',
    score: 90
  }))
  assert.equal(notFound.status, 404)

  const success = await route.POST(jsonRequest('/api/dashboard-reports', 'POST', {
    action: 'rate',
    dashboard_id: 'd-rate',
    score: 95
  }))
  assert.equal(success.status, 200)

  const updated = env.read('persisted-dashboard-reports.json').reports[0]
  assert.equal(updated.okr_head_evaluation_score, 95)
})

test('dashboard reports route POST delete: deletes dashboard report and cascades to evaluations', async t => {
  const env = createApiTestEnv({ fixtureName: 'dash-rep-del' })
  t.after(() => env.restore())

  env.seed('persisted-dashboard-reports.json', {
    reports: [{ dashboard_id: 'dash-target', academic_year: 2568 }]
  })
  env.seed('persisted-evaluations.json', {
    evaluations: [
      { eval_id: 'e-dash-linked', dashboard_id: 'dash-target', head_score: 5 },
      { eval_id: 'e-normal-rep', report_id: 'rep-x', head_score: 4 }
    ]
  })

  const route = await env.importRoute('app/api/dashboard-reports/route.ts')
  const res = await route.POST(jsonRequest('/api/dashboard-reports', 'POST', {
    action: 'delete',
    dashboard_id: 'dash-target'
  }))
  assert.equal(res.status, 200)

  const remainingReports = env.read('persisted-dashboard-reports.json').reports
  assert.equal(remainingReports.length, 0)

  const remainingEvals = env.read('persisted-evaluations.json').evaluations
  assert.equal(remainingEvals.length, 1)
  assert.equal(remainingEvals[0].eval_id, 'e-normal-rep')
})
