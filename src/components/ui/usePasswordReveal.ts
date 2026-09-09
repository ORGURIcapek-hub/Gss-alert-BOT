'use client'

import { useState } from 'react'

// =============================================================================
// usePasswordReveal — shared hook for Admin password reveal / copy UI
// Used by: AdminPendingApprovals, AdminUserManagement
// =============================================================================

export interface UsePasswordRevealReturn {
  revealedPasswords: Record<string, boolean>
  showAllPasswords: boolean
  copiedId: string | null
  toggleRevealPassword: (userId: string) => void
  handleCopyPassword: (userId: string, pass: string) => void
  setShowAllPasswords: (show: boolean) => void
}

export function usePasswordReveal(): UsePasswordRevealReturn {
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})
  const [showAllPasswords, setShowAllPasswords] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggleRevealPassword = (userId: string) => {
    setRevealedPasswords(prev => ({ ...prev, [userId]: !prev[userId] }))
  }

  const handleCopyPassword = (userId: string, pass: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pass)
    }
    setCopiedId(userId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return {
    revealedPasswords,
    showAllPasswords,
    copiedId,
    toggleRevealPassword,
    handleCopyPassword,
    setShowAllPasswords
  }
}
