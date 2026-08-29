'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { UserProfile, UserRole } from '@/types/database.types'
import { mockUsers } from '@/lib/mock-data'
import { fetchUsers } from '@/lib/services/okr-service'

interface RoleContextType {
  currentUser: UserProfile | null
  allUsers: UserProfile[]
  currentRole: UserRole | null
  isAuthenticated: boolean
  login: (email: string, role?: UserRole) => Promise<boolean>
  quickLogin: (role: UserRole) => void
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
    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('okr_current_user_id') : null
    if (savedUserId) {
      const user = mockUsers.find(u => u.user_id === savedUserId)
      if (user) {
        setCurrentUser(user)
        setIsAuthenticated(true)
      }
    }
  }, [])

  const login = async (email: string, fallbackRole?: UserRole): Promise<boolean> => {
    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (found) {
      setCurrentUser(found)
      setIsAuthenticated(true)
      if (typeof window !== 'undefined') {
        localStorage.setItem('okr_current_user_id', found.user_id)
      }
      return true
    }

    if (fallbackRole) {
      const byRole = allUsers.find(u => u.role === fallbackRole)
      if (byRole) {
        setCurrentUser(byRole)
        setIsAuthenticated(true)
        if (typeof window !== 'undefined') {
          localStorage.setItem('okr_current_user_id', byRole.user_id)
        }
        return true
      }
    }

    return false
  }

  const quickLogin = (role: UserRole) => {
    const user = allUsers.find(u => u.role === role) || mockUsers.find(u => u.role === role)
    if (user) {
      setCurrentUser(user)
      setIsAuthenticated(true)
      if (typeof window !== 'undefined') {
        localStorage.setItem('okr_current_user_id', user.user_id)
      }
    }
  }

  const switchUser = (userId: string) => {
    const found = allUsers.find(u => u.user_id === userId)
    if (found) {
      setCurrentUser(found)
      setIsAuthenticated(true)
      if (typeof window !== 'undefined') {
        localStorage.setItem('okr_current_user_id', found.user_id)
      }
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('okr_current_user_id')
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
        quickLogin,
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
