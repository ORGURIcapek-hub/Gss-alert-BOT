import test from 'node:test'
import assert from 'node:assert/strict'

function getUserFullName(user) {
  if (!user) return 'ไม่ระบุชื่อ'
  const first = user.first_name?.trim() || ''
  const last = user.last_name?.trim() || ''
  if (first || last) {
    return `${first} ${last}`.trim()
  }
  return user.name?.trim() || 'ไม่ระบุชื่อ'
}

function splitFullName(fullName) {
  const trimmed = (fullName || '').trim()
  if (!trimmed) {
    return { firstName: '', lastName: '' }
  }
  const parts = trimmed.split(/\s+/)
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''
  return { firstName, lastName }
}

function filterUsersBySearchQuery(users, query) {
  const term = (query || '').toLowerCase().trim()
  if (!term) return users

  return users.filter(u => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
    const name = (u.name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const username = (u.username || '').toLowerCase()
    const dept = (u.department || '').toLowerCase()
    const pos = (u.position || '').toLowerCase()

    return (
      name.includes(term) ||
      fullName.includes(term) ||
      email.includes(term) ||
      username.includes(term) ||
      dept.includes(term) ||
      pos.includes(term)
    )
  })
}

function formatDepartmentShort(dept) {
  if (!dept) return 'ส่วนกลาง'
  return dept.replace('ภาควิชา', '').trim() || 'ส่วนกลาง'
}

function formatThaiDate(dateStr, options) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('th-TH', options)
  } catch {
    return '-'
  }
}

function formatThaiDateTime(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    const datePart = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    const timePart = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    return `${datePart} เวลา ${timePart} น.`
  } catch {
    return '-'
  }
}

function removeTitlesAndRoles(name) {
  if (!name) return ''
  return name
    .replace(/\[.*?\]\s*/g, '')
    .replace(/^(ศ\.|รศ\.|ผศ\.|อ\.|ดร\.)+(\s*(ศ\.|รศ\.|ผศ\.|อ\.|ดร\.))*\s*/gi, '')
    .replace(/^อาจารย์\s*/g, '')
    .trim()
}

function getManagementOrder(role) {
  if (role === 'admin') return 1
  if (role === 'executive') return 2
  if (role === 'head_okr') return 3
  return 4
}

function isUserIdentical(u1, u2) {
  return (
    u1.user_id === u2.user_id &&
    u1.name === u2.name &&
    u1.first_name === u2.first_name &&
    u1.last_name === u2.last_name &&
    u1.role === u2.role &&
    u1.department === u2.department &&
    u1.position === u2.position &&
    u1.avatar_url === u2.avatar_url &&
    u1.status === u2.status &&
    u1.email === u2.email &&
    u1.password === u2.password
  )
}

function getUserRoleForYear(user, year, projects) {
  if (!user) return null

  if (user.role === 'admin') return 'admin'
  if (user.role === 'executive') return 'executive'

  const yearStr = String(year)
  if (user.yearly_roles && user.yearly_roles[yearStr]) {
    return user.yearly_roles[yearStr]
  }

  if (projects && projects.length > 0) {
    const yearProjects = projects.filter(p => {
      const pYear = p.okr?.year || p.year
      return pYear ? Number(pYear) === Number(year) : false
    })

    const isHeadInYear = yearProjects.some(p => {
      if (p.head_of_project === user.user_id) return true
      if (p.head?.user_id === user.user_id) return true
      return false
    })
    if (isHeadInYear) return 'head_okr'

    const isMemberInYear = yearProjects.some(p => {
      return (p.assignees || []).some(a => a.user_id === user.user_id)
    })
    if (isMemberInYear) return 'teacher'
  }

  return user.role
}

test('getUserFullName: handles null, undefined and empty user object', () => {
  assert.equal(getUserFullName(null), 'ไม่ระบุชื่อ')
  assert.equal(getUserFullName(undefined), 'ไม่ระบุชื่อ')
  assert.equal(getUserFullName({}), 'ไม่ระบุชื่อ')
})

test('getUserFullName: prefers first_name and last_name with proper trimming', () => {
  assert.equal(getUserFullName({ first_name: 'สมชาย', last_name: 'ใจดี' }), 'สมชาย ใจดี')
  assert.equal(getUserFullName({ first_name: '  สมชาย  ', last_name: '  ใจดี  ' }), 'สมชาย ใจดี')
  assert.equal(getUserFullName({ first_name: 'สมชาย', last_name: '' }), 'สมชาย')
  assert.equal(getUserFullName({ first_name: '', last_name: 'ใจดี' }), 'ใจดี')
  assert.equal(getUserFullName({ first_name: 'สมชาย', last_name: 'ใจดี', name: 'ชื่อเก่า' }), 'สมชาย ใจดี')
})

test('getUserFullName: falls back to name if first_name and last_name are missing', () => {
  assert.equal(getUserFullName({ name: 'อาจารย์ สมศรี' }), 'อาจารย์ สมศรี')
  assert.equal(getUserFullName({ name: '  อาจารย์ สมศรี  ' }), 'อาจารย์ สมศรี')
  assert.equal(getUserFullName({ name: '' }), 'ไม่ระบุชื่อ')
})

