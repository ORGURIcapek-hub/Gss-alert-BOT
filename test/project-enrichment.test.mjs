import test from 'node:test'
import assert from 'node:assert/strict'

function enrichProjectWithOverdue(project) {
  let isOverdue = false
  let daysOverdue = 0
  let daysRemaining = 0
  let effectiveStatus = project.status || 'In Progress'
  const progressNum = Number(project.progress_percentage)
  const safeProgress = Number.isFinite(progressNum) ? progressNum : 0

  if (project.end_date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(project.end_date)
    dueDate.setHours(0, 0, 0, 0)

    if (!isNaN(dueDate.getTime())) {
      const diffMs = dueDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays < 0 && safeProgress < 100) {
        isOverdue = true
        daysOverdue = Math.abs(diffDays)
        effectiveStatus = 'Delayed'
      } else if (diffDays >= 0) {
        daysRemaining = diffDays
      }
    }
  }

  if (safeProgress >= 100 || project.status === 'Completed') {
    effectiveStatus = 'Completed'
    isOverdue = false
    daysOverdue = 0
  }

  return {
    ...project,
    isOverdue,
    daysOverdue,
    daysRemaining,
    status: effectiveStatus,
    year: project.okr?.year || project.year || (project.start_date ? new Date(project.start_date).getFullYear() + 543 : null),
    quarter: project.okr?.quarter || project.quarter || null
  }
}

test('enrichProjectWithOverdue: marks project as delayed and calculates daysOverdue when past end_date', () => {
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 10)
  const pastIso = pastDate.toISOString().split('T')[0]

  const project = {
    project_id: 'p1',
    project_name: 'ล่าช้า',
    status: 'In Progress',
    progress_percentage: 60,
    end_date: pastIso
  }

  const enriched = enrichProjectWithOverdue(project)
  assert.equal(enriched.isOverdue, true)
  assert.equal(enriched.status, 'Delayed')
  assert.ok(enriched.daysOverdue >= 9 && enriched.daysOverdue <= 11)
  assert.equal(enriched.daysRemaining, 0)
})

test('enrichProjectWithOverdue: completed progress override clears overdue even if end_date has passed', () => {
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 25)
  const pastIso = pastDate.toISOString().split('T')[0]

  const project = {
    project_id: 'p2',
    status: 'In Progress',
    progress_percentage: 100,
    end_date: pastIso
  }

  const enriched = enrichProjectWithOverdue(project)
  assert.equal(enriched.isOverdue, false)
  assert.equal(enriched.status, 'Completed')
  assert.equal(enriched.daysOverdue, 0)
})

test('enrichProjectWithOverdue: Completed status override beats overdue and resets overdue days', () => {
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 40)
  const pastIso = pastDate.toISOString().split('T')[0]

  const project = {
    project_id: 'p3',
    status: 'Completed',
    progress_percentage: 85,
    end_date: pastIso
  }

  const enriched = enrichProjectWithOverdue(project)
  assert.equal(enriched.isOverdue, false)
  assert.equal(enriched.status, 'Completed')
  assert.equal(enriched.daysOverdue, 0)
})

test('enrichProjectWithOverdue: calculates daysRemaining for active project before end_date', () => {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 15)
  const futureIso = futureDate.toISOString().split('T')[0]

  const project = {
    project_id: 'p4',
    status: 'In Progress',
    progress_percentage: 45,
    end_date: futureIso
  }

  const enriched = enrichProjectWithOverdue(project)
  assert.equal(enriched.isOverdue, false)
  assert.equal(enriched.status, 'In Progress')
  assert.ok(enriched.daysRemaining >= 14 && enriched.daysRemaining <= 16)
  assert.equal(enriched.daysOverdue, 0)
})

test('enrichProjectWithOverdue: handles due date on today as zero daysRemaining', () => {
  const today = new Date()
  const todayIso = today.toISOString().split('T')[0]

  const project = {
    project_id: 'p5',
    status: 'In Progress',
    progress_percentage: 50,
    end_date: todayIso
  }

  const enriched = enrichProjectWithOverdue(project)
  assert.equal(enriched.isOverdue, false)
  assert.equal(enriched.daysRemaining, 0)
  assert.equal(enriched.daysOverdue, 0)
})

test('enrichProjectWithOverdue: missing or invalid end_date behaves safely without errors', () => {
  const noDate = {
    project_id: 'p6',
    status: 'In Progress',
    progress_percentage: 20
  }
  const enrichedNoDate = enrichProjectWithOverdue(noDate)
  assert.equal(enrichedNoDate.isOverdue, false)
  assert.equal(enrichedNoDate.daysOverdue, 0)
  assert.equal(enrichedNoDate.daysRemaining, 0)

  const invalidDate = {
    project_id: 'p7',
    status: 'In Progress',
    progress_percentage: 30,
    end_date: 'not-a-valid-date'
  }
  const enrichedInvalid = enrichProjectWithOverdue(invalidDate)
  assert.equal(enrichedInvalid.isOverdue, false)
  assert.equal(enrichedInvalid.daysOverdue, 0)
})

test('enrichProjectWithOverdue: resolves academic year following okr.year > project.year > start_date fallback', () => {
  const withOkr = {
    project_id: 'y1',
    okr: { year: 2568 },
    year: 2567,
    start_date: '2023-01-01'
  }
  assert.equal(enrichProjectWithOverdue(withOkr).year, 2568)

  const withProjYear = {
    project_id: 'y2',
    year: 2567,
    start_date: '2023-01-01'
  }
  assert.equal(enrichProjectWithOverdue(withProjYear).year, 2567)

  const withStartDate = {
    project_id: 'y3',
    start_date: '2024-06-01'
  }
  assert.equal(enrichProjectWithOverdue(withStartDate).year, 2567)

  const withNothing = { project_id: 'y4' }
  assert.equal(enrichProjectWithOverdue(withNothing).year, null)
})

test('enrichProjectWithOverdue: resolves quarter from okr.quarter then project.quarter', () => {
  const withOkrQuarter = {
    project_id: 'q1',
    okr: { quarter: 'Q1' },
    quarter: 'Q3'
  }
  assert.equal(enrichProjectWithOverdue(withOkrQuarter).quarter, 'Q1')

  const withProjQuarter = {
    project_id: 'q2',
    quarter: 'Q4'
  }
  assert.equal(enrichProjectWithOverdue(withProjQuarter).quarter, 'Q4')

  const withNoQuarter = { project_id: 'q3' }
  assert.equal(enrichProjectWithOverdue(withNoQuarter).quarter, null)
})

test('enrichProjectWithOverdue: coerces non-numeric progress percentage to zero safely', () => {
  const nonNumeric = {
    project_id: 'prog1',
    progress_percentage: 'invalid',
    status: 'In Progress'
  }
  const enriched = enrichProjectWithOverdue(nonNumeric)
  assert.equal(enriched.status, 'In Progress')
  assert.equal(enriched.isOverdue, false)
})
