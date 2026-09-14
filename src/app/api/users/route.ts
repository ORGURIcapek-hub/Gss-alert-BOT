import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { mockUsers } from '@/lib/mock-data'
import { UserProfile, UserRole } from '@/types/database.types'
import { getManagementOrder } from '@/lib/user-constants'
import { writeJsonAtomic, readJsonSafe } from '@/lib/atomic-storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store'
}

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE_PATH = path.join(DATA_DIR, 'persisted-users.json')

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

let memoryCache: StorageSchema | null = null
let lastCacheTimestamp = 0
let lastSupabaseSync = 0
const MEMORY_CACHE_TTL = 3000 
const SUPABASE_SYNC_INTERVAL = 10000 

async function ensureDataFile(forceDiskRead = false): Promise<StorageSchema> {
  if (!forceDiskRead && memoryCache && Date.now() - lastCacheTimestamp < MEMORY_CACHE_TTL) {
    return memoryCache
  }

  const fallback: StorageSchema = {
    users: mockUsers.map(u => ({ ...u, status: u.status || 'approved' })),
    deletedUserIds: []
  }

  const data = await readJsonSafe<StorageSchema | null>(FILE_PATH, null)
  if (data && Array.isArray(data.users) && data.users.length > 0) {
    memoryCache = {
      users: data.users,
      deletedUserIds: Array.isArray(data.deletedUserIds) ? data.deletedUserIds : []
    }
    lastCacheTimestamp = Date.now()
    return memoryCache
  }

  if (memoryCache) {
    return memoryCache
  }

  await writeJsonAtomic(FILE_PATH, fallback)
  memoryCache = fallback
  lastCacheTimestamp = Date.now()
  return memoryCache
}

async function saveStorage(data: StorageSchema): Promise<void> {
  memoryCache = data
  lastCacheTimestamp = Date.now()
  try {
    if (process.env.VERCEL) {
      return
    }
    await writeJsonAtomic(FILE_PATH, data)
  } catch (err) {
    console.warn('[api/users] Error saving storage:', err)
  }
}

