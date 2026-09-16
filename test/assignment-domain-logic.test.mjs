import test from 'node:test'
import assert from 'node:assert/strict'

function createTestContext() {
  let inMemoryAssignments = [
    {
      assignment_id: 'assign-1',
      project_id: 'proj-1',
      user_id: 'u-head-1',
      role_type: 'Head',
      assigned_by: null,
      created_at: '2026-01-01T00:00:00.000Z'
    },
    {
      assignment_id: 'assign-2',
      project_id: 'proj-1',
      user_id: 'u-mem-1',
      role_type: 'Member',
      assigned_by: 'u-head-1',
      created_at: '2026-01-01T00:00:00.000Z'
    },
    {
      assignment_id: 'assign-3',
      project_id: 'proj-2',
      user_id: 'u-head-2',
      role_type: 'Head',
      assigned_by: null,
      created_at: '2026-01-01T00:00:00.000Z'
    }
  ]

  let inMemoryUsers = [
    { user_id: 'u-head-1', name: 'หัวหน้า 1', role: 'head_okr' },
    { user_id: 'u-head-2', name: 'หัวหน้า 2', role: 'head_okr' },
    { user_id: 'u-new-head', name: 'หัวหน้าใหม่', role: 'head_okr' },
    { user_id: 'u-mem-1', name: 'สมาชิก 1', role: 'teacher' },
    { user_id: 'u-mem-2', name: 'สมาชิก 2', role: 'teacher' },
    { user_id: 'u-mem-3', name: 'สมาชิก 3', role: 'teacher' }
  ]

  let inMemoryProjects = [
    {
      project_id: 'proj-1',
      project_name: 'โครงการที่ 1',
      head_of_project: 'u-head-1',
      head: inMemoryUsers[0],
      assignees: [
        {
          project_id: 'proj-1',
          user_id: 'u-mem-1',
          assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)',
          assigned_date: '2026-01-01T00:00:00.000Z',
          user: inMemoryUsers[3]
        }
      ]
    },
    {
      project_id: 'proj-2',
      project_name: 'โครงการที่ 2',
      head_of_project: 'u-head-2',
      head: inMemoryUsers[1],
      assignees: []
    }
  ]

  function assignProjectRoles(data) {
    if (!data.user_ids || data.user_ids.length === 0) return []

    const newAssignments = data.user_ids.map(uId => ({
      assignment_id: 'gen-' + Math.random().toString(36).slice(2, 9),
      project_id: data.project_id,
      user_id: uId,
      role_type: data.role_type,
      assigned_by: data.assigned_by || null,
      created_at: new Date().toISOString()
    }))

    const assignedIdSet = new Set(data.user_ids)
    inMemoryAssignments = inMemoryAssignments.filter(a => {
      if (a.project_id !== data.project_id) return true
      if (assignedIdSet.has(a.user_id)) return false
      if (data.role_type === 'Head' && a.role_type === 'Head') return false
      return true
    })
    inMemoryAssignments = [...newAssignments, ...inMemoryAssignments]

    inMemoryProjects = inMemoryProjects.map(p => {
      if (p.project_id === data.project_id) {
        if (data.role_type === 'Head') {
          const firstHead = inMemoryUsers.find(u => u.user_id === data.user_ids[0]) || null
          return {
            ...p,
            head_of_project: data.user_ids[0],
            head: firstHead || p.head
          }
        } else {
          const assignees = p.assignees ? [...p.assignees] : []
          for (const uId of data.user_ids) {
            const exists = assignees.some(a => a.user_id === uId)
            if (!exists) {
              const targetUser = inMemoryUsers.find(u => u.user_id === uId) || null
              assignees.push({
                project_id: data.project_id,
                user_id: uId,
                assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)',
                assigned_date: new Date().toISOString(),
                user: targetUser || undefined
              })
            }
          }
          return {
            ...p,
            assignees
          }
        }
      }
      return p
    })

    return newAssignments
  }

  function removeProjectRole(assignmentId) {
    const target = inMemoryAssignments.find(a => a.assignment_id === assignmentId)
    if (target) {
      inMemoryAssignments = inMemoryAssignments.filter(a => a.assignment_id !== assignmentId)
      inMemoryProjects = inMemoryProjects.map(p => {
        if (p.project_id === target.project_id && p.assignees) {
          return {
            ...p,
            assignees: p.assignees.filter(a => a.user_id !== target.user_id)
          }
        }
        return p
      })
    }
  }

  function clearProjectAssignmentsFromMemory(projectId) {
    inMemoryAssignments = inMemoryAssignments.filter(a => a.project_id !== projectId)
  }

  return {
    getAssignments: () => inMemoryAssignments,
    getProjects: () => inMemoryProjects,
    assignProjectRoles,
    removeProjectRole,
    clearProjectAssignmentsFromMemory
  }
}

