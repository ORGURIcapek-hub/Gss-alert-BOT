import test from 'node:test'
import assert from 'node:assert/strict'

const {
  getProjectProgress,
  hasProjectBottleneck,
  isProjectCompleted,
  isProjectDelayed,
  isProjectOnHold,
  isProjectInProgress,
  getProjectStatusKind
} = await import('../src/lib/project-status.ts')

const project = (overrides = {}) => ({
  progress_percentage: 50,
  status: 'In Progress',
  bottleneck: '',
  isOverdue: false,
  ...overrides
})

test('project-status [real source]: getProjectProgress returns 0 for null/undefined/missing', () => {
  assert.equal(getProjectProgress(null), 0)
  assert.equal(getProjectProgress(undefined), 0)
  assert.equal(getProjectProgress({}), 0)
})

test('project-status [real source]: getProjectProgress coerces numerics and rejects non-numerics', () => {
  assert.equal(getProjectProgress(project({ progress_percentage: 42 })), 42)
  assert.equal(getProjectProgress(project({ progress_percentage: '75' })), 75)
  assert.equal(getProjectProgress(project({ progress_percentage: 0 })), 0)
  assert.equal(getProjectProgress(project({ progress_percentage: 'abc' })), 0)
  assert.equal(getProjectProgress(project({ progress_percentage: NaN })), 0)
  assert.equal(getProjectProgress(project({ progress_percentage: null })), 0)
})

test('project-status [real source]: hasProjectBottleneck treats whitespace-only as false and any non-empty string as true', () => {
  assert.equal(hasProjectBottleneck(null), false)
  assert.equal(hasProjectBottleneck(project({ bottleneck: '' })), false)
  assert.equal(hasProjectBottleneck(project({ bottleneck: '   ' })), false)
  assert.equal(hasProjectBottleneck(project({ bottleneck: 'รองรับงบประมาณ' })), true)
  assert.equal(hasProjectBottleneck(project({ bottleneck: true })), true)
  assert.equal(hasProjectBottleneck(project({ bottleneck: 0 })), false)
})

test('project-status [real source]: isProjectCompleted by progress >= 100 or status Completed', () => {
  assert.equal(isProjectCompleted(project({ progress_percentage: 100 })), true)
  assert.equal(isProjectCompleted(project({ progress_percentage: 130 })), true)
  assert.equal(isProjectCompleted(project({ status: 'Completed', progress_percentage: 10 })), true)
  assert.equal(isProjectCompleted(project({ progress_percentage: 99.9 })), false)
  assert.equal(isProjectCompleted(null), false)
})

test('project-status [real source]: isProjectDelayed by status Delayed, isOverdue, or bottleneck — never for completed', () => {
  assert.equal(isProjectDelayed(project({ status: 'Delayed' })), true)
  assert.equal(isProjectDelayed(project({ isOverdue: true })), true)
  assert.equal(isProjectDelayed(project({ bottleneck: 'งบไม่พอ' })), true)
  assert.equal(isProjectDelayed(project({ status: 'Completed', isOverdue: true, bottleneck: 'x' })), false)
  assert.equal(isProjectDelayed(project({})), false)
  assert.equal(isProjectDelayed(null), false)
})

test('project-status [real source]: isProjectDelayed precedence — Completed beats Delayed flag', () => {
  assert.equal(isProjectDelayed(project({ status: 'Delayed', progress_percentage: 100 })), false)
})

test('project-status [real source]: isProjectOnHold only for On Hold/Draft and only when not completed/delayed', () => {
  assert.equal(isProjectOnHold(project({ status: 'On Hold' })), true)
  assert.equal(isProjectOnHold(project({ status: 'Draft' })), true)
  assert.equal(isProjectOnHold(project({ status: 'On Hold', isOverdue: true })), false)
  assert.equal(isProjectOnHold(project({ status: 'On Hold', bottleneck: 'x' })), false)
  assert.equal(isProjectOnHold(project({ status: 'On Hold', progress_percentage: 100 })), false)
  assert.equal(isProjectOnHold(project({ status: 'In Progress' })), false)
  assert.equal(isProjectOnHold(null), false)
})

test('project-status [real source]: isProjectInProgress is the fallback bucket', () => {
  assert.equal(isProjectInProgress(project({})), true)
  assert.equal(isProjectInProgress(project({ progress_percentage: 0 })), true)
  assert.equal(isProjectInProgress(project({ status: 'Completed' })), false)
  assert.equal(isProjectInProgress(project({ status: 'Delayed' })), false)
  assert.equal(isProjectInProgress(project({ status: 'On Hold' })), false)
  assert.equal(isProjectInProgress(null), false)
})

test('project-status [real source]: getProjectStatusKind resolves one of exactly four buckets', () => {
  assert.equal(getProjectStatusKind(project({ progress_percentage: 100 })), 'completed')
  assert.equal(getProjectStatusKind(project({ status: 'Delayed' })), 'delayed')
  assert.equal(getProjectStatusKind(project({ status: 'On Hold' })), 'on_hold')
  assert.equal(getProjectStatusKind(project({})), 'in_progress')
  assert.equal(getProjectStatusKind(null), 'in_progress')
})

test('project-status [real source]: kind precedence completed > delayed > on_hold > in_progress', () => {
  assert.equal(getProjectStatusKind(project({ status: 'Delayed', progress_percentage: 100 })), 'completed')
  assert.equal(getProjectStatusKind(project({ status: 'On Hold', isOverdue: true })), 'delayed')
})

test('project-status [real source]: partial snapshot objects (executive summary) work without isOverdue', () => {
  const snapshot = { progress_percentage: 20, status: 'In Progress', bottleneck: 'รออนุมัติ' }
  assert.equal(getProjectStatusKind(snapshot), 'delayed')
  assert.equal(hasProjectBottleneck(snapshot), true)
  assert.equal(isProjectInProgress(snapshot), false)
})
