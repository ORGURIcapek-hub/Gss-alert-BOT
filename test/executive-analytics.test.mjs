import test from 'node:test'
import assert from 'node:assert/strict'

function isProjectCompleted(p) {
  const prog = Number(p.progress_percentage)
  return (!isNaN(prog) && prog >= 100) || p.status === 'Completed'
}

function hasProjectBottleneck(p) {
  return typeof p.bottleneck === 'string' && p.bottleneck.trim().length > 0
}

function isProjectDelayed(p) {
  if (isProjectCompleted(p)) return false
  return p.status === 'Delayed' || Boolean(p.isOverdue) || hasProjectBottleneck(p)
}

function isProjectOnHold(p) {
  if (isProjectCompleted(p) || isProjectDelayed(p)) return false
  return p.status === 'On Hold' || p.status === 'Draft'
}

function isProjectInProgress(p) {
  if (isProjectCompleted(p) || isProjectDelayed(p) || isProjectOnHold(p)) return false
  return true
}

function calculateDashboardMetrics(okrs, projects) {
  const totalProjects = projects.length
  const completedProjects = projects.filter(p => isProjectCompleted(p)).length
  const delayedProjects = projects.filter(p => isProjectDelayed(p)).length

  const avgProgress = totalProjects > 0
    ? (projects.reduce((acc, p) => acc + Number(p.progress_percentage || 0), 0) / totalProjects).toFixed(1)
    : '0.0'

  const totalBudget = projects.reduce((acc, p) => acc + Number(p.budget || 0), 0)
  const totalSpent = projects.reduce((acc, p) => acc + Number(p.spent_amount || 0), 0)
  const spentPercent = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0'

  return {
    okrCount: okrs.length,
    totalProjects,
    completedProjects,
    delayedProjects,
    avgProgress,
    totalBudget,
    totalSpent,
    spentPercent
  }
}

function aggregateDepartmentMetrics(projects) {
  const deptMap = {}
  projects.forEach(p => {
    const dept = p.department || 'ส่วนกลาง'
    if (!deptMap[dept]) {
      deptMap[dept] = { totalBudget: 0, totalSpent: 0, totalProgress: 0, count: 0 }
    }
    deptMap[dept].totalBudget += Number(p.budget || 0)
    deptMap[dept].totalSpent += Number(p.spent_amount || 0)
    deptMap[dept].totalProgress += Number(p.progress_percentage || 0)
    deptMap[dept].count += 1
  })

  const results = {}
  for (const [dept, data] of Object.entries(deptMap)) {
    results[dept] = {
      ...data,
      avgProgress: (data.totalProgress / (data.count || 1)).toFixed(1),
      spentPercent: data.totalBudget > 0 ? ((data.totalSpent / data.totalBudget) * 100).toFixed(1) : '0'
    }
  }
  return results
}

function filterExecutiveProjects(projects, filterType, query) {
  let list = []
  if (filterType === 'COMPLETED') list = projects.filter(p => isProjectCompleted(p))
  else if (filterType === 'IN_PROGRESS') list = projects.filter(p => isProjectInProgress(p))
  else if (filterType === 'DELAYED') list = projects.filter(p => isProjectDelayed(p))
  else if (filterType === 'ON_HOLD') list = projects.filter(p => isProjectOnHold(p))
  else list = [...projects]

  const q = (query || '').toLowerCase().trim()
  if (!q) return list

  return list.filter(p => {
    const projName = (p.project_name || '').toLowerCase()
    const deptName = (p.department || '').toLowerCase()
    const headName = (p.head?.name || `${p.head?.first_name || ''} ${p.head?.last_name || ''}`).toLowerCase()
    const bottleneck = (p.bottleneck || '').toLowerCase()
    return projName.includes(q) || deptName.includes(q) || headName.includes(q) || bottleneck.includes(q)
  })
}

test('calculateDashboardMetrics: correctly aggregates okrs, progress, budget and risk status', () => {
  const okrs = [{ okr_id: 'o1' }, { okr_id: 'o2' }]
  const projects = [
    { project_id: 'p1', progress_percentage: 100, status: 'Completed', budget: 500000, spent_amount: 500000 },
    { project_id: 'p2', progress_percentage: 50, status: 'In Progress', budget: 300000, spent_amount: 150000 },
    { project_id: 'p3', progress_percentage: 20, status: 'Delayed', isOverdue: true, budget: 200000, spent_amount: 50000 }
  ]

  const metrics = calculateDashboardMetrics(okrs, projects)
  assert.equal(metrics.okrCount, 2)
  assert.equal(metrics.totalProjects, 3)
  assert.equal(metrics.completedProjects, 1)
  assert.equal(metrics.delayedProjects, 1)
  assert.equal(metrics.avgProgress, '56.7')
  assert.equal(metrics.totalBudget, 1000000)
  assert.equal(metrics.totalSpent, 700000)
  assert.equal(metrics.spentPercent, '70.0')
})

