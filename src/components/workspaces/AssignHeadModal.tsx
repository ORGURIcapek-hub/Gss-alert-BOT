'use client'

import React, { useState, useEffect } from 'react'
import { ProjectWithHeadAndAssignees, UserProfile } from '@/types/database.types'
import { useRole } from '@/components/RoleContext'
import { assignProjectRole } from '@/lib/services'
import { getUserFullName, formatDepartmentShort } from '@/lib/user-constants'
import { X, UserPlus, CheckCircle2, Target, UserCheck } from 'lucide-react'

interface AssignHeadModalProps {
  isOpen: boolean
  onClose: () => void
  projects: ProjectWithHeadAndAssignees[]
  allUsers: UserProfile[]
  onSuccess: () => Promise<void> | void
}

export function AssignHeadModal({
  isOpen,
  onClose,
  projects,
  allUsers,
  onSuccess
}: AssignHeadModalProps) {
  const { currentUser } = useRole()
  const [assignProjectId, setAssignProjectId] = useState<string>(projects[0]?.project_id || '')
  const [assignUserId, setAssignUserId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)

  useEffect(() => {
    if (projects.length > 0 && !assignProjectId) {
      setAssignProjectId(projects[0].project_id)
    }
  }, [projects, assignProjectId])

  if (!isOpen) return null

  const handleAssignHead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignProjectId || !assignUserId || !currentUser) return
    setIsAssigning(true)

    try {
      await assignProjectRole({
        project_id: assignProjectId,
        user_id: assignUserId,
        role_type: 'Head',
        assigned_by: currentUser.user_id
      })

      await onSuccess()
      setIsAssigning(false)
      setAssignSuccess(true)
      setTimeout(() => {
        setAssignSuccess(false)
        onClose()
      }, 1500)
    } catch {
      setIsAssigning(false)
    }
  }

  const eligibleUsers = allUsers.filter(u => u.role !== 'admin' && u.role !== 'executive')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#00A8B5]/10 text-[#00A8B5] flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              กำหนดหัวหน้าโครงการ OKR (Assign OKR Head)
            </h3>
          </div>
        </div>

        {assignSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>กำหนดสิทธิ์หัวหน้าโครงการ OKR เรียบร้อยแล้ว!</span>
          </div>
        )}

        <form onSubmit={handleAssignHead} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#003B71]" />
              เลือกโครงการ OKR *
            </label>
            <select
              value={assignProjectId}
              onChange={(e) => setAssignProjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  [{formatDepartmentShort(p.department)}] {p.project_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#00A8B5]" />
              เลือกอาจารย์ / บุคลากรที่จะแต่งตั้งเป็น OKR Head *
            </label>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
            >
              <option value="">-- กรุณาเลือกรายชื่อผู้ใช้งาน --</option>
              {eligibleUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {getUserFullName(u)} ({formatDepartmentShort(u.department)})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isAssigning || !assignUserId}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#00A8B5] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isAssigning ? 'กำลังบันทึก...' : 'บันทึกการแต่งตั้ง OKR Head'}
          </button>
        </form>
      </div>
    </div>
  )
}
