import test from 'node:test'
import assert from 'node:assert/strict'

function createProjectTestContext() {
  let inMemoryUsers = [
    { user_id: 'head-1', name: 'ดร.สมศรี เก่งกาจ', role: 'head_okr' },
    { user_id: 'head-2', name: 'ผศ.ดร.วิชัย มุ่งมั่น', role: 'head_okr' }
  ]

  let inMemoryOKRs = [
    { okr_id: 'okr-2568-q1', okr_title: 'ยุทธศาสตร์วิจัย 2568', year: 2568, quarter: 'Q1' },
    { okr_id: 'okr-2567-q2', okr_title: 'ยุทธศาสตร์บริการวิชาการ 2567', year: 2567, quarter: 'Q2' }
  ]

  let inMemoryProjects = [
    {
      project_id: 'proj-init-1',
      okr_id: 'okr-2568-q1',
      project_name: 'โครงการพัฒนาระบบ AI',
      department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
      status: 'In Progress',
      progress_percentage: 50,
      budget: 100000,
      spent_amount: 40000,
      bottleneck: null,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      head_of_project: 'head-1',
      head: inMemoryUsers[0],
      assignees: [],
      evidences: [],
      okr: inMemoryOKRs[0],
      year: 2568,
      quarter: 'Q1',
      updated_at: '2026-01-01T00:00:00.000Z'
    },
    {
      project_id: 'proj-init-2',
      okr_id: 'okr-2567-q2',
      project_name: 'โครงการอบรมเคมีชุมชน',
      department: 'ภาควิชาเคมี',
      status: 'Delayed',
      progress_percentage: 80,
      budget: 50000,
      spent_amount: 35000,
      bottleneck: 'รอผลแล็บ',
      start_date: '2024-06-01',
      end_date: '2024-11-30',
      head_of_project: 'head-2',
      head: inMemoryUsers[1],
      assignees: [],
      evidences: [],
      okr: inMemoryOKRs[1],
      year: 2567,
      quarter: 'Q2',
      updated_at: '2026-01-01T00:00:00.000Z'
    }
  ]

  function createProjectRecord(projectData) {
    const newId = 'proj-' + Math.random().toString(36).slice(2, 9)
    const headUser = inMemoryUsers.find(u => u.user_id === projectData.head_of_project) || null
    const linkedOkr = inMemoryOKRs.find(o => o.okr_id === projectData.okr_id) || null

    let initialStatus = 'In Progress'
    if (projectData.end_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(projectData.end_date)
      dueDate.setHours(0, 0, 0, 0)
      if (!isNaN(dueDate.getTime()) && dueDate.getTime() < today.getTime()) {
        initialStatus = 'Delayed'
      }
    }

    const newProj = {
      project_id: newId,
      okr_id: projectData.okr_id,
      project_name: projectData.project_name,
      project_type: projectData.project_type || 'โครงการตามแผน',
      description: projectData.description || '',
      main_objective: projectData.main_objective || '',
      sub_objective: projectData.sub_objective || '',
      department: projectData.department,
      start_date: projectData.start_date,
      end_date: projectData.end_date,
      head_of_project: projectData.head_of_project,
      progress_percentage: 0,
      budget: projectData.budget || 0,
      spent_amount: 0,
      status: initialStatus,
      bottleneck: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      head: headUser,
      assignees: [],
      evidences: [],
      okr: linkedOkr,
      year: linkedOkr?.year || null,
      quarter: linkedOkr?.quarter || null
    }

    inMemoryProjects.unshift(newProj)
    return newProj
  }

  function updateProjectProgressRecord(projectId, progress, bottleneck, status, spent) {
    const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)))
    const index = inMemoryProjects.findIndex(p => p.project_id === projectId)
    if (index !== -1) {
      inMemoryProjects[index] = {
        ...inMemoryProjects[index],
        progress_percentage: clampedProgress,
        bottleneck: bottleneck,
        status: status,
        spent_amount: spent !== undefined ? spent : inMemoryProjects[index].spent_amount,
        updated_at: new Date().toISOString()
      }
    }
  }

  function filterProjects(filters) {
    let list = [...inMemoryProjects]
    if (filters?.department && filters.department !== 'ทั้งหมด') {
      list = list.filter(p => p.department === filters.department)
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter(p => p.status === filters.status)
    }
    if (filters?.year) {
      list = list.filter(p => {
        const pYear = p.year || p.okr?.year || (p.start_date ? new Date(p.start_date).getFullYear() + 543 : null)
        return pYear ? Number(pYear) === Number(filters.year) : false
      })
    }
    if (filters?.quarter && filters.quarter !== 'ALL') {
      list = list.filter(p => (p.okr ? p.okr.quarter === filters.quarter : true))
    }
    return list
  }

  return {
    getProjects: () => inMemoryProjects,
    createProjectRecord,
    updateProjectProgressRecord,
    filterProjects
  }
}

test('createProjectRecord: marks past end_date project as Delayed automatically', () => {
  const ctx = createProjectTestContext()
  const pastProject = ctx.createProjectRecord({
    okr_id: 'okr-2568-q1',
    project_name: 'โครงการที่เลยกำหนดส่ง',
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    head_of_project: 'head-1',
    start_date: '2024-01-01',
    end_date: '2024-05-01'
  })

  assert.equal(pastProject.status, 'Delayed')
  assert.equal(pastProject.progress_percentage, 0)
  assert.equal(pastProject.spent_amount, 0)
  assert.equal(pastProject.head.user_id, 'head-1')
})

