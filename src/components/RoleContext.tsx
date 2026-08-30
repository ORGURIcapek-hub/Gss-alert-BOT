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
  login: (identifier: string, password?: string) => Promise<LoginResult>
  register: (userData: RegisterData) => Promise<LoginResult>
  switchUser: (userId: string) => void
  logout: () => void
  refreshUsers: () => Promise<void>
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>(mockUsers)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  const refreshUsers = async () => {
    const users = await fetchUsers()
    setAllUsers(users)
    if (currentUser) {
      const updated = users.find(u => u.user_id === currentUser.user_id)
      if (updated) {
        setCurrentUser(updated)
      }
    }
  }

  useEffect(() => {
    refreshUsers()
    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('sdu_okr_user_id') : null
    if (savedUserId) {
      const user = mockUsers.find(u => u.user_id === savedUserId)
      if (user) {
        setCurrentUser(user)
        setIsAuthenticated(true)
      }
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
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน' }
    }
  }

  const switchUser = (userId: string) => {
    const found = allUsers.find(u => u.user_id === userId)
    if (found) {
      setCurrentUser(found)
      setIsAuthenticated(true)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sdu_okr_user_id', found.user_id)
      }
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sdu_okr_user_id')
    }
  }

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        allUsers,
        currentRole: currentUser ? currentUser.role : null,
        isAuthenticated,
        login,
        register,
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
