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
  currentRole: UserRole | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (identifier: string, password?: string) => Promise<LoginResult>
  register: (userData: RegisterData) => Promise<LoginResult>
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>
  switchUser: (userId: string) => void
  logout: () => void
  refreshUsers: () => Promise<void>
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('sdu_okr_deleted_user_ids')
        const deletedIds: string[] = raw ? JSON.parse(raw) : []
        return mockUsers.filter(u => !deletedIds.includes(u.user_id))
      } catch {
        return mockUsers
      }
    }
    return mockUsers
  })
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUserId = localStorage.getItem('sdu_okr_user_id')
        const rawDeleted = localStorage.getItem('sdu_okr_deleted_user_ids')
        const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : []
        if (savedUserId && !deletedIds.includes(savedUserId)) {
          const cachedUser = localStorage.getItem('sdu_okr_cached_user')
          if (cachedUser) {
            return JSON.parse(cachedUser)
          }
          const user = mockUsers.find(u => u.user_id === savedUserId)
          if (user) return user
        }
      } catch {}
    }
    return null
  })

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUserId = localStorage.getItem('sdu_okr_user_id')
        const rawDeleted = localStorage.getItem('sdu_okr_deleted_user_ids')
        const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : []
        return Boolean(savedUserId && !deletedIds.includes(savedUserId))
      } catch {}
    }
    return false
  })

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
            localStorage.setItem('sdu_okr_cached_user', JSON.stringify(updated))
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
        const users = await fetchUsers()
        if (!isMounted) return
        setAllUsers(users)

        const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('sdu_okr_user_id') : null
        if (savedUserId) {
          const rawDeleted = typeof window !== 'undefined' ? localStorage.getItem('sdu_okr_deleted_user_ids') : null
          const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : []

          if (!deletedIds.includes(savedUserId)) {
            const foundInFetched = users.find(u => u.user_id === savedUserId)
            if (foundInFetched) {
              setCurrentUser(foundInFetched)
              setIsAuthenticated(true)
              localStorage.setItem('sdu_okr_cached_user', JSON.stringify(foundInFetched))
            } else {
              const cached = localStorage.getItem('sdu_okr_cached_user')
              if (cached) {
                const parsed = JSON.parse(cached)
                setCurrentUser(parsed)
                setIsAuthenticated(true)
              }
            }
          } else {
            localStorage.removeItem('sdu_okr_user_id')
            localStorage.removeItem('sdu_okr_cached_user')
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

    const expectedPassword = foundUser.password || 'password123'
    if (password !== undefined && password !== expectedPassword) {
      return { success: false, error: 'รหัสผ่านไม่ถูกต้อง (Incorrect password)' }
    }

    setCurrentUser(foundUser)
    setIsAuthenticated(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sdu_okr_user_id', foundUser.user_id)
      localStorage.setItem('sdu_okr_cached_user', JSON.stringify(foundUser))
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

      const { registerUserRecord } = await import('@/lib/services/okr-service')
      const newUser = await registerUserRecord({
        ...userData,
        email: cleanEmail,
        username: cleanUsername
      })

      await refreshUsers()
      setCurrentUser(newUser)
      setIsAuthenticated(true)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sdu_okr_user_id', newUser.user_id)
        localStorage.setItem('sdu_okr_cached_user', JSON.stringify(newUser))
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน' }
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
        localStorage.setItem('sdu_okr_user_id', found.user_id)
        localStorage.setItem('sdu_okr_cached_user', JSON.stringify(found))
      }
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sdu_okr_user_id')
      localStorage.removeItem('sdu_okr_cached_user')
      localStorage.removeItem('sdu_okr_active_tab')
    }
  }

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        allUsers,
        currentRole: currentUser ? currentUser.role : null,
        isAuthenticated,
        isAuthLoading,
        login,
        register,
        deleteUser,
        switchUser,
        logout,
        refreshUsers
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
