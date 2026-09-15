import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiTestEnv } from './helpers/api-env.mjs'

const { NextRequest } = await import('next/server')

const USER = (over = {}) => ({
  user_id: 'u-' + Math.random().toString(36).slice(2, 8),
  username: 'teacher' + Math.ceil(Math.random() * 99),
  email: 't@sdu.ac.th',
  name: 'อาจารย์ ทดสอบ',
  first_name: 'อาจารย์',
  last_name: 'ทดสอบ',
  role: 'teacher',
  status: 'approved',
  ...over
})

const PROJECT = (over = {}) => ({
  project_id: 'p-' + Math.random().toString(36).slice(2, 8),
  okr_id: 'okr-1',
  project_name: 'โครงการทดสอบ',
  project_type: 'โครงการพัฒนา',
  department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
  head_of_project: null,
  progress_percentage: 0,
  status: 'In Progress',
  ...over
})

function jsonRequest(url, method, body) {
  return new NextRequest('http://localhost' + url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    duplex: 'half'
  })
}

async function loadRoute(env) {
  return env.importRoute('app/api/projects/route.ts')
}

test('projects route GET: enriches projects with head user and assignment-derived year from the OKRs store', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-get' })
  t.after(() => env.restore())

  const head = USER({ user_id: 'head-1', name: 'ผศ.ดร.สมชาย' })
  env.seed('persisted-users.json', { users: [head], deletedUserIds: [] })
  env.seed('persisted-okrs.json', { okrs: [{ okr_id: 'okr-1', year: 2568 }] })
  env.seed('persisted-projects.json', {
    projects: [PROJECT({ head_of_project: 'head-1', head: null, year: undefined })],
    assignments: [],
    deletedProjectIds: []
  })

  const route = await loadRoute(env)
  const body = await (await route.GET(jsonRequest('/api/projects', 'GET'))).json()

  assert.equal(body.success, true)
  assert.equal(body.projects.length, 1)
  const p = body.projects[0]
  assert.equal(p.head.name, 'ผศ.ดร.สมชาย', 'head resolved from users store')
  assert.equal(p.year, 2568, 'year derived from linked OKR')
  assert.deepEqual(body.assignments, [])
})

test('projects route GET: hides tombstoned projects but keeps their assignments out too', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-tomb' })
  t.after(() => env.restore())

  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', {
    projects: [PROJECT({ project_id: 'p-live' }), PROJECT({ project_id: 'p-dead' })],
    assignments: [
      { assignment_id: 'a1', project_id: 'p-live', user_id: 'u1', role_type: 'Member' },
      { assignment_id: 'a2', project_id: 'p-dead', user_id: 'u1', role_type: 'Member' }
    ],
    deletedProjectIds: ['p-dead']
  })

  const route = await loadRoute(env)
  const body = await (await route.GET(jsonRequest('/api/projects', 'GET'))).json()

  assert.equal(body.projects.length, 1)
  assert.equal(body.projects[0].project_id, 'p-live')
  assert.equal(body.assignments.length, 1)
  assert.equal(body.assignments[0].project_id, 'p-live')
})

test('projects route POST create_project: validates required fields and enriches with head user', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-create' })
  t.after(() => env.restore())

  const head = USER({ user_id: 'head-1' })
  env.seed('persisted-users.json', { users: [head], deletedUserIds: [] })
  env.seed('persisted-projects.json', { projects: [], assignments: [], deletedProjectIds: [] })

  const route = await loadRoute(env)

  const bad = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'create_project', project: { project_name: 'no id' } }))
  assert.equal(bad.status, 400)

  const res = await route.POST(jsonRequest('/api/projects', 'POST', {
    action: 'create_project',
    project: PROJECT({ project_id: 'p-new', head_of_project: 'head-1' })
  }))
  const body = await res.json()

  assert.equal(body.success, true)
  assert.equal(body.project.head.user_id, 'head-1')
  assert.deepEqual(body.project.evidences, [])
  assert.equal(env.read('persisted-projects.json').projects.length, 1)
})

test('projects route POST assign_role Head: one head at a time, replaces previous head assignment', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-head' })
  t.after(() => env.restore())

  const users = [USER({ user_id: 'h-old' }), USER({ user_id: 'h-new' })]
  env.seed('persisted-users.json', { users, deletedUserIds: [] })
  env.seed('persisted-projects.json', {
    projects: [PROJECT({ project_id: 'p-1', head_of_project: 'h-old' })],
    assignments: [{ assignment_id: 'a-old', project_id: 'p-1', user_id: 'h-old', role_type: 'Head', created_at: new Date().toISOString() }],
    deletedProjectIds: []
  })

  const route = await loadRoute(env)
  const res = await route.POST(jsonRequest('/api/projects', 'POST', {
    action: 'assign_role', project_id: 'p-1', user_id: 'h-new', role_type: 'Head'
  }))
  const body = await res.json()

  assert.equal(body.success, true)
  const stored = env.read('persisted-projects.json')
  const heads = stored.assignments.filter(a => a.role_type === 'Head' && a.project_id === 'p-1')
  assert.equal(heads.length, 1)
  assert.equal(heads[0].user_id, 'h-new')
  assert.equal(stored.projects[0].head_of_project, 'h-new')
})

