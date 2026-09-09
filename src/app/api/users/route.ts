import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { mockUsers } from '@/lib/mock-data'
import { UserProfile, UserRole } from '@/types/database.types'

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-users.json')

function getManagementOrder(role?: string): number {
  if (role === 'admin') return 1
  if (role === 'executive') return 2
  if (role === 'head_okr') return 3
  return 4
}

function getSafeSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const { createClient } = require('@supabase/supabase-js')
    return createClient(url, key)
  } catch {
    return null
  }
}

interface StorageSchema {
  users: UserProfile[]
  deletedUserIds: string[]
}

// In-memory cache for fast reads
let memoryCache: StorageSchema | null = null

async function ensureDataFile(): Promise<StorageSchema> {
  if (memoryCache) return memoryCache

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (fs.existsSync(FILE_PATH)) {
      const content = await fs.promises.readFile(FILE_PATH, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed && Array.isArray(parsed.users)) {
        memoryCache = {
          users: parsed.users,
          deletedUserIds: Array.isArray(parsed.deletedUserIds) ? parsed.deletedUserIds : []
        }
        return memoryCache
      }
    }

    // Initialize with mockUsers (defaulting status to 'approved')
    const initialUsers: UserProfile[] = mockUsers.map(u => ({
      ...u,
      status: u.status || 'approved'
    }))

    const initialData: StorageSchema = {
      users: initialUsers,
      deletedUserIds: []
    }

    await fs.promises.writeFile(FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8')
    memoryCache = initialData
    return memoryCache
  } catch (err) {
    console.error('[api/users] Error ensuring data file:', err)
    return {
      users: mockUsers.map(u => ({ ...u, status: u.status || 'approved' })),
      deletedUserIds: []
    }
  }
}

async function saveStorage(data: StorageSchema): Promise<void> {
  memoryCache = data
  try {
    if (process.env.VERCEL) {
      return
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    await fs.promises.writeFile(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[api/users] Error saving storage:', err)
  }
}

// =============================================================================
// GET: Fetch all active users
// =============================================================================
export async function GET(req: NextRequest) {
  try {
    // 1. If Supabase is configured, fetch from Supabase (shared cloud database across all machines)
    const supabase = getSafeSupabaseClient()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('management_order', { ascending: true })

        if (!error && data && data.length > 0) {
          return NextResponse.json({
            success: true,
            users: data,
            source: 'supabase'
          })
        }
      } catch (dbErr) {
        console.warn('[api/users] Supabase query fallback to local:', dbErr)
      }
    }

    // 2. Fallback to local persistent file / memory cache
    const storage = await ensureDataFile()
    const activeUsers = storage.users.filter(u => !storage.deletedUserIds.includes(u.user_id))

    return NextResponse.json({
      success: true,
      users: activeUsers,
      source: 'local'
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST: Register / Create new user
// =============================================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const storage = await ensureDataFile()

    const email = (body.email || '').trim().toLowerCase()
    const username = (body.username || email.split('@')[0] || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุอีเมล' }, { status: 400 })
    }

    // Check for existing user (active or deleted)
    const existing = storage.users.find(
      u => !storage.deletedUserIds.includes(u.user_id) &&
           (u.email.toLowerCase() === email || (u.username && u.username.toLowerCase() === username))
    )
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'อีเมลหรือชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      )
    }

    const newId = body.user_id || crypto.randomUUID()
    const computedFirstName = body.first_name || (body.name ? body.name.split(' ')[0] : 'อาจารย์')
    const computedLastName = body.last_name || (body.name ? body.name.split(' ').slice(1).join(' ') || 'ประจำภาควิชา' : 'ประจำภาควิชา')
    const computedName = body.name || `${computedFirstName} ${computedLastName}`
    const userRole: UserRole = body.role || 'teacher'
    const userStatus = body.status || 'pending'
    const userPassword = body.password || 'password123'
    const userAvatar = body.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'

    const newUser: UserProfile = {
      user_id: newId,
      username: username,
      name: computedName,
      email: email,
      password: userPassword,
      first_name: computedFirstName,
      last_name: computedLastName,
      position: body.position || 'อาจารย์ประจำภาควิชา',
      department: body.department || 'ภาควิชาวิทยาการคอมพิวเตอร์',
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

    // Add to storage and persist
    storage.users.push(newUser)
    // Ensure newId is not in deletedUserIds
    storage.deletedUserIds = storage.deletedUserIds.filter(id => id !== newId)
    await saveStorage(storage)

    // Sync with Supabase if available
    const supabase = getSafeSupabaseClient()
    if (supabase) {
      try {
        await supabase.from('users').insert(newUser)
      } catch (dbErr) {
        console.warn('[api/users] Supabase insert warning:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      user: newUser
    })
  } catch (err: any) {
    console.error('[api/users] Error creating user:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT: Update user (approve, reject, role, password, profile)
// =============================================================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const storage = await ensureDataFile()
    const userIndex = storage.users.findIndex(u => u.user_id === userId)

    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const user = storage.users[userIndex]
    const now = new Date().toISOString()

    switch (action) {
      case 'approve': {
        user.status = 'approved'
        if (body.assignedRole) {
          user.role = body.assignedRole
          user.management_order = getManagementOrder(body.assignedRole)
        }
        user.updated_at = now
        break
      }

      case 'reject': {
        user.status = 'rejected'
        user.updated_at = now
        break
      }

      case 'update_role': {
        if (body.role) {
          user.role = body.role
          user.management_order = getManagementOrder(body.role)
          user.updated_at = now
        }
        break
      }

      case 'update_password': {
        if (body.password) {
          user.password = body.password
          user.updated_at = now
        }
        break
      }

      case 'update_profile': {
        const updates = body.updates || {}
        if (updates.name) user.name = updates.name
        if (updates.first_name) user.first_name = updates.first_name
        if (updates.last_name) user.last_name = updates.last_name
        if (updates.avatar_url) user.avatar_url = updates.avatar_url
        if (updates.department) user.department = updates.department
        if (updates.position) user.position = updates.position
        user.updated_at = now
        break
      }

      default: {
        return NextResponse.json({ success: false, error: `Unknown action "${action}"` }, { status: 400 })
      }
    }

    storage.users[userIndex] = user
    await saveStorage(storage)

    // Sync with Supabase if available
    const supabase = getSafeSupabaseClient()
    if (supabase) {
      try {
        await supabase.from('users').update({
          status: user.status,
          role: user.role,
          management_order: user.management_order,
          password: user.password,
          name: user.name,
          first_name: user.first_name,
          last_name: user.last_name,
          department: user.department,
          position: user.position,
          avatar_url: user.avatar_url,
          updated_at: user.updated_at
        }).eq('user_id', userId)
      } catch (dbErr) {
        console.warn('[api/users] Supabase update warning:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      user
    })
  } catch (err: any) {
    console.error('[api/users] Error updating user:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE: Delete user
// =============================================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId parameter' }, { status: 400 })
    }

    const storage = await ensureDataFile()
    if (!storage.deletedUserIds.includes(userId)) {
      storage.deletedUserIds.push(userId)
    }

    // Also remove from active users array
    storage.users = storage.users.filter(u => u.user_id !== userId)
    await saveStorage(storage)

    // Sync with Supabase if available
    const supabase = getSafeSupabaseClient()
    if (supabase) {
      try {
        await supabase.from('users').delete().eq('user_id', userId)
      } catch (dbErr) {
        console.warn('[api/users] Supabase delete warning:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      deletedUserId: userId
    })
  } catch (err: any) {
    console.error('[api/users] Error deleting user:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
