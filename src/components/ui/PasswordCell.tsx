'use client'

import React from 'react'
import { KeyRound, Eye, EyeOff, Check, Copy } from 'lucide-react'

interface PasswordCellProps {
  userId: string
  password?: string
  isVisible: boolean
  isCopied: boolean
  onToggleReveal: (userId: string) => void
  onCopy: (userId: string, password?: string) => void
}

export function PasswordCell({
  userId,
  password,
  isVisible,
  isCopied,
  onToggleReveal,
  onCopy
}: PasswordCellProps) {
  const displayPassword = password || 'ไม่มีรหัสผ่าน'

  return (
    <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 transition-colors">
      <KeyRound className="w-4 h-4 text-[#003B71] flex-shrink-0" />
      <span
        className={`font-mono text-xs sm:text-sm font-bold select-all ${
          isVisible ? 'text-[#003B71]' : 'text-slate-400'
        }`}
      >
        {isVisible ? displayPassword : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => onToggleReveal(userId)}
        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors ml-0.5 cursor-pointer"
        title={isVisible ? 'ซ่อนรหัสผ่าน' : 'ดูรหัสผ่าน'}
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={() => onCopy(userId, password)}
        className="p-1 text-slate-400 hover:text-[#003B71] rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
        title="คัดลอกรหัสผ่าน"
      >
        {isCopied ? (
          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