test('projects route POST assign_role Head: multiple head ids rejected', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-head2' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', { projects: [PROJECT({ project_id: 'p-1' })], assignments: [], deletedProjectIds: [] })

  const route = await loadRoute(env)
  const res = await route.POST(jsonRequest('/api/projects', 'POST', {
    action: 'assign_role', project_id: 'p-1', user_ids: ['a', 'b'], role_type: 'Head'
  }))
  const body = await res.json()

  assert.equal(res.status, 400)
  assert.match(body.error, /ครั้งละ 1 คน/)
})

test('projects route POST assign_role Member: dedupes members and attaches user objects', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-member' })
  t.after(() => env.restore())

  const users = [USER({ user_id: 'm-1' }), USER({ user_id: 'm-2' })]
  env.seed('persisted-users.json', { users, deletedUserIds: [] })
  env.seed('persisted-projects.json', {
    projects: [PROJECT({ project_id: 'p-1', assignees: [{ project_id: 'p-1', user_id: 'm-1', assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)' }] })],
    assignments: [],
    deletedProjectIds: []
  })

  const route = await loadRoute(env)
  const res = await route.POST(jsonRequest('/api/projects', 'POST', {
    action: 'assign_role', project_id: 'p-1', user_ids: ['m-1', 'm-2'], role_type: 'Member'
  }))
  const body = await res.json()

  assert.equal(body.success, true)
  const p = env.read('persisted-projects.json').projects[0]
  assert.equal(p.assignees.length, 2, 'existing member kept, new one added')
  assert.equal(p.assignees.find(a => a.user_id === 'm-2').user.name, 'อาจารย์ ทดสอบ')
})

test('projects route POST assign_role: invalid role_type and missing params rejected', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-rolebad' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', { projects: [], assignments: [], deletedProjectIds: [] })

  const route = await loadRoute(env)
  const badType = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'assign_role', project_id: 'p', user_id: 'u', role_type: 'Boss' }))
  assert.equal(badType.status, 400)

  const noParams = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'assign_role', role_type: 'Member' }))
  assert.equal(noParams.status, 400)
})

test('projects route POST update_progress: clamps 0-100, validates status, persists all fields', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-progress' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', {
    projects: [PROJECT({ project_id: 'p-1', progress_percentage: 10, status: 'In Progress', spent_amount: 100 })],
    assignments: [],
    deletedProjectIds: []
  })

  const route = await loadRoute(env)
  const overClamp = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'update_progress', project_id: 'p-1', progress: 250 }))
  assert.equal(overClamp.status, 200)
  assert.equal(env.read('persisted-projects.json').projects[0].progress_percentage, 100)

  const underClamp = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'update_progress', project_id: 'p-1', progress: -20 }))
  assert.equal(env.read('persisted-projects.json').projects[0].progress_percentage, 0)

  const badStatus = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'update_progress', project_id: 'p-1', status: 'Flying' }))
  assert.equal(badStatus.status, 400)

  await route.POST(jsonRequest('/api/projects', 'POST', {
    action: 'update_progress', project_id: 'p-1', progress: 55, bottleneck: 'รองบ', status: 'Delayed', spent: 5000
  }))
  const p = env.read('persisted-projects.json').projects[0]
  assert.equal(p.progress_percentage, 55)
  assert.equal(p.bottleneck, 'รองบ')
  assert.equal(p.status, 'Delayed')
  assert.equal(p.spent_amount, 5000)

  const missing = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'update_progress', progress: 1 }))
  assert.equal(missing.status, 400)

  const ghost = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'update_progress', project_id: 'nope', progress: 1 }))
  assert.equal(ghost.status, 404)
})

test('projects route POST update_project_okr: links project to a different OKR', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-okrlink' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', { projects: [PROJECT({ project_id: 'p-1', okr_id: 'okr-old' })], assignments: [], deletedProjectIds: [] })

  const route = await loadRoute(env)
  const missing = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'update_project_okr', project_id: 'p-1' }))
  assert.equal(missing.status, 400)

  const ghostProject = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'update_project_okr', project_id: 'nope', okr_id: 'okr-2' }))
  assert.equal(ghostProject.status, 404)

  const res = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'update_project_okr', project_id: 'p-1', okr_id: 'okr-2' }))
  const body = await res.json()
  assert.equal(body.success, true)
  assert.equal(env.read('persisted-projects.json').projects[0].okr_id, 'okr-2')
})

