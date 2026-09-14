import test from 'node:test'
import assert from 'node:assert/strict'

test('role eligibility: Executive can only assign users with head_okr role', () => {
  const allUsers = [
    { user_id: '1', role: 'admin', status: 'approved' },
    { user_id: '2', role: 'executive', status: 'approved' },
    { user_id: '3', role: 'teacher', status: 'approved' },
    { user_id: '4', role: 'staff', status: 'approved' },
    { user_id: '5', role: 'head_okr', status: 'approved' },
    { user_id: '6', role: 'head_okr', status: 'pending' },
    { user_id: '7', role: 'head_okr', status: 'rejected' }
  ]

  const eligibleForHead = allUsers.filter(u => u.role === 'head_okr' && (u.status === 'approved' || !u.status))
  assert.equal(eligibleForHead.length, 1)
  assert.equal(eligibleForHead[0].user_id, '5')
})

test('role eligibility: Head OKR can only assign users with teacher role as team members', () => {
  const allUsers = [
    { user_id: '1', role: 'admin', status: 'approved' },
    { user_id: '2', role: 'executive', status: 'approved' },
    { user_id: '3', role: 'teacher', status: 'approved' },
    { user_id: '4', role: 'staff', status: 'approved' },
    { user_id: '5', role: 'head_okr', status: 'approved' },
    { user_id: '6', role: 'teacher', status: 'pending' },
    { user_id: '7', role: 'teacher', status: 'approved' }
  ]

  const existingInProject = new Set(['7'])

  const availableTeachers = allUsers.filter(
    u =>
      u.role === 'teacher' &&
      u.status !== 'pending' &&
      u.status !== 'rejected' &&
      !existingInProject.has(u.user_id)
  )

  assert.equal(availableTeachers.length, 1)
  assert.equal(availableTeachers[0].user_id, '3')
})

test('self-rating guard: team member responsible for Project A cannot evaluate Project A', () => {
  const currentUser = { user_id: 'user-teacher-1', name: 'อาจารย์ กวิน' }
  const projectA = {
    project_id: 'proj-a',
    project_name: 'โครงการ A',
    head_of_project: 'head-1',
    assignees: [{ user_id: 'user-teacher-1', assigned_role: 'ผู้ร่วมรับผิดชอบโครงการ (Member)' }]
  }
  const reportA = {
    report_id: 'rep-a',
    project_id: 'proj-a',
    project_name: 'โครงการ A',
    responsible_person_name: 'อาจารย์ กวิน'
  }

  const isResponsible = Boolean(
    (projectA && (
      projectA.assignees?.some(a => a.user_id === currentUser.user_id) ||
      projectA.head_of_project === currentUser.user_id
    )) ||
    (reportA.responsible_person_name && reportA.responsible_person_name.includes(currentUser.name))
  )

  assert.equal(isResponsible, true)

  const otherUser = { user_id: 'user-other', name: 'อาจารย์ สมชาย' }
  const isOtherResponsible = Boolean(
    (projectA && (
      projectA.assignees?.some(a => a.user_id === otherUser.user_id) ||
      projectA.head_of_project === otherUser.user_id
    )) ||
    (reportA.responsible_person_name && reportA.responsible_person_name.includes(otherUser.name))
  )

  assert.equal(isOtherResponsible, false)
})

test('duplicate evaluation guard: each user can only rate a report once', () => {
  const evaluations = [
    { eval_id: 'e1', report_id: 'rep-1', evaluator_id: 'u1', team_score: 5 },
    { eval_id: 'e2', report_id: 'rep-1', evaluator_id: 'u2', team_score: 4 }
  ]

  const checkHasRated = (reportId, userId) => {
    const existing = evaluations.find(e => e.report_id === reportId && e.evaluator_id === userId)
    return Boolean(existing && existing.team_score !== null && existing.team_score !== undefined)
  }

  assert.equal(checkHasRated('rep-1', 'u1'), true)
  assert.equal(checkHasRated('rep-1', 'u2'), true)
  assert.equal(checkHasRated('rep-1', 'u3'), false)
})