test('calculateDashboardMetrics: safely handles zero projects without division by zero', () => {
  const metrics = calculateDashboardMetrics([], [])
  assert.equal(metrics.okrCount, 0)
  assert.equal(metrics.totalProjects, 0)
  assert.equal(metrics.completedProjects, 0)
  assert.equal(metrics.delayedProjects, 0)
  assert.equal(metrics.avgProgress, '0.0')
  assert.equal(metrics.totalBudget, 0)
  assert.equal(metrics.totalSpent, 0)
  assert.equal(metrics.spentPercent, '0')
})

test('aggregateDepartmentMetrics: groups budget, spent and progress by department with fallbacks', () => {
  const projects = [
    { project_id: 'p1', department: 'ภาควิชาวิทยาการคอมพิวเตอร์', budget: 400000, spent_amount: 200000, progress_percentage: 80 },
    { project_id: 'p2', department: 'ภาควิชาวิทยาการคอมพิวเตอร์', budget: 600000, spent_amount: 300000, progress_percentage: 60 },
    { project_id: 'p3', department: 'ภาควิชาเคมี', budget: 500000, spent_amount: 250000, progress_percentage: 90 },
    { project_id: 'p4', department: null, budget: 100000, spent_amount: 0, progress_percentage: 10 }
  ]

  const depts = aggregateDepartmentMetrics(projects)

  const cs = depts['ภาควิชาวิทยาการคอมพิวเตอร์']
  assert.equal(cs.count, 2)
  assert.equal(cs.totalBudget, 1000000)
  assert.equal(cs.totalSpent, 500000)
  assert.equal(cs.avgProgress, '70.0')
  assert.equal(cs.spentPercent, '50.0')

  const chem = depts['ภาควิชาเคมี']
  assert.equal(chem.count, 1)
  assert.equal(chem.totalBudget, 500000)
  assert.equal(chem.avgProgress, '90.0')

  const central = depts['ส่วนกลาง']
  assert.equal(central.count, 1)
  assert.equal(central.spentPercent, '0.0')
})

test('filterExecutiveProjects: filters projects by status and search terms', () => {
  const projects = [
    { project_id: 'p1', project_name: 'ระบบสารสนเทศ', department: 'คอมพิวเตอร์', status: 'Completed', progress_percentage: 100, head: { name: 'อ.สมชาย' } },
    { project_id: 'p2', project_name: 'การอบรมแล็บเคมี', department: 'เคมี', status: 'Delayed', isOverdue: true, progress_percentage: 40, bottleneck: 'รอสารเคมี', head: { first_name: 'กวิน', last_name: 'นาถ' } },
    { project_id: 'p3', project_name: 'หลักสูตรใหม่', department: 'ฟิสิกส์', status: 'On Hold', progress_percentage: 10, head: { name: 'อ.วิชัย' } },
    { project_id: 'p4', project_name: 'วิจัยนวัตกรรม', department: 'คอมพิวเตอร์', status: 'In Progress', progress_percentage: 50, head: { name: 'อ.นภา' } }
  ]

  assert.equal(filterExecutiveProjects(projects, 'ALL', '').length, 4)
  assert.equal(filterExecutiveProjects(projects, 'COMPLETED', '').length, 1)
  assert.equal(filterExecutiveProjects(projects, 'DELAYED', '').length, 1)
  assert.equal(filterExecutiveProjects(projects, 'ON_HOLD', '').length, 1)
  assert.equal(filterExecutiveProjects(projects, 'IN_PROGRESS', '').length, 1)

  const searchByName = filterExecutiveProjects(projects, 'ALL', 'สารสนเทศ')
  assert.equal(searchByName.length, 1)
  assert.equal(searchByName[0].project_id, 'p1')

  const searchByBottleneck = filterExecutiveProjects(projects, 'ALL', 'รอสารเคมี')
  assert.equal(searchByBottleneck.length, 1)
  assert.equal(searchByBottleneck[0].project_id, 'p2')

  const searchByHead = filterExecutiveProjects(projects, 'ALL', 'กวิน')
  assert.equal(searchByHead.length, 1)
  assert.equal(searchByHead[0].project_id, 'p2')
})