test('projects route POST evidence: submit prepends and delete removes', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-evidence' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', { projects: [PROJECT({ project_id: 'p-1' })], assignments: [], deletedProjectIds: [] })

  const route = await loadRoute(env)
  await route.POST(jsonRequest('/api/projects', 'POST', {
    action: 'submit_evidence',
    submission: { project_id: 'p-1', sender_id: 'u-1', file_name: 'หลักฐาน.pdf', file_path: 'OKR-files/x.pdf', evidence_id: 'ev-1' }
  }))
  let p = env.read('persisted-projects.json').projects[0]
  assert.equal(p.evidences.length, 1)
  assert.equal(p.evidences[0].file_name, 'หลักฐาน.pdf')
  assert.match(p.evidences[0].description, /หลักฐาน\.pdf/)

  await route.POST(jsonRequest('/api/projects', 'POST', { action: 'delete_evidence', evidence_id: 'ev-1', project_id: 'p-1' }))
  p = env.read('persisted-projects.json').projects[0]
  assert.equal(p.evidences.length, 0)
})

test('projects route DELETE: removes project, its assignments, and cascades to reports/evaluations/evidences by id and name', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-delete' })
  t.after(() => env.restore())

  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', {
    projects: [PROJECT({ project_id: 'p-1', project_name: 'โครงการเดิม' }), PROJECT({ project_id: 'p-2', project_name: 'โครงการอื่น' })],
    assignments: [
      { assignment_id: 'a1', project_id: 'p-1', user_id: 'u1', role_type: 'Member' },
      { assignment_id: 'a2', project_id: 'p-2', user_id: 'u1', role_type: 'Member' }
    ],
    deletedProjectIds: []
  })
  env.seed('persisted-normal-reports.json', {
    reports: [
      { report_id: 'r-1', project_id: 'p-1', project_name: 'โครงการเดิม' },
      { report_id: 'r-2', project_id: 'p-9', project_name: 'โครงการเดิม' },
      { report_id: 'r-3', project_id: 'p-2', project_name: 'โครงการอื่น' }
    ]
  })
  env.seed('persisted-evaluations.json', {
    evaluations: [
      { eval_id: 'e-1', project_id: 'p-1' },
      { eval_id: 'e-2', report_id: 'r-2' },
      { eval_id: 'e-3', project_id: 'p-2' }
    ]
  })
  env.seed('persisted-evidences.json', { evidences: [{ evidence_id: 'v-1', project_id: 'p-1' }, { evidence_id: 'v-2', project_id: 'p-2' }] })

  const route = await loadRoute(env)
  const res = await route.DELETE(jsonRequest('/api/projects?projectId=p-1', 'DELETE'))
  const body = await res.json()

  assert.equal(body.success, true)

  const projects = env.read('persisted-projects.json')
  assert.deepEqual(projects.projects.map(p => p.project_id), ['p-2'])
  assert.deepEqual(projects.assignments.map(a => a.project_id), ['p-2'])
  assert.deepEqual(projects.deletedProjectIds, ['p-1'])

  const reports = env.read('persisted-normal-reports.json').reports
  assert.deepEqual(reports.map(r => r.report_id), ['r-3'], 'removed by project_id AND by project_name match')

  const evals = env.read('persisted-evaluations.json').evaluations
  assert.deepEqual(evals.map(e => e.eval_id), ['e-3'], 'removed by project_id AND by cascaded report_id')

  const evidences = env.read('persisted-evidences.json').evidences
  assert.deepEqual(evidences.map(e => e.evidence_id), ['v-2'])
})

test('projects route DELETE: missing projectId is a 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-del400' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', { projects: [], assignments: [], deletedProjectIds: [] })

  const route = await loadRoute(env)
  const res = await route.DELETE(jsonRequest('/api/projects', 'DELETE'))
  assert.equal(res.status, 400)
})

test('projects route POST: unknown action returns 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'proj-unknown' })
  t.after(() => env.restore())
  env.seed('persisted-users.json', { users: [], deletedUserIds: [] })
  env.seed('persisted-projects.json', { projects: [], assignments: [], deletedProjectIds: [] })

  const route = await loadRoute(env)
  const res = await route.POST(jsonRequest('/api/projects', 'POST', { action: 'teleport' }))
  assert.equal(res.status, 400)
})