test('splitFullName: parses full name into first and last name components', () => {
  assert.deepEqual(splitFullName(''), { firstName: '', lastName: '' })
  assert.deepEqual(splitFullName('   '), { firstName: '', lastName: '' })
  assert.deepEqual(splitFullName('สมชาย'), { firstName: 'สมชาย', lastName: '' })
  assert.deepEqual(splitFullName('สมชาย ใจดี'), { firstName: 'สมชาย', lastName: 'ใจดี' })
  assert.deepEqual(splitFullName('  สมชาย   ใจดี  '), { firstName: 'สมชาย', lastName: 'ใจดี' })
  assert.deepEqual(splitFullName('สมชาย ใจดี ณ อยุธยา'), { firstName: 'สมชาย', lastName: 'ใจดี ณ อยุธยา' })
})

test('filterUsersBySearchQuery: returns all users when query is empty or whitespace', () => {
  const users = [
    { user_id: '1', name: 'กวิน' },
    { user_id: '2', name: 'สมชาย' }
  ]
  assert.equal(filterUsersBySearchQuery(users, '').length, 2)
  assert.equal(filterUsersBySearchQuery(users, '   ').length, 2)
  assert.equal(filterUsersBySearchQuery(users, null).length, 2)
})

test('filterUsersBySearchQuery: matches across name, email, username, department and position', () => {
  const users = [
    { user_id: '1', first_name: 'สมชาย', last_name: 'เข็มกลัด', email: 'somchai@dusit.ac.th', username: 'somchai_k', department: 'ภาควิชาวิทยาการคอมพิวเตอร์', position: 'อาจารย์' },
    { user_id: '2', first_name: 'วิภา', last_name: 'ศรีสุข', email: 'wipa@dusit.ac.th', username: 'wipa_s', department: 'ภาควิชาเคมี', position: 'หัวหน้าภาค' },
    { user_id: '3', name: 'admin_central', email: 'admin@dusit.ac.th', username: 'sysadmin', department: 'สำนักงานคณบดี', position: 'ผู้ดูแลระบบ' }
  ]

  assert.equal(filterUsersBySearchQuery(users, 'เข็มกลัด').length, 1)
  assert.equal(filterUsersBySearchQuery(users, 'SOMCHAI').length, 1)
  assert.equal(filterUsersBySearchQuery(users, 'wipa@dusit').length, 1)
  assert.equal(filterUsersBySearchQuery(users, 'sysadmin').length, 1)
  assert.equal(filterUsersBySearchQuery(users, 'เคมี').length, 1)
  assert.equal(filterUsersBySearchQuery(users, 'คณบดี').length, 1)
  assert.equal(filterUsersBySearchQuery(users, 'ไม่พบใคร').length, 0)
})

test('formatDepartmentShort: strips ภาควิชา prefix and returns ส่วนกลาง for empty values', () => {
  assert.equal(formatDepartmentShort('ภาควิชาวิทยาการคอมพิวเตอร์'), 'วิทยาการคอมพิวเตอร์')
  assert.equal(formatDepartmentShort('ภาควิชาเคมี'), 'เคมี')
  assert.equal(formatDepartmentShort('สำนักงานคณบดี'), 'สำนักงานคณบดี')
  assert.equal(formatDepartmentShort(null), 'ส่วนกลาง')
  assert.equal(formatDepartmentShort(''), 'ส่วนกลาง')
  assert.equal(formatDepartmentShort('ภาควิชา'), 'ส่วนกลาง')
})

test('formatThaiDate and formatThaiDateTime: formats valid dates and degrades safely', () => {
  assert.equal(formatThaiDate(null), '-')
  assert.equal(formatThaiDate('invalid-date-string'), '-')

  const formattedDate = formatThaiDate('2025-01-15T08:30:00Z')
  assert.ok(formattedDate !== '-')
  assert.ok(formattedDate.length > 0)

  assert.equal(formatThaiDateTime(null), '-')
  assert.equal(formatThaiDateTime('garbage'), '-')

  const formattedDateTime = formatThaiDateTime('2025-01-15T08:30:00Z')
  assert.ok(formattedDateTime.includes('เวลา'))
  assert.ok(formattedDateTime.includes('น.'))
})

test('removeTitlesAndRoles: removes academic titles, prefixes and bracketed roles', () => {
  assert.equal(removeTitlesAndRoles(''), '')
  assert.equal(removeTitlesAndRoles('[หัวหน้าโครงการ OKR] ดร.สมชาย ใจดี'), 'สมชาย ใจดี')
  assert.equal(removeTitlesAndRoles('ผศ.ดร. กานดา วงศ์สุวรรณ'), 'กานดา วงศ์สุวรรณ')
  assert.equal(removeTitlesAndRoles('รศ. ดร. วิชัย สดใส'), 'วิชัย สดใส')
  assert.equal(removeTitlesAndRoles('ศ. เกียรติคุณ ประเสริฐ'), 'เกียรติคุณ ประเสริฐ')
  assert.equal(removeTitlesAndRoles('อ. นภา รุ่งอรุณ'), 'นภา รุ่งอรุณ')
  assert.equal(removeTitlesAndRoles('อาจารย์ มงคล ทรงเดช'), 'มงคล ทรงเดช')
  assert.equal(removeTitlesAndRoles('นาย ทศพล ศรีสุวรรณ'), 'นาย ทศพล ศรีสุวรรณ')
})

