'use client'

import React, { useState, useEffect } from 'react'
import { ProjectWithHeadAndAssignees, UserProfile, OKR } from '@/types/database.types'
import { useRole } from '@/components/RoleContext'
import { assignProjectRole, updateProjectOKR } from '@/lib/services'
import { getUserFullName, formatDepartmentShort } from '@/lib/user-constants'
import { X, UserPlus, CheckCircle2, Target, UserCheck, Layers } from 'lucide-react'

interface AssignHeadModalProps {
  isOpen: boolean
  onClose: () => void
  projects: ProjectWithHeadAndAssignees[]
  allUsers: UserProfile[]
  okrs?: OKR[]
  onSuccess: () => Promise<void> | void
}

export function AssignHeadModal({
  isOpen,
  onClose,
  projects,
  allUsers,
  okrs = [],
  onSuccess
}: AssignHeadModalProps) {
  const { currentUser } = useRole()
  const [assignProjectId, setAssignProjectId] = useState<string>(projects[0]?.project_id || '')
  const [assignUserId, setAssignUserId] = useState<string>('')
  const [assignOkrId, setAssignOkrId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)

  useEffect(() => {
    if (projects.length > 0 && !assignProjectId) {
      setAssignProjectId(projects[0].project_id)
    }
  }, [projects, assignProjectId])

  useEffect(() => {
    const selectedProj = projects.find(p => p.project_id === assignProjectId)
    if (selectedProj) {
      setAssignOkrId(selectedProj.okr_id || '')
      if (selectedProj.head_of_project) {
        setAssignUserId(selectedProj.head_of_project)
      } else if (selectedProj.head?.user_id) {
        setAssignUserId(selectedProj.head.user_id)
      } else {
        setAssignUserId('')
      }
    }
  }, [assignProjectId, projects])

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

      if (assignOkrId) {
        await updateProjectOKR(assignProjectId, assignOkrId)
      }

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

  const eligibleUsers = allUsers.filter(u => u.role === 'head_okr' && (u.status === 'approved' || !u.status))

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 relative space-y-5"
      >
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
            <span>บันทึกการกำหนดสิทธิ์หัวหน้าโครงการและเป้าหมาย OKR เรียบร้อยแล้ว!</span>
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
              <Layers className="w-4 h-4 text-[#003B71]" />
              เลือกเป้าหมาย OKR คณะที่ต้องการให้โครงการนี้อยู่
            </label>
            <select
              value={assignOkrId}
              onChange={(e) => setAssignOkrId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
            >
              <option value="">-- ไม่ระบุ / ไม่ผูกเป้าหมาย OKR คณะ --</option>
              {okrs.map((o) => (
                <option key={o.okr_id} value={o.okr_id}>
                  [ปี {o.year}] {o.okr_title} ({o.okr_type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#00A8B5]" />
              เลือกอาจารย์หัวหน้าโครงการ OKR (Head OKR เท่านั้น) *
            </label>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
            >
              <option value="">
                {eligibleUsers.length === 0
                  ? '-- ไม่มีรายชื่ออาจารย์ที่มีบทบาท OKR Head --'
                  : '-- กรุณาเลือกอาจารย์หัวหน้า OKR --'}
              </option>
              {eligibleUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {getUserFullName(u)} ({formatDepartmentShort(u.department)})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isAssigning || !assignUserId || eligibleUsers.length === 0}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#00A8B5] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isAssigning ? 'กำลังบันทึก...' : 'บันทึกการกำหนดหัวหน้าและเป้าหมาย OKR'}
          </button>
        </form>
      </div>
    </div>
  )
}
