'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { UserProfile, UserRole } from '@/types/database.types'
import { mockUsers } from '@/lib/mock-data'
import { fetchUsers } from '@/lib/services/okr-service'

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
  refreshUsers: () => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  isChangePasswordOpen: boolean
  setIsChangePasswordOpen: (open: boolean) => void
  openChangePasswordModal: () => void
  closeChangePasswordModal: () => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>(mockUsers)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true)

  const refreshUsers = async () => {
    try {
      const users = await fetchUsers()
      setAllUsers(users)
      if (currentUser) {
        const updated = users.find(u => u.user_id === currentUser.user_id)
        if (updated) {
          setCurrentUser(updated)
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(updated))
          }
        }
      }
    } catch (e) {
      console.error('Failed to refresh users', e)
    }
  }

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
    const foundUser = allUsers.find(u =>
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

    const expectedPassword = foundUser.password || 'password123'
    if (password !== undefined && password !== expectedPassword) {
      return { success: false, error: 'รหัสผ่านไม่ถูกต้อง (Incorrect password)' }
    }

    setCurrentUser(foundUser)
    setIsAuthenticated(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sdu_okr_user_id', foundUser.user_id)
      sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(foundUser))
    }
    return { success: true }
  }

  const register = async (userData: RegisterData): Promise<LoginResult> => {
    try {
      const cleanEmail = userData.email.trim().toLowerCase()
      const cleanUsername = userData.username.trim().toLowerCase()
      
      const existing = allUsers.find(u =>
        u.email.trim().toLowerCase() === cleanEmail ||
        (u.username && u.username.trim().toLowerCase() === cleanUsername)
      )

      if (existing) {
        return { success: false, error: 'อีเมลหรือชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว' }
      }

      if (userData.password) {
        const p = userData.password
        const hasLength = p.length >= 8 && p.length <= 15
        const hasLetter = /[a-zA-Z]/.test(p)
        const hasNumber = /[0-9]/.test(p)
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p)

        if (!hasLength || !hasLetter || !hasNumber || !hasSpecial) {
          return {
            success: false,
            error: 'รหัสผ่านต้องมีความยาว 8-15 ตัวอักษร และประกอบด้วยตัวอักษรภาษาอังกฤษ, ตัวเลข และอักขระพิเศษ'
          }
        }
      }

      const { registerUserRecord } = await import('@/lib/services/okr-service')
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

      await refreshUsers()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน' }
    }
  }

  const approveUser = async (userId: string, assignedRole?: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      const { approveUserRecord } = await import('@/lib/services/okr-service')
      await approveUserRecord(userId, assignedRole)
      await refreshUsers()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการอนุมัติผู้ใช้งาน' }
    }
  }

  const rejectUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { rejectUserRecord } = await import('@/lib/services/okr-service')
      await rejectUserRecord(userId)
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
      const { deleteUserRecord } = await import('@/lib/services/okr-service')
      await deleteUserRecord(userId)

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

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false)
  const openChangePasswordModal = () => setIsChangePasswordOpen(true)
  const closeChangePasswordModal = () => setIsChangePasswordOpen(false)

  const updatePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน' }
    }

    const expectedPassword = currentUser.password || 'password123'
    if (currentPassword !== expectedPassword) {
      return { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง (Incorrect current password)' }
    }

    const hasLength = newPassword.length >= 8 && newPassword.length <= 15
    const hasLetter = /[a-zA-Z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)

    if (!hasLength || !hasLetter || !hasNumber || !hasSpecial) {
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
      const { updateUserPasswordRecord } = await import('@/lib/services/okr-service')
      await updateUserPasswordRecord(currentUser.user_id, newPassword)

      // Update current user state with new password
      const updatedUser: UserProfile = { ...currentUser, password: newPassword }
      setCurrentUser(updatedUser)
      setAllUsers(prev => prev.map(u => (u.user_id === currentUser.user_id ? updatedUser : u)))

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sdu_okr_cached_user', JSON.stringify(updatedUser))
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' }
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
        isChangePasswordOpen,
        setIsChangePasswordOpen,
        openChangePasswordModal,
        closeChangePasswordModal
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
