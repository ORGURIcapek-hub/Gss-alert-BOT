'use client'

import React, { useState } from 'react'
import { OKR, ProjectWithHeadAndAssignees, UserProfile } from '@/types/database.types'
import {
  Layers,
  Plus,
  Users,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  X,
  Sparkles,
  UserCheck
} from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { assignProjectRole } from '@/lib/services/okr-service'

interface HeadOKRWorkspaceProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateModal: () => void
}

export function HeadOKRWorkspace({
  okrs,
  projects,
  onSelectProject,
  onOpenCreateModal
}: HeadOKRWorkspaceProps) {
  const { currentUser, allUsers, refreshUsers } = useRole()

  // Assign Team Member modal state
  const [isAssignMemberOpen, setIsAssignMemberOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)

  const myDeptProjects = projects.filter(
    p => p.department === currentUser?.department || p.head_of_project === currentUser?.user_id
  )

  const myCompleted = myDeptProjects.filter(p => p.progress_percentage === 100).length
  const myInProgress = myDeptProjects.filter(p => p.progress_percentage < 100 && (!p.bottleneck || p.bottleneck.length === 0)).length
  const myDelayed = myDeptProjects.filter(p => p.bottleneck && p.bottleneck.length > 0).length

  // Filter teachers (role: teacher or same department)
  const availableTeachers = allUsers.filter(u => u.role === 'teacher' || u.department === currentUser?.department)

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !selectedUserId || !currentUser) return
    setIsAssigning(true)

    await assignProjectRole({
      project_id: selectedProjectId,
      user_id: selectedUserId,
      role_type: 'Member',
      assigned_by: currentUser.user_id
    })

    await refreshUsers()
    setIsAssigning(false)
    setAssignSuccess(true)
    setTimeout(() => {
      setAssignSuccess(false)
      setIsAssignMemberOpen(false)
    }, 1800)
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-200 flex-shrink-0 shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#00A8B5] text-white">
                Head of OKR Workspace
              </span>
              <span className="text-xs text-sky-200 font-semibold">{currentUser?.department}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
              พื้นที่บริหารและขับเคลื่อนโครงการ OKR
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              ป้อนโครงการใหม่, มอบหมายงานให้อาจารย์ลูกทีม (Project Assignments), สร้าง Dashboard รายงานผู้บริหาร, และติดตามผลการปฏิบัติงาน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto flex-shrink-0">
          <button
            onClick={() => {
              if (myDeptProjects.length > 0) {
                setSelectedProjectId(myDeptProjects[0].project_id)
              }
              setIsAssignMemberOpen(true)
            }}
            className="px-4 py-2.5 rounded-2xl bg-[#00A8B5] hover:bg-[#008B97] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>มอบหมายอาจารย์ลูกทีม</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 rounded-2xl bg-white text-[#003B71] hover:bg-slate-100 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#003B71]" />
            <span>ป้อนโครงการ OKR ใหม่</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#003B71]/10 flex items-center justify-center text-[#003B71] flex-shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">โครงการในความดูแล</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{myDeptProjects.length} โครงการ</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">กำลังดำเนินการ / สำเร็จ</span>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {myInProgress} / {myCompleted}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ติดปัญหาหรือล่าช้า</span>
            <div className="text-2xl font-black text-rose-600 mt-0.5">{myDelayed} โครงการ</div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              โครงการในภาควิชาและโครงการที่คุณเป็นหัวหน้า ({myDeptProjects.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">คลิกที่โครงการเพื่อดูรายละเอียด, แก้ไขความก้าวหน้า, หรือจัดการไฟล์แนบ</p>
          </div>
        </div>

        <div className="space-y-3">
          {myDeptProjects.map((p) => {
            const assigneesCount = p.assignees?.length || 0
            return (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#003B71] hover:bg-sky-50/30 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
                      {p.project_type}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      งบ: <b className="text-slate-900">{(Number(p.budget) / 1000).toLocaleString()}k ฿</b>
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{p.project_name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Users className="w-3.5 h-3.5 text-[#003B71]" />
                    <span>อาจารย์ลูกทีมผู้ร่วมรับผิดชอบ: <b className="text-slate-800">{assigneesCount} ท่าน</b></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#003B71]">{p.progress_percentage}%</span>
                    <div className="w-28 bg-slate-200 rounded-full h-2 mt-1 overflow-hidden">
                      <div
                        className="bg-[#003B71] h-2 rounded-full"
                        style={{ width: `${p.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#003B71] hover:bg-slate-50 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL: ASSIGN TEAM MEMBER */}
      {isAssignMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 relative space-y-5">
            <button
              onClick={() => setIsAssignMemberOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#003B71]/10 text-[#003B71] flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  มอบหมายอาจารย์ลูกทีม (Assign Team Member)
                </h3>
                <p className="text-xs text-slate-500">
                  บันทึกลงตาราง Project_Assignments (role_type: 'Member')
                </p>
              </div>
            </div>

            {assignSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>มอบหมายอาจารย์ลูกทีมในโครงการเรียบร้อยแล้ว!</span>
              </div>
            )}

            <form onSubmit={handleAssignMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#003B71]" />
                  เลือกโครงการในความดูแลของคุณ *
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  {myDeptProjects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      [{p.department.replace('ภาควิชา', '')}] {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  เลือกอาจารย์ผู้ร่วมรับผิดชอบ (Member) *
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  <option value="">-- เลือกอาจารย์ผู้รับผิดชอบ --</option>
                  {availableTeachers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      [{u.role}] {u.first_name} {u.last_name} ({u.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600">
                <span className="font-bold text-slate-800 block">สิทธิ์ของอาจารย์ลูกทีม (Validation Rule):</span>
                <p>• จะสามารถเข้าถึงฟอร์มแนบไฟล์หลักฐาน (Upload Evidence) ได้เฉพาะโครงการที่มีรายชื่อมอบหมายเท่านั้น</p>
                <p>• เมื่ออาจารย์แนบไฟล์ ระบบจะส่งข้อมูลตรงมายังเมนู "หลักฐานจากลูกทีม" ของหัวหน้า OKR</p>
              </div>

              <button
                type="submit"
                disabled={isAssigning || !selectedUserId || !selectedProjectId}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#00A8B5] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAssigning ? 'กำลังบันทึก...' : 'บันทึกการมอบหมายอาจารย์ลูกทีม'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
