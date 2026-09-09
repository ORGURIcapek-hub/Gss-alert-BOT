'use client'

import React from 'react'
import { Check, X } from 'lucide-react'
import { validatePassword, getPasswordStrengthMeta } from '@/lib/password-utils'

interface PasswordChecklistProps {
  password: string
  showStrengthBar?: boolean
}

export function PasswordChecklist({
  password,
  showStrengthBar = true
}: PasswordChecklistProps) {
  const { hasLength, hasLetter, hasNumber, hasSpecial } = validatePassword(password)
  const strengthMeta = getPasswordStrengthMeta(password)

  return (
    <div className="space-y-2 pt-1">
      {/* Strength Progress Bar */}
      {showStrengthBar && password && (
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${strengthMeta.barColor} ${strengthMeta.widthClass} transition-all duration-300 rounded-full`}
            />
          </div>
        </div>
      )}

      {/* 4-point Requirements Checklist */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
        <div className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
              hasLength ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {hasLength ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
          </span>
          <span>ยาว 8-15 ตัว ({password.length}/15)</span>
        </div>

        <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
              hasLetter ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {hasLetter ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
          </span>
          <span>มีตัวอักษร (A-Z, a-z)</span>
        </div>

        <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
              hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {hasNumber ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
          </span>
          <span>มีตัวเลข (0-9)</span>
        </div>

        <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
              hasSpecial ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {hasSpecial ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3" />}
          </span>
          <span>มีอักขระพิเศษ (!@#$%)</span>
        </div>
      </div>
    </div>
  )
}
