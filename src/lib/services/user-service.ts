import { mockUsers } from '@/lib/mock-data'
import { UserProfile, UserRole } from '@/types/database.types'
import { getManagementOrder } from '@/lib/user-constants'
import { getCachedUsers, setCachedUsers, fetchWithDeduplication, invalidateApiCache } from './service-helpers'

let inMemoryUsers: UserProfile[] = []

export function getInMemoryUsers(): UserProfile[] {
  return inMemoryUsers
}

export function setInMemoryUsers(users: UserProfile[]): void {
  inMemoryUsers = users
}

export async function fetchUsers(force: boolean = true): Promise<UserProfile[]> {
  if (typeof window !== 'undefined') {
    try {
      const url = force ? `/api/users?force=true&t=${Date.now()}` : '/api/users'
      const data = await fetchWithDeduplication<{ success: boolean; users: UserProfile[] }>(url, {
        forceRefresh: force,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store'
        },
        ttl: force ? 0 : 2500
      })
      if (data?.success && Array.isArray(data.users)) {
        inMemoryUsers = data.users
        setCachedUsers(data.users)
        return data.users
      }
    } catch {
    }
  }

  const cached = getCachedUsers()
  if (cached.length > 0) {
    inMemoryUsers = cached
    return cached
  }

  return inMemoryUsers
}

export async function updateUserRoleRecord(userId: string, role: UserRole, year?: number): Promise<void> {
  invalidateApiCache('/api/users')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role, year })
      })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.map(u => {
    if (u.user_id === userId) {
      const updated = { ...u, role, management_order: getManagementOrder(role) }
      if (year) {
        updated.yearly_roles = {
          ...(u.yearly_roles || {}),
          [String(year)]: role
        }
      }
      return updated
    }
    return u
  })
  setCachedUsers(inMemoryUsers)
}

export async function updateUserYearlyRoleRecord(userId: string, year: number, role: UserRole): Promise<void> {
  invalidateApiCache('/api/users')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role, year })
      })
    } catch {}
  }

  const yearKey = String(year)
  inMemoryUsers = inMemoryUsers.map(u => {
    if (u.user_id === userId) {
      return {
        ...u,
        yearly_roles: {
          ...(u.yearly_roles || {}),
          [yearKey]: role
        }
      }
    }
    return u
  })
  setCachedUsers(inMemoryUsers)
}

export async function updateUserPasswordRecord(userId: string, newPassword: string): Promise<void> {
  invalidateApiCache('/api/users')
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_password', userId, password: newPassword })
      })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.map(u => (u.user_id === userId ? { ...u, password: newPassword } : u))
  setCachedUsers(inMemoryUsers)
}

export async function deleteUserRecord(userId: string): Promise<void> {
  invalidateApiCache('/api/users')
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.filter(u => u.user_id !== userId)
  setCachedUsers(inMemoryUsers)
}

export async function updateUserProfileRecord(
  userId: string,
  updates: {
    title?: string | null
    gender?: 'male' | 'female' | null
    name?: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    department?: string
    position?: string
  }
): Promise<UserProfile | null> {
  invalidateApiCache('/api/users')
  const title = updates.title !== undefined ? updates.title : undefined
  const gender = updates.gender !== undefined ? updates.gender : undefined
  const computedFirstName = updates.first_name || (updates.name ? updates.name.split(' ')[0] : undefined)
  const computedLastName = updates.last_name || (updates.name ? updates.name.split(' ').slice(1).join(' ') : undefined)
  const prefix = title ? `${title} ` : ''
  const computedName = updates.name || (computedFirstName && computedLastName ? `${prefix}${computedFirstName} ${computedLastName}`.trim() : undefined)

  const sanitizedUpdates: Partial<UserProfile> = {
    ...updates,
    ...(title !== undefined ? { title } : {}),
    ...(gender !== undefined ? { gender } : {}),
    ...(computedFirstName ? { first_name: computedFirstName } : {}),
    ...(computedLastName ? { last_name: computedLastName } : {}),
    ...(computedName ? { name: computedName } : {}),
    updated_at: new Date().toISOString()
  }

  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', userId, updates: sanitizedUpdates })
      })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.map(u => (u.user_id === userId ? { ...u, ...sanitizedUpdates } : u))
  setCachedUsers(inMemoryUsers)
  return inMemoryUsers.find(u => u.user_id === userId) || null
}

