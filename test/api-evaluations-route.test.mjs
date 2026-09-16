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

test('evaluations route GET: returns all evaluations sorted by created_at desc', async t => {
  const env = createApiTestEnv({ fixtureName: 'evals-get' })
  t.after(() => env.restore())

  const ev1 = {
    eval_id: 'ev-1',
    project_id: 'p1',
    evaluator_id: 'u1',
    head_score: 4,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z'
  }
  const ev2 = {
    eval_id: 'ev-2',
    project_id: 'p2',
    evaluator_id: 'u2',
    head_score: 5,
    created_at: '2025-02-01T10:00:00Z',
    updated_at: '2025-02-01T10:00:00Z'
  }
  env.seed('persisted-evaluations.json', { evaluations: [ev1, ev2] })

  const route = await env.importRoute('app/api/evaluations/route.ts')
  const res = await route.GET(jsonRequest('/api/evaluations', 'GET'))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.evaluations.length, 2)
  assert.equal(body.evaluations[0].eval_id, 'ev-2')
  assert.equal(body.evaluations[1].eval_id, 'ev-1')
})

test('evaluations route GET: filters out evaluations belonging to deleted projects or deleted reports', async t => {
  const env = createApiTestEnv({ fixtureName: 'evals-filter' })
  t.after(() => env.restore())

  env.seed('persisted-projects.json', { projects: [], deletedProjectIds: ['p-deleted'] })
  env.seed('persisted-normal-reports.json', { reports: [{ report_id: 'rep-alive', project_id: 'p-alive' }] })

  const evActive = { eval_id: 'e1', report_id: 'rep-alive', evaluator_id: 'u1', head_score: 5, created_at: '2025-01-01T00:00:00Z' }
  const evDeletedProj = { eval_id: 'e2', project_id: 'p-deleted', evaluator_id: 'u2', head_score: 4, created_at: '2025-01-02T00:00:00Z' }
  const evDeadReport = { eval_id: 'e3', report_id: 'rep-ghost', evaluator_id: 'u3', head_score: 3, created_at: '2025-01-03T00:00:00Z' }

  env.seed('persisted-evaluations.json', { evaluations: [evActive, evDeletedProj, evDeadReport] })

  const route = await env.importRoute('app/api/evaluations/route.ts')
  const res = await route.GET(jsonRequest('/api/evaluations', 'GET'))
  const body = await res.json()

  assert.equal(body.evaluations.length, 1)
  assert.equal(body.evaluations[0].eval_id, 'e1')
})

test('evaluations route GET: de-duplicates newest evaluations per target key', async t => {
  const env = createApiTestEnv({ fixtureName: 'evals-dedup' })
  t.after(() => env.restore())

  const oldEv = {
    eval_id: 'e-old',
    project_id: 'p1',
    evaluator_id: 'u1',
    head_score: 3,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
  const newEv = {
    eval_id: 'e-new',
    project_id: 'p1',
    evaluator_id: 'u1',
    head_score: 5,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z'
  }

  env.seed('persisted-evaluations.json', { evaluations: [oldEv, newEv] })

  const route = await env.importRoute('app/api/evaluations/route.ts')
  const body = await (await route.GET(jsonRequest('/api/evaluations', 'GET'))).json()

  assert.equal(body.evaluations.length, 1)
  assert.equal(body.evaluations[0].eval_id, 'e-new')
  assert.equal(body.evaluations[0].head_score, 5)
})

test('evaluations route POST: rejects requests missing target report, dashboard or project', async t => {
  const env = createApiTestEnv({ fixtureName: 'evals-no-target' })
  t.after(() => env.restore())
  env.seed('persisted-evaluations.json', { evaluations: [] })

  const route = await env.importRoute('app/api/evaluations/route.ts')
  const res = await route.POST(jsonRequest('/api/evaluations', 'POST', {
    action: 'create_or_update',
    evaluator_id: 'u1',
    head_score: 5
  }))
  const body = await res.json()

  assert.equal(res.status, 400)
  assert.match(body.error, /ต้องระบุรายงานหรือโครงการ/)
})

test('evaluations route POST: rejects missing or invalid head_score', async t => {
  const env = createApiTestEnv({ fixtureName: 'evals-invalid-score' })
  t.after(() => env.restore())
  env.seed('persisted-evaluations.json', { evaluations: [] })

  const route = await env.importRoute('app/api/evaluations/route.ts')
  const res = await route.POST(jsonRequest('/api/evaluations', 'POST', {
    action: 'create_or_update',
    project_id: 'p1',
    evaluator_id: 'u1'
  }))
  const body = await res.json()

  assert.equal(res.status, 400)
  assert.match(body.error, /ต้องระบุคะแนนหัวข้อหลัก/)
})

test('evaluations route POST: clamps score values between 1 and 5', async t => {
  const env = createApiTestEnv({ fixtureName: 'evals-clamp' })
  t.after(() => env.restore())
  env.seed('persisted-evaluations.json', { evaluations: [] })

  const route = await env.importRoute('app/api/evaluations/route.ts')
  const res = await route.POST(jsonRequest('/api/evaluations', 'POST', {
    action: 'create_or_update',
    project_id: 'p1',
    evaluator_id: 'u1',
    head_score: 10,
    team_score: -5,
    executive_score: 3.8
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.evaluation.head_score, 5)
  assert.equal(body.evaluation.team_score, 1)
  assert.equal(body.evaluation.executive_score, 4)
})

test('evaluations route POST: updates existing evaluation in place when target and evaluator match', async t => {
  const env = createApiTestEnv({ fixtureName: 'evals-update' })
  t.after(() => env.restore())

  const initial = {
    eval_id: 'e-orig',
    project_id: 'p100',
    evaluator_id: 'user-evaluator',
    head_score: 2,
    team_score: 2,
    executive_score: null,
    created_at: '2025-01-10T12:00:00Z',
    updated_at: '2025-01-10T12:00:00Z'
  }
  env.seed('persisted-evaluations.json', { evaluations: [initial] })

  const route = await env.importRoute('app/api/evaluations/route.ts')
  const res = await route.POST(jsonRequest('/api/evaluations', 'POST', {
    action: 'create_or_update',
    project_id: 'p100',
    evaluator_id: 'user-evaluator',
    head_score: 5,
    team_score: 4
  }))
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.evaluation.eval_id, 'e-orig')
  assert.equal(body.evaluation.head_score, 5)
  assert.equal(body.evaluation.team_score, 4)
  assert.equal(body.evaluation.created_at, '2025-01-10T12:00:00Z')

  const stored = env.read('persisted-evaluations.json').evaluations
  assert.equal(stored.length, 1)
  assert.equal(stored[0].eval_id, 'e-orig')
  assert.equal(stored[0].head_score, 5)
})

test('evaluations route POST: rejects unknown action with 400', async t => {
  const env = createApiTestEnv({ fixtureName: 'evals-unknown' })
  t.after(() => env.restore())
  env.seed('persisted-evaluations.json', { evaluations: [] })

  const route = await env.importRoute('app/api/evaluations/route.ts')
  const res = await route.POST(jsonRequest('/api/evaluations', 'POST', { action: 'arbitrary' }))
  assert.equal(res.status, 400)
})