test('assignProjectRoles: returns empty array when user_ids is empty or null', () => {
  const ctx = createTestContext()
  const resEmpty = ctx.assignProjectRoles({ project_id: 'proj-1', user_ids: [], role_type: 'Member' })
  assert.deepEqual(resEmpty, [])
  assert.equal(ctx.getAssignments().length, 3)

  const resNull = ctx.assignProjectRoles({ project_id: 'proj-1', user_ids: null, role_type: 'Member' })
  assert.deepEqual(resNull, [])
})

test('assignProjectRoles (Head): replaces old Head assignment and re-binds project head and head_of_project', () => {
  const ctx = createTestContext()
  const res = ctx.assignProjectRoles({
    project_id: 'proj-1',
    user_ids: ['u-new-head'],
    role_type: 'Head',
    assigned_by: 'u-exec'
  })

  assert.equal(res.length, 1)
  assert.equal(res[0].user_id, 'u-new-head')
  assert.equal(res[0].role_type, 'Head')

  const proj1Assignments = ctx.getAssignments().filter(a => a.project_id === 'proj-1')
  const headAssignments = proj1Assignments.filter(a => a.role_type === 'Head')
  assert.equal(headAssignments.length, 1)
  assert.equal(headAssignments[0].user_id, 'u-new-head')

  const proj1 = ctx.getProjects().find(p => p.project_id === 'proj-1')
  assert.equal(proj1.head_of_project, 'u-new-head')
  assert.equal(proj1.head.user_id, 'u-new-head')
  assert.equal(proj1.head.name, 'หัวหน้าใหม่')
})

test('assignProjectRoles (Member): batch adds members and attaches user profiles without duplicates', () => {
  const ctx = createTestContext()
  const res = ctx.assignProjectRoles({
    project_id: 'proj-1',
    user_ids: ['u-mem-1', 'u-mem-2', 'u-mem-3'],
    role_type: 'Member',
    assigned_by: 'u-head-1'
  })

  assert.equal(res.length, 3)

  const proj1 = ctx.getProjects().find(p => p.project_id === 'proj-1')
  assert.equal(proj1.assignees.length, 3)

  const userIds = proj1.assignees.map(a => a.user_id)
  assert.deepEqual(userIds, ['u-mem-1', 'u-mem-2', 'u-mem-3'])
  assert.ok(proj1.assignees.every(a => a.assigned_role === 'ผู้ร่วมรับผิดชอบโครงการ (Member)'))
  assert.equal(proj1.assignees.find(a => a.user_id === 'u-mem-2').user.name, 'สมาชิก 2')
})

test('assignProjectRoles (Member): idempotency prevents duplicate assignments in project', () => {
  const ctx = createTestContext()
  ctx.assignProjectRoles({
    project_id: 'proj-1',
    user_ids: ['u-mem-2'],
    role_type: 'Member'
  })
  ctx.assignProjectRoles({
    project_id: 'proj-1',
    user_ids: ['u-mem-2'],
    role_type: 'Member'
  })

  const proj1 = ctx.getProjects().find(p => p.project_id === 'proj-1')
  const matches = proj1.assignees.filter(a => a.user_id === 'u-mem-2')
  assert.equal(matches.length, 1)
})

test('assignProjectRoles: cross-project isolation preserves other projects unmodified', () => {
  const ctx = createTestContext()
  ctx.assignProjectRoles({
    project_id: 'proj-1',
    user_ids: ['u-mem-2'],
    role_type: 'Member'
  })

  const proj2 = ctx.getProjects().find(p => p.project_id === 'proj-2')
  assert.equal(proj2.head_of_project, 'u-head-2')
  assert.equal(proj2.assignees.length, 0)

  const proj2Assignments = ctx.getAssignments().filter(a => a.project_id === 'proj-2')
  assert.equal(proj2Assignments.length, 1)
  assert.equal(proj2Assignments[0].user_id, 'u-head-2')
})

test('removeProjectRole: unassigns member from both assignments and project assignees', () => {
  const ctx = createTestContext()
  ctx.removeProjectRole('assign-2')

  const assignments = ctx.getAssignments()
  assert.equal(assignments.some(a => a.assignment_id === 'assign-2'), false)

  const proj1 = ctx.getProjects().find(p => p.project_id === 'proj-1')
  assert.equal(proj1.assignees.some(a => a.user_id === 'u-mem-1'), false)
  assert.equal(proj1.assignees.length, 0)
})

test('removeProjectRole: non-existent assignment ID is handled safely without error', () => {
  const ctx = createTestContext()
  const beforeCount = ctx.getAssignments().length
  ctx.removeProjectRole('non-existent-id')
  assert.equal(ctx.getAssignments().length, beforeCount)
})

test('clearProjectAssignmentsFromMemory: removes only target project assignments', () => {
  const ctx = createTestContext()
  ctx.clearProjectAssignmentsFromMemory('proj-1')

  const remaining = ctx.getAssignments()
  assert.equal(remaining.length, 1)
  assert.equal(remaining[0].project_id, 'proj-2')
})
