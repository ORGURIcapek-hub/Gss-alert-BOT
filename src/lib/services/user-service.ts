import { mockUsers } from '@/lib/mock-data'
import { UserProfile, UserRole } from '@/types/database.types'
import { getManagementOrder } from '@/lib/user-constants'
import { getCachedUsers, setCachedUsers } from './service-helpers'

let inMemoryUsers: UserProfile[] = [...mockUsers]

/** Retrieve current in-memory users cache */
export function getInMemoryUsers(): UserProfile[] {
  return inMemoryUsers
}

/** Set in-memory users cache */
export function setInMemoryUsers(users: UserProfile[]): void {
  inMemoryUsers = users
}

/** Fetch all active users via server API /api/users, fallback to local cache/mock */
export async function fetchUsers(): Promise<UserProfile[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        if (data?.success && Array.isArray(data.users) && data.users.length > 0) {
          inMemoryUsers = data.users
          setCachedUsers(data.users)
          return data.users
        }
      }
    } catch {
      // Fall through to cache/in-memory
    }
  }

  const cached = getCachedUsers()
  if (cached.length > 0) {
    inMemoryUsers = cached
    return cached
  }

  return inMemoryUsers
}

/** Update user role */
export async function updateUserRoleRecord(userId: string, role: UserRole): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role })
      })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.map(u => (u.user_id === userId ? { ...u, role, management_order: getManagementOrder(role) } : u))
  setCachedUsers(inMemoryUsers)
}

/** Update user password */
export async function updateUserPasswordRecord(userId: string, newPassword: string): Promise<void> {
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

/** Delete user record */
export async function deleteUserRecord(userId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
    } catch {}
  }

  inMemoryUsers = inMemoryUsers.filter(u => u.user_id !== userId)
  setCachedUsers(inMemoryUsers)
}

/** Update user profile fields */
export async function updateUserProfileRecord(
  userId: string,
  updates: {
    name?: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    department?: string
    position?: string
  }
): Promise<UserProfile | null> {
  const computedFirstName = updates.first_name || (updates.name ? updates.name.split(' ')[0] : undefined)
  const computedLastName = updates.last_name || (updates.name ? updates.name.split(' ').slice(1).join(' ') : undefined)
  const computedName = updates.name || (computedFirstName && computedLastName ? `${computedFirstName} ${computedLastName}` : undefined)

  const sanitizedUpdates: Partial<UserProfile> = {
    ...updates,
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

/** Register new user record */
export async function registerUserRecord(userData: {
  username?: string
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
  const computedFirstName = userData.first_name || (userData.name ? userData.name.split(' ')[0] : 'อาจารย์')
  const computedLastName = userData.last_name || (userData.name ? userData.name.split(' ').slice(1).join(' ') || 'ประจำภาควิชา' : 'ประจำภาควิชา')
  const computedName = userData.name || `${computedFirstName} ${computedLastName}`
  const computedUsername = userData.username || cleanEmail.split('@')[0]
  const userRole: UserRole = userData.role || 'teacher'
  const userStatus = userData.status || 'pending'
  const userPassword = userData.password || 'password123'
  const userAvatar = userData.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'

  let createdUser: UserProfile | null = null

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          email: cleanEmail,
          username: computedUsername,
          name: computedName,
          first_name: computedFirstName,
          last_name: computedLastName,
          status: userStatus,
          password: userPassword,
          avatar_url: userAvatar
        })
      })
      const data = await res.json()
      if (res.ok && data.success && data.user) {
        createdUser = data.user
      } else if (data.error) {
        throw new Error(data.error)
      }
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch') && !e.message.includes('NetworkError')) {
        throw e
      }
      console.warn('[user-service] POST /api/users network failed, fallback to local', e)
    }
  }

  const newUser: UserProfile = createdUser || {
    user_id: crypto.randomUUID(),
    username: computedUsername,
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

/** Approve pending user */
export async function approveUserRecord(userId: string, assignedRole?: UserRole): Promise<UserProfile> {
  let updatedUser: UserProfile | null = null

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', userId, assignedRole })
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
  setCachedUsers(inMemoryUsers)
  return updatedUser || inMemoryUsers.find(u => u.user_id === userId)!
}

/** Reject pending user */
export async function rejectUserRecord(userId: string): Promise<void> {
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

/** Fetch pending approval users */
export async function fetchPendingUsers(): Promise<UserProfile[]> {
  const users = await fetchUsers()
  return users.filter(u => u.status === 'pending')
}
