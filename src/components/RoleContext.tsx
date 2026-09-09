'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { UserProfile, UserRole } from '@/types/database.types'
import { mockUsers } from '@/lib/mock-data'
import {
  fetchUsers,
  registerUserRecord,
  approveUserRecord,
  rejectUserRecord,
  updateUserRoleRecord,
  updateUserPasswordRecord,
  updateUserProfileRecord,
  deleteUserRecord
} from '@/lib/services/okr-service'
import { validatePassword, validateEmail } from '@/lib/password-utils'
import { splitFullName } from '@/lib/user-constants'

interface LoginResult {
  success: boolean
  error?: string
}

interface RegisterData {
  username: string
  password?: string
  name?: string
  first_name?: string
  last_name?: string
  email: string
  role?: UserRole
  department?: string
  position?: string
  avatar_url?: string
}

interface UpdateProfileData {
  name?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  department?: string
  position?: string
}

interface RoleContextType {
  currentUser: UserProfile | null
  allUsers: UserProfile[]
  pendingUsers: UserProfile[]
  pendingCount: number
  currentRole: UserRole | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (identifier: string, password?: string) => Promise<LoginResult>
  register: (userData: RegisterData) => Promise<LoginResult>
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>
  approveUser: (userId: string, assignedRole?: UserRole) => Promise<{ success: boolean; error?: string }>
  rejectUser: (userId: string) => Promise<{ success: boolean; error?: string }>
  switchUser: (userId: string) => void
  logout: () => void
  refreshUsers: (force?: boolean) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (updates: UpdateProfileData) => Promise<{ success: boolean; error?: string }>
  isChangePasswordOpen: boolean
  setIsChangePasswordOpen: (open: boolean) => void
  openChangePasswordModal: () => void
  closeChangePasswordModal: () => void
  isProfileModalOpen: boolean
  setIsProfileModalOpen: (open: boolean) => void
  openProfileModal: () => void
  closeProfileModal: () => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>(mockUsers)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const openChangePasswordModal = () => setIsChangePasswordOpen(true)
  const closeChangePasswordModal = () => setIsChangePasswordOpen(false)
  const openProfileModal = () => setIsProfileModalOpen(true)
  const closeProfileModal = () => setIsProfileModalOpen(false)