export async function registerUserRecord(userData: {
  username?: string
  title?: string | null
  gender?: 'male' | 'female' | null
  name?: string
  first_name?: string
  last_name?: string
  email: string
  password?: string
  role?: UserRole
  department?: string
  position?: string
  avatar_url?: string
  status?: 'pending' | 'approved' | 'rejected'
}): Promise<UserProfile> {
  const cleanEmail = userData.email.toLowerCase().trim()
  const title = (userData.title || '').trim()
  const gender = userData.gender || null
  const computedFirstName = userData.first_name || (userData.name ? userData.name.split(' ')[0] : 'อาจารย์')
  const computedLastName = userData.last_name || (userData.name ? userData.name.split(' ').slice(1).join(' ') || 'ประจำภาควิชา' : 'ประจำภาควิชา')
  const computedName = userData.name || `${title ? title + ' ' : ''}${computedFirstName} ${computedLastName}`.trim()
  const computedUsername = userData.username || cleanEmail.split('@')[0]
  const userRole: UserRole = userData.role || 'teacher'
  const userStatus = userData.status || 'pending'
  const userPassword = userData.password || 'password123'
  const userAvatar = userData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'

  let createdUser: UserProfile | null = null
  invalidateApiCache('/api/users')

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        },
        body: JSON.stringify({
          ...userData,
          title,
          gender,
          email: cleanEmail,
          username: computedUsername,
          name: computedName,
          first_name: computedFirstName,
          last_name: computedLastName,
          status: userStatus,
          password: userPassword,
          role: userRole,
          avatar_url: userAvatar
        })
      })
      const data = await res.json()
      if (res.ok && data.success && data.user) {
        createdUser = data.user
      } else {
        throw new Error(data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเข้าสู่ระบบเซิร์ฟเวอร์')
      }
    } catch (e: any) {
      console.error('[user-service] POST /api/users failed:', e)
      throw e
    }
  }

  const newUser: UserProfile = createdUser || {
    user_id: crypto.randomUUID(),
    username: computedUsername,
    title: title || null,
    gender: gender,
    name: computedName,
    email: cleanEmail,
    password: userPassword,
    first_name: computedFirstName,
    last_name: computedLastName,
    position: userData.position || 'อาจารย์ประจำภาควิชา',
    department: userData.department || 'ภาควิชาวิทยาการคอมพิวเตอร์',
    role: userRole,
    admin_type: userRole === 'admin' ? 'Super Admin' : null,
    executive_level: null,
    employment_status: 'Full-Time',
    management_order: getManagementOrder(userRole),
    avatar_url: userAvatar,
    status: userStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  inMemoryUsers = [newUser, ...inMemoryUsers.filter(u => u.user_id !== newUser.user_id)]
  setCachedUsers(inMemoryUsers)
  return newUser
}

export async function approveUserRecord(
  userId: string,
  assignedRole?: UserRole,
  userFallback?: UserProfile
): Promise<UserProfile> {
  invalidateApiCache('/api/users')
  let updatedUser: UserProfile | null = null

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          userId,
          assignedRole,
          user: userFallback
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถอนุมัติผู้ใช้งานได้')
      }
      if (data.user) {
        updatedUser = data.user
      }
    } catch (e: any) {
      console.error('[user-service] approveUserRecord error:', e)
      throw e
    }
  }

  inMemoryUsers = inMemoryUsers.map(u => {
    if (u.user_id === userId) {
      return updatedUser || {
        ...u,
        status: 'approved',
        ...(assignedRole ? { role: assignedRole, management_order: getManagementOrder(assignedRole) } : {})
      }
    }
    return u
  })

  if (updatedUser && !inMemoryUsers.some(u => u.user_id === userId)) {
    inMemoryUsers.push(updatedUser)
  }

  setCachedUsers(inMemoryUsers)
  return updatedUser || inMemoryUsers.find(u => u.user_id === userId)!
}

export async function rejectUserRecord(userId: string): Promise<void> {
  invalidateApiCache('/api/users')
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', userId })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถปฏิเสธคำขอสมัครได้')
      }
    } catch (e: any) {
      console.error('[user-service] rejectUserRecord error:', e)
      throw e
    }
  }

  inMemoryUsers = inMemoryUsers.map(u => (u.user_id === userId ? { ...u, status: 'rejected' } : u))
  setCachedUsers(inMemoryUsers)
}

export async function fetchPendingUsers(): Promise<UserProfile[]> {
  const users = await fetchUsers()
  return users.filter(u => u.status === 'pending')
}