test('getManagementOrder: returns correct priority levels for sorting', () => {
  assert.equal(getManagementOrder('admin'), 1)
  assert.equal(getManagementOrder('executive'), 2)
  assert.equal(getManagementOrder('head_okr'), 3)
  assert.equal(getManagementOrder('teacher'), 4)
  assert.equal(getManagementOrder('staff'), 4)
  assert.equal(getManagementOrder('unknown'), 4)
  assert.equal(getManagementOrder(null), 4)
})

test('isUserIdentical: returns true only if all 11 user fields match exactly', () => {
  const base = {
    user_id: 'u1',
    name: 'สมชาย',
    first_name: 'สมชาย',
    last_name: 'ใจดี',
    role: 'teacher',
    department: 'วิทยาการคอมพิวเตอร์',
    position: 'อาจารย์',
    avatar_url: 'https://avatar/1.jpg',
    status: 'approved',
    email: 'somchai@dusit.ac.th',
    password: 'Password#123'
  }

  assert.equal(isUserIdentical(base, { ...base }), true)
  assert.equal(isUserIdentical(base, { ...base, status: 'pending' }), false)
  assert.equal(isUserIdentical(base, { ...base, role: 'head_okr' }), false)
  assert.equal(isUserIdentical(base, { ...base, password: 'NewPassword#1' }), false)
  assert.equal(isUserIdentical(base, { ...base, email: 'other@dusit.ac.th' }), false)
  assert.equal(isUserIdentical(base, { ...base, department: 'เคมี' }), false)
})

test('getUserRoleForYear: admin and executive roles are immutable across years and projects', () => {
  const adminUser = { user_id: 'a1', role: 'admin', yearly_roles: { '2568': 'teacher' } }
  const execUser = { user_id: 'e1', role: 'executive', yearly_roles: { '2568': 'teacher' } }
  const projects = [
    { project_id: 'p1', year: 2568, head_of_project: 'other', assignees: [{ user_id: 'a1' }, { user_id: 'e1' }] }
  ]

  assert.equal(getUserRoleForYear(null, 2568), null)
  assert.equal(getUserRoleForYear(adminUser, 2568, projects), 'admin')
  assert.equal(getUserRoleForYear(execUser, 2568, projects), 'executive')
})

test('getUserRoleForYear: uses explicit yearly_roles configuration when specified', () => {
  const user = {
    user_id: 'u1',
    role: 'teacher',
    yearly_roles: {
      '2567': 'head_okr',
      '2568': 'staff'
    }
  }

  assert.equal(getUserRoleForYear(user, 2567), 'head_okr')
  assert.equal(getUserRoleForYear(user, 2568), 'staff')
})

test('getUserRoleForYear: dynamically resolves head_okr from project head_of_project or head.user_id', () => {
  const userA = { user_id: 'u-head-1', role: 'teacher' }
  const userB = { user_id: 'u-head-2', role: 'teacher' }

  const projects = [
    {
      project_id: 'p1',
      okr: { year: 2568 },
      head_of_project: 'u-head-1',
      assignees: []
    },
    {
      project_id: 'p2',
      year: 2568,
      head: { user_id: 'u-head-2' },
      assignees: []
    }
  ]

  assert.equal(getUserRoleForYear(userA, 2568, projects), 'head_okr')
  assert.equal(getUserRoleForYear(userB, 2568, projects), 'head_okr')
  assert.equal(getUserRoleForYear(userA, 2567, projects), 'teacher')
})

test('getUserRoleForYear: dynamically resolves teacher from project assignees in that academic year', () => {
  const user = { user_id: 'u-member-1', role: 'staff' }
  const projects = [
    {
      project_id: 'p1',
      okr: { year: 2568 },
      head_of_project: 'other-head',
      assignees: [{ user_id: 'u-member-1' }]
    }
  ]

  assert.equal(getUserRoleForYear(user, 2568, projects), 'teacher')
  assert.equal(getUserRoleForYear(user, 2567, projects), 'staff')
})

test('getUserRoleForYear: falls back to default user.role when user is not found in projects of that year', () => {
  const user = { user_id: 'u-free-1', role: 'staff' }
  const projects = [
    {
      project_id: 'p1',
      year: 2568,
      head_of_project: 'head-x',
      assignees: [{ user_id: 'other-user' }]
    }
  ]

  assert.equal(getUserRoleForYear(user, 2568, projects), 'staff')
  assert.equal(getUserRoleForYear(user, 2568, []), 'staff')
  assert.equal(getUserRoleForYear(user, 2568, null), 'staff')
})