  const currentUserRef = useRef<UserProfile | null>(currentUser)
  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  const lastFetchTimeRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)

  const refreshUsers = async (force: boolean = false) => {
    const now = Date.now()
    if (!force && now - lastFetchTimeRef.current < 3000) {
      return
    }
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const users = await fetchUsers()
      lastFetchTimeRef.current = Date.now()
      setAllUsers(users)
      const current = currentUserRef.current
      if (current) {
        const updated = users.find(u => u.user_id === current.user_id)
        if (updated) {
          const isIdentical =
            current.user_id === updated.user_id &&
            current.name === updated.name &&
            current.first_name === updated.first_name &&
            current.last_name === updated.last_name &&
            current.role === updated.role &&
            current.department === updated.department &&
            current.position === updated.position &&
            current.avatar_url === updated.avatar_url &&
            current.status === updated.status &&
            current.email === updated.email &&
            current.password === updated.password

          if (!isIdentical) {
            setCurrentUser(updated)
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(updated))
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to refresh users', e)
    } finally {
      isFetchingRef.current = false
    }
  }

  // Cross-tab and window sync (Event-driven without spammy intervals)
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('sdu_okr_sync_channel')
        channel.onmessage = (event) => {
          if (event.data?.type === 'USERS_UPDATED') {
            refreshUsers(true)
          }
        }
      }
    } catch {}

    const handleSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshUsers(false)
      }
    }

    window.addEventListener('focus', handleSync)
    document.addEventListener('visibilitychange', handleSync)

    return () => {
      window.removeEventListener('focus', handleSync)
      document.removeEventListener('visibilitychange', handleSync)
      if (channel) {
        channel.close()
      }
    }
  }, [])

  // Polling for Admin: Ensures new registrations from other machines show up in real-time
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      refreshUsers(false)
    }, 10000)

    return () => clearInterval(timer)
  }, [currentUser?.role])

  useEffect(() => {
    let isMounted = true
    const initAuth = async () => {
      try {
        // Clean legacy permanent localStorage sessions
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sdu_okr_user_id')
          localStorage.removeItem('sdu_okr_cached_user')
          localStorage.removeItem('sdu_okr_active_tab')
        }

        const users = await fetchUsers()
        if (!isMounted) return
        setAllUsers(users)

        // Read active tab session from sessionStorage (preserved on refresh, cleared on browser close)
        const savedUserId = typeof window !== 'undefined' ? sessionStorage.getItem('sdu_okr_user_id') : null
        if (savedUserId) {
          const rawDeleted = typeof window !== 'undefined' ? localStorage.getItem('sdu_okr_deleted_user_ids') : null
          const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : []

          if (!deletedIds.includes(savedUserId)) {
            const foundInFetched = users.find(u => u.user_id === savedUserId)
            if (foundInFetched) {
              setCurrentUser(foundInFetched)
              setIsAuthenticated(true)
              sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(foundInFetched))
            } else {
              const cached = sessionStorage.getItem('sdu_okr_cached_user')
              if (cached) {
                const parsed = JSON.parse(cached)
                setCurrentUser(parsed)
                setIsAuthenticated(true)
              }
            }
          } else {
            sessionStorage.removeItem('sdu_okr_user_id')
            sessionStorage.removeItem('sdu_okr_cached_user')
            setCurrentUser(null)
            setIsAuthenticated(false)
          }
        }
      } catch (err) {
        console.error('Error during initAuth', err)
      } finally {
        if (isMounted) {
          setIsAuthLoading(false)
        }
      }
    }

    initAuth()
    return () => {
      isMounted = false
    }
  }, [])

  const login = async (identifier: string, password?: string): Promise<LoginResult> => {
    const cleanId = identifier.trim().toLowerCase()

    // Always fetch fresh users before login search to prevent race condition
    // where allUsers state hasn't been hydrated with localStorage registered users yet.
    let searchPool = allUsers
    try {
      const freshUsers = await fetchUsers()
      setAllUsers(freshUsers)
      searchPool = freshUsers
    } catch (e) {
      console.warn('[login] fetchUsers failed, falling back to in-memory allUsers', e)
    }

    const foundUser = searchPool.find(u =>
      u.email.trim().toLowerCase() === cleanId ||
      (u.username && u.username.trim().toLowerCase() === cleanId)
    )

    if (!foundUser) {
      return { success: false, error: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบอีเมลหรือชื่อผู้ใช้งาน' }
    }

    // Check account approval status
    const userStatus = foundUser.status || 'approved'
    if (userStatus === 'pending') {
      return {
        success: false,
        error: 'บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติสิทธิ์การเข้าใช้งาน กรุณารอการอนุมัติก่อนเข้าสู่ระบบ'
      }
    }
    if (userStatus === 'rejected') {
      return {
        success: false,
        error: 'คำขอสมัครสมาชิกของบัญชีนี้ไม่ได้รับการอนุมัติจากผู้ดูแลระบบ กรุณาติดต่อผู้ดูแลระบบ'
      }
    }

    // Password is always required — no fallback default
    if (!password) {
      return { success: false, error: 'กรุณาระบุรหัสผ่าน' }
    }
    const expectedPassword = foundUser.password
    if (!expectedPassword || password !== expectedPassword) {
      return { success: false, error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านของคุณ' }
    }

    setCurrentUser(foundUser)
    setIsAuthenticated(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sdu_okr_user_id', foundUser.user_id)
      sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(foundUser))
    }
    return { success: true }
  }

function notifySyncChannel() {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('sdu_okr_sync_channel')
      channel.postMessage({ type: 'USERS_UPDATED', timestamp: Date.now() })
      channel.close()
    }
  } catch (e) {}
}

  const register = async (userData: RegisterData): Promise<LoginResult> => {
    try {
      const cleanEmail = userData.email.trim().toLowerCase()
      const cleanUsername = userData.username.trim().toLowerCase()

      // Validate email format before doing anything else
      const emailCheck = validateEmail(cleanEmail)
      if (!emailCheck.isValid) {
        return { success: false, error: emailCheck.error || 'รูปแบบอีเมลไม่ถูกต้อง' }
      }

      // Check against fresh users list
      let pool = allUsers
      try {
        const fresh = await fetchUsers()
        setAllUsers(fresh)
        pool = fresh
      } catch (e) {}

      const existing = pool.find(u =>
        u.email.trim().toLowerCase() === cleanEmail ||
        (u.username && u.username.trim().toLowerCase() === cleanUsername)
      )

      if (existing) {
        return { success: false, error: 'อีเมลหรือชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว' }
      }

      if (userData.password) {
        const { isValid } = validatePassword(userData.password)
        if (!isValid) {
          return {
            success: false,
            error: 'รหัสผ่านต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ'
          }
        }
      }

      const createdUser = await registerUserRecord({
        ...userData,
        email: cleanEmail,
        username: cleanUsername,
        status: 'pending'
      })

      // Optimistically add to state so admin badge and list update immediately
      setAllUsers(prev => {
        const withoutDup = prev.filter(u => u.user_id !== createdUser.user_id && u.email.toLowerCase() !== createdUser.email.toLowerCase())
        return [...withoutDup, createdUser]
      })

      notifySyncChannel()
      await refreshUsers()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน' }
    }
  }

  const approveUser = async (userId: string, assignedRole?: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      await approveUserRecord(userId, assignedRole)
      notifySyncChannel()
      await refreshUsers()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการอนุมัติผู้ใช้งาน' }
    }
  }

  const rejectUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await rejectUserRecord(userId)
      notifySyncChannel()
      await refreshUsers()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ' }
    }
  }

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Instantly remove from allUsers state (optimistic)
      setAllUsers(prev => prev.filter(u => u.user_id !== userId))

      // 2. If deleted user is current user, logout
      if (currentUser?.user_id === userId) {
        logout()
      }

      // 3. Call backend / service delete
      await deleteUserRecord(userId)

      notifySyncChannel()
      // 4. Refresh users to ensure consistency
      await refreshUsers()
      return { success: true }
    } catch (err: any) {
      await refreshUsers()
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' }
    }
  }

  const switchUser = (userId: string) => {
    const found = allUsers.find(u => u.user_id === userId)
    if (found) {
      setCurrentUser(found)
      setIsAuthenticated(true)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sdu_okr_user_id', found.user_id)
        sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(found))
      }
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sdu_okr_user_id')
      sessionStorage.removeItem('sdu_okr_cached_user')
      sessionStorage.removeItem('sdu_okr_active_tab')
      localStorage.removeItem('sdu_okr_user_id')
      localStorage.removeItem('sdu_okr_cached_user')
      localStorage.removeItem('sdu_okr_active_tab')
    }
  }

  const updatePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน' }
    }

    // Fetch the latest user record to get the real password (may be updated via passwordMap in localStorage)
    let expectedPassword = currentUser.password
    try {
      const freshUsers = await fetchUsers()
      const freshUser = freshUsers.find(u => u.user_id === currentUser.user_id)
      if (freshUser?.password) expectedPassword = freshUser.password
    } catch (e) {
      // fall back to currentUser.password
    }

    if (!expectedPassword || currentPassword !== expectedPassword) {
      return { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง (Incorrect current password)' }
    }

    const { isValid: isNewPwValid } = validatePassword(newPassword)
    if (!isNewPwValid) {
      return {
        success: false,
        error: 'รหัสผ่านใหม่ต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ'
      }
    }

    if (newPassword === currentPassword) {
      return {
        success: false,
        error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'
      }
    }

    try {
      await updateUserPasswordRecord(currentUser.user_id, newPassword)

      // Update current user state with new password
      const updatedUser: UserProfile = { ...currentUser, password: newPassword }
      setCurrentUser(updatedUser)
      setAllUsers(prev => prev.map(u => (u.user_id === currentUser.user_id ? updatedUser : u)))

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(updatedUser))
      }

      notifySyncChannel()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' }
    }
  }

  const updateProfile = async (updates: UpdateProfileData): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'ไม่พบข้อมูลผู้ใช้งานที่เข้าสู่ระบบ' }
    }

    try {
      const updated = await updateUserProfileRecord(currentUser.user_id, updates)

      const mergedUser: UserProfile = {
        ...currentUser,
        ...(updated || updates),
        ...(updates.first_name ? { first_name: updates.first_name } : {}),
        ...(updates.last_name ? { last_name: updates.last_name } : {}),
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.avatar_url ? { avatar_url: updates.avatar_url } : {}),
        ...(updates.department ? { department: updates.department } : {}),
        ...(updates.position ? { position: updates.position } : {})
      }

      setCurrentUser(mergedUser)
      setAllUsers(prev => prev.map(u => (u.user_id === currentUser.user_id ? mergedUser : u)))

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(mergedUser))
      }

      notifySyncChannel()
      await refreshUsers()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์' }
    }
  }

  const pendingUsers = allUsers.filter(u => u.status === 'pending')
  const pendingCount = pendingUsers.length

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        allUsers,
        pendingUsers,
        pendingCount,
        currentRole: currentUser ? currentUser.role : null,
        isAuthenticated,
        isAuthLoading,
        login,
        register,
        deleteUser,
        approveUser,
        rejectUser,
        switchUser,
        logout,
        refreshUsers,
        updatePassword,
        updateProfile,
        isChangePasswordOpen,
        setIsChangePasswordOpen,
        openChangePasswordModal,
        closeChangePasswordModal,
        isProfileModalOpen,
        setIsProfileModalOpen,
        openProfileModal,
        closeProfileModal
      }}
    >
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