test('createProjectRecord: marks future end_date project as In Progress', () => {
  const ctx = createProjectTestContext()
  const futureProject = ctx.createProjectRecord({
    okr_id: 'okr-2568-q1',
    project_name: 'โครงการปัจจุบัน',
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    head_of_project: 'head-1',
    start_date: '2026-01-01',
    end_date: '2028-12-31'
  })

  assert.equal(futureProject.status, 'In Progress')
})

test('createProjectRecord: links OKR and copies year and quarter', () => {
  const ctx = createProjectTestContext()
  const proj = ctx.createProjectRecord({
    okr_id: 'okr-2567-q2',
    project_name: 'โครงการปี 2567 Q2',
    department: 'ภาควิชาเคมี',
    head_of_project: 'head-2',
    start_date: '2024-01-01',
    end_date: '2027-12-31'
  })

  assert.equal(proj.year, 2567)
  assert.equal(proj.quarter, 'Q2')
  assert.equal(proj.okr.okr_title, 'ยุทธศาสตร์บริการวิชาการ 2567')
})

test('updateProjectProgressRecord: clamps progress to integer within 0 to 100', () => {
  const ctx = createProjectTestContext()

  ctx.updateProjectProgressRecord('proj-init-1', -15, null, 'In Progress')
  assert.equal(ctx.getProjects().find(p => p.project_id === 'proj-init-1').progress_percentage, 0)

  ctx.updateProjectProgressRecord('proj-init-1', 140, null, 'Completed')
  assert.equal(ctx.getProjects().find(p => p.project_id === 'proj-init-1').progress_percentage, 100)

  ctx.updateProjectProgressRecord('proj-init-1', 67.8, 'ติดจัดซื้อ', 'In Progress')
  assert.equal(ctx.getProjects().find(p => p.project_id === 'proj-init-1').progress_percentage, 68)
})

test('updateProjectProgressRecord: preserves spent_amount when spent argument is undefined', () => {
  const ctx = createProjectTestContext()
  const originalSpent = ctx.getProjects().find(p => p.project_id === 'proj-init-1').spent_amount
  assert.equal(originalSpent, 40000)

  ctx.updateProjectProgressRecord('proj-init-1', 75, null, 'In Progress', undefined)
  assert.equal(ctx.getProjects().find(p => p.project_id === 'proj-init-1').spent_amount, 40000)

  ctx.updateProjectProgressRecord('proj-init-1', 80, null, 'In Progress', 45000)
  assert.equal(ctx.getProjects().find(p => p.project_id === 'proj-init-1').spent_amount, 45000)
})

test('filterProjects: filters by department correctly with bypass for ทั้งหมด', () => {
  const ctx = createProjectTestContext()

  const allDepts = ctx.filterProjects({ department: 'ทั้งหมด' })
  assert.equal(allDepts.length, 2)

  const csOnly = ctx.filterProjects({ department: 'ภาควิชาวิทยาการคอมพิวเตอร์' })
  assert.equal(csOnly.length, 1)
  assert.equal(csOnly[0].project_name, 'โครงการพัฒนาระบบ AI')

  const chemOnly = ctx.filterProjects({ department: 'ภาควิชาเคมี' })
  assert.equal(chemOnly.length, 1)
  assert.equal(chemOnly[0].project_name, 'โครงการอบรมเคมีชุมชน')
})

test('filterProjects: filters by status correctly with bypass for all', () => {
  const ctx = createProjectTestContext()

  const allStatuses = ctx.filterProjects({ status: 'all' })
  assert.equal(allStatuses.length, 2)

  const delayed = ctx.filterProjects({ status: 'Delayed' })
  assert.equal(delayed.length, 1)
  assert.equal(delayed[0].project_id, 'proj-init-2')
})

test('filterProjects: filters by academic year matching okr.year and project.year', () => {
  const ctx = createProjectTestContext()

  const y2568 = ctx.filterProjects({ year: 2568 })
  assert.equal(y2568.length, 1)
  assert.equal(y2568[0].project_id, 'proj-init-1')

  const y2567 = ctx.filterProjects({ year: 2567 })
  assert.equal(y2567.length, 1)
  assert.equal(y2567[0].project_id, 'proj-init-2')

  const y2560 = ctx.filterProjects({ year: 2560 })
  assert.equal(y2560.length, 0)
})

test('filterProjects: filters by quarter correctly with bypass for ALL', () => {
  const ctx = createProjectTestContext()

  const allQuarters = ctx.filterProjects({ quarter: 'ALL' })
  assert.equal(allQuarters.length, 2)

  const q1Only = ctx.filterProjects({ quarter: 'Q1' })
  assert.equal(q1Only.length, 1)
  assert.equal(q1Only[0].project_id, 'proj-init-1')

  const q2Only = ctx.filterProjects({ quarter: 'Q2' })
  assert.equal(q2Only.length, 1)
  assert.equal(q2Only[0].project_id, 'proj-init-2')
})

test('filterProjects: multi-criteria combination filters accurately across multiple fields', () => {
  const ctx = createProjectTestContext()

  const matched = ctx.filterProjects({
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    status: 'In Progress',
    year: 2568,
    quarter: 'Q1'
  })
  assert.equal(matched.length, 1)
  assert.equal(matched[0].project_id, 'proj-init-1')

  const unmatched = ctx.filterProjects({
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    status: 'Delayed',
    year: 2568,
    quarter: 'Q1'
  })
  assert.equal(unmatched.length, 0)
})