export async function GET(req: NextRequest) {
  try {
    const storage = await ensureDataFile()
    const supabase = getSafeSupabaseClient()
    const shouldSyncSupabase = supabase && (Date.now() - lastSupabaseSync > SUPABASE_SYNC_INTERVAL)

    if (shouldSyncSupabase) {
      try {
        lastSupabaseSync = Date.now()
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('management_order', { ascending: true })

        if (!error && data && data.length > 0) {

          const validSupabaseUsers = data.filter((u: any) => !storage.deletedUserIds.includes(u.user_id))

          const supabaseIds = new Set(validSupabaseUsers.map((u: any) => u.user_id))
          const localOnlyUsers = storage.users.filter(u => !storage.deletedUserIds.includes(u.user_id) && !supabaseIds.has(u.user_id))
          const mergedUsers = [...validSupabaseUsers, ...localOnlyUsers]

          let modified = false
          for (const sbUser of validSupabaseUsers) {
            const idx = storage.users.findIndex(u => u.user_id === sbUser.user_id)
            if (idx === -1) {
              storage.users.push(sbUser)
              modified = true
            } else {
              if (
                storage.users[idx].status !== sbUser.status ||
                storage.users[idx].role !== sbUser.role ||
                storage.users[idx].password !== sbUser.password ||
                storage.users[idx].updated_at !== sbUser.updated_at
              ) {
                storage.users[idx] = { ...storage.users[idx], ...sbUser }
                modified = true
              }
            }
          }
          if (modified) {
            await saveStorage(storage)
          }

          return NextResponse.json({
            success: true,
            users: mergedUsers,
            source: 'supabase'
          }, { headers: NO_CACHE_HEADERS })
        }
      } catch (dbErr) {
        console.warn('[api/users] Supabase query fallback to local:', dbErr)
      }
    }

    const activeUsers = storage.users.filter(u => !storage.deletedUserIds.includes(u.user_id))

    return NextResponse.json({
      success: true,
      users: activeUsers,
      source: 'local'
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch users' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const storage = await ensureDataFile()

    const email = (body.email || '').trim().toLowerCase()
    const username = (body.username || email.split('@')[0] || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุอีเมล' }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const userRole: UserRole = body.role || 'teacher'
    const computedFirstName = body.first_name || (body.name ? body.name.split(' ')[0] : 'อาจารย์')
    const computedLastName = body.last_name || (body.name ? body.name.split(' ').slice(1).join(' ') || 'ประจำภาควิชา' : 'ประจำภาควิชา')
    const computedName = body.name || `${computedFirstName} ${computedLastName}`
    const userPassword = body.password || 'password123'
    if (body.password && (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 15)) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านต้องมีความยาว 8-15 ตัวอักษร' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    const userAvatar = body.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'

    const existingIndex = storage.users.findIndex(
      u => !storage.deletedUserIds.includes(u.user_id) &&
           (u.email.toLowerCase() === email || (u.username && u.username.toLowerCase() === username))
    )

    if (existingIndex !== -1) {
      const existing = storage.users[existingIndex]
      if (existing.status === 'pending') {

        const updatedPending: UserProfile = {
          ...existing,
          name: computedName,
          first_name: computedFirstName,
          last_name: computedLastName,
          role: userRole,
          password: userPassword,
          avatar_url: userAvatar,
          position: body.position || existing.position || 'อาจารย์ประจำภาควิชา',
          department: body.department || existing.department || 'ภาควิชาวิทยาการคอมพิวเตอร์',
          management_order: getManagementOrder(userRole),
          updated_at: new Date().toISOString()
        }
        storage.users[existingIndex] = updatedPending
        await saveStorage(storage)
        return NextResponse.json({ success: true, user: updatedPending, isPendingUpdated: true }, { headers: NO_CACHE_HEADERS })
      }
      return NextResponse.json(
        { success: false, error: 'อีเมลหรือชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const newId = body.user_id || crypto.randomUUID()
    const userStatus = body.status || 'pending'

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

    storage.users.push(newUser)

    storage.deletedUserIds = storage.deletedUserIds.filter(id => id !== newId)
    await saveStorage(storage)

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
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('[api/users] Error creating user:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create user' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const storage = await ensureDataFile()
    let userIndex = storage.users.findIndex(u => u.user_id === userId)
    let user = userIndex !== -1 ? { ...storage.users[userIndex] } : null

    const supabase = getSafeSupabaseClient()

    if (!user && supabase) {
      try {
        const { data: sbUser, error: sbErr } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (!sbErr && sbUser) {
          user = sbUser as UserProfile
          storage.users.push(user)
          userIndex = storage.users.length - 1
        }
      } catch (e) {
        console.warn('[api/users] Failed to fetch user from Supabase in PUT:', e)
      }
    }

    if (!user && body.user) {
      const fallbackRole: UserRole = body.assignedRole || body.user.role || 'teacher'
      const fallbackUser: UserProfile = {
        ...body.user,
        user_id: userId,
        status: action === 'approve' ? 'approved' : (body.user.status || 'approved'),
        role: fallbackRole,
        management_order: getManagementOrder(fallbackRole),
        updated_at: new Date().toISOString()
      }
      user = fallbackUser
      storage.users.push(user)
      userIndex = storage.users.length - 1
      storage.deletedUserIds = storage.deletedUserIds.filter(id => id !== userId)
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    switch (action) {
      case 'approve': {
        user.status = 'approved'
        if (body.assignedRole) {
          user.role = body.assignedRole
          user.management_order = getManagementOrder(body.assignedRole)
        }
        user.updated_at = now
        storage.deletedUserIds = storage.deletedUserIds.filter(id => id !== userId)
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
        if (!body.password || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 15) {
          return NextResponse.json({ success: false, error: 'รหัสผ่านใหม่ต้องมีความยาว 8-15 ตัวอักษร' }, { status: 400 })
        }
        user.password = body.password
        user.updated_at = now
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

    if (userIndex >= 0 && userIndex < storage.users.length) {
      storage.users[userIndex] = user
    } else {
      storage.users.push(user)
    }
    await saveStorage(storage)

    if (supabase) {
      try {
        const updatePayload: Record<string, any> = {
          status: user.status,
          role: user.role,
          management_order: user.management_order,
          updated_at: user.updated_at
        }
        if (user.password) updatePayload.password = user.password
        if (user.name) updatePayload.name = user.name
        if (user.first_name) updatePayload.first_name = user.first_name
        if (user.last_name) updatePayload.last_name = user.last_name
        if (user.department) updatePayload.department = user.department
        if (user.position) updatePayload.position = user.position
        if (user.avatar_url) updatePayload.avatar_url = user.avatar_url

        const { error: sbError } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('user_id', userId)

        if (sbError) {
          console.error('[api/users] Supabase update error:', sbError)
        }
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

    storage.users = storage.users.filter(u => u.user_id !== userId)
    await saveStorage(storage)

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
