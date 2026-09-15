'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { OKR, ProjectWithHeadAndAssignees, UserProfile, ProjectAssignment } from '@/types/database.types'
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
  UserCheck,
  Search,
  Check
} from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { assignProjectRoles, fetchProjectAssignments } from '@/lib/services/okr-service'
import { formatDepartmentShort, getUserFullName, removeTitlesAndRoles } from '@/lib/user-constants'

interface HeadOKRWorkspaceProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateModal: () => void
  onProjectsRefresh?: () => void
}

export function HeadOKRWorkspace({
  okrs,
  projects,
  onSelectProject,
  onOpenCreateModal,
  onProjectsRefresh
}: HeadOKRWorkspaceProps) {
  const { currentUser, allUsers, refreshUsers, selectedYear, updateUserYearlyRole } = useRole()

  const [isAssignMemberOpen, setIsAssignMemberOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchTeacher, setSearchTeacher] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([])

  const myDeptProjects = projects.filter(
    p =>
      p.head_of_project === currentUser?.user_id ||
      p.head?.user_id === currentUser?.user_id ||
      (p.department && currentUser?.department && p.department === currentUser?.department)
  )

  const myCompleted = myDeptProjects.filter(p => p.progress_percentage === 100).length
  const myInProgress = myDeptProjects.filter(p => p.progress_percentage < 100 && (!p.bottleneck || p.bottleneck.length === 0)).length
  const myDelayed = myDeptProjects.filter(p => p.bottleneck && p.bottleneck.length > 0).length

  useEffect(() => {
    if (selectedProjectId && isAssignMemberOpen) {
      fetchProjectAssignments(selectedProjectId)
        .then((data) => {
          if (Array.isArray(data)) {
            setProjectAssignments(data)
          }
        })
        .catch(() => {})
    } else {
      setProjectAssignments([])
    }
  }, [selectedProjectId, isAssignMemberOpen])

  const currentSelectedProject = projects.find(p => p.project_id === selectedProjectId)
  const existingUserIdsInProject = useMemo(() => {
    const ids = new Set<string>()
    if (currentSelectedProject) {
      if (currentSelectedProject.head_of_project) ids.add(currentSelectedProject.head_of_project)
      if (currentSelectedProject.head?.user_id) ids.add(currentSelectedProject.head.user_id)
      if (Array.isArray(currentSelectedProject.assignees)) {
        for (const a of currentSelectedProject.assignees) {
          if (a?.user_id) ids.add(a.user_id)
          if ((a as any)?.user?.user_id) ids.add((a as any).user.user_id)
        }
      }
    }
    for (const pa of projectAssignments) {
      if (pa?.user_id) ids.add(pa.user_id)
    }
    return ids
  }, [currentSelectedProject, projectAssignments])

  const availableTeachers = useMemo(() => {
    return allUsers.filter(
      u =>
        (u.role === 'teacher' || u.role === 'head_okr') &&
        u.status !== 'pending' &&
        u.status !== 'rejected' &&
        !existingUserIdsInProject.has(u.user_id)
    )
  }, [allUsers, existingUserIdsInProject])

  const filteredAvailableTeachers = useMemo(() => {
    const query = searchTeacher.trim().toLowerCase()
    if (!query) return availableTeachers
    return availableTeachers.filter(u => {
      const fullName = getUserFullName(u).toLowerCase()
      const dept = (u.department || '').toLowerCase()
      return fullName.includes(query) || dept.includes(query)
    })
  }, [availableTeachers, searchTeacher])

  const toggleTeacher = (userId: string) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      }
      return [...prev, userId]
    })
  }

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || selectedUserIds.length === 0 || !currentUser) return
    setIsAssigning(true)

    await assignProjectRoles({
      project_id: selectedProjectId,
      user_ids: selectedUserIds,
      role_type: 'Member',
      assigned_by: currentUser.user_id
    })

    const currentProj = myDeptProjects.find(p => p.project_id === selectedProjectId)
    const projectYear = currentProj?.okr?.year || currentProj?.year || selectedYear || 2567
    for (const uId of selectedUserIds) {
      const u = allUsers.find(user => user.user_id === uId)
      if (u && (!u.yearly_roles || !u.yearly_roles[String(projectYear)])) {
        await updateUserYearlyRole(uId, projectYear, 'teacher')
      }
    }

    await refreshUsers()
    if (onProjectsRefresh) onProjectsRefresh()
    if (selectedProjectId) {
      fetchProjectAssignments(selectedProjectId).then(setProjectAssignments).catch(() => {})
    }
    setSelectedUserIds([])
    setIsAssigning(false)
    setAssignSuccess(true)
    setTimeout(() => {
      setAssignSuccess(false)
      setIsAssignMemberOpen(false)
    }, 1800)
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            พื้นที่บริหารและขับเคลื่อนโครงการ OKR
          </h2>
          <span className="px-2.5 py-1 rounded-xl bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/20 text-xs font-extrabold shadow-xs">
            ปี {selectedYear}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={() => {
              if (myDeptProjects.length > 0) {
                setSelectedProjectId(myDeptProjects[0].project_id)
              }
              setSelectedUserIds([])
              setSearchTeacher('')
              setIsAssignMemberOpen(true)
            }}
            className="px-4 py-2.5 rounded-xl bg-[#00A8B5] hover:bg-[#008B97] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>มอบหมายอาจารย์ลูกทีม</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>ป้อนโครงการ OKR ใหม่</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-[#003B71]/10 flex items-center justify-center text-[#003B71] flex-shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs sm:text-sm text-slate-600 font-bold uppercase tracking-wider">โครงการในความดูแล</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{myDeptProjects.length} โครงการ</div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs sm:text-sm text-slate-600 font-bold uppercase tracking-wider">กำลังดำเนินการ / สำเร็จ</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              {myInProgress} / {myCompleted}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs sm:text-sm text-slate-600 font-bold uppercase tracking-wider">ติดปัญหาหรือล่าช้า</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{myDelayed} โครงการ</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              โครงการในภาควิชาและโครงการที่คุณเป็นหัวหน้า ({myDeptProjects.length})
            </h3>
          </div>
        </div>

        <div className="space-y-3.5">
          {myDeptProjects.map((p) => {
            const assigneesCount = p.assignees?.length || 0
            return (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#003B71] hover:bg-sky-50/30 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
                      {p.project_type}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-600 font-semibold">
                      งบประมาณ: <b className="text-slate-900">{(Number(p.budget) / 1000).toLocaleString()}k ฿</b>
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900">{p.project_name}</h4>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                    <Users className="w-4 h-4 text-[#003B71]" />
                    <span>อาจารย์ลูกทีมผู้ร่วมรับผิดชอบ: <b className="text-slate-900">{assigneesCount} ท่าน</b></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-bold text-[#003B71]">{p.progress_percentage}%</span>
                    <div className="w-32 bg-slate-200 rounded-full h-2.5 mt-1.5 overflow-hidden">
                      <div
                        className="bg-[#003B71] h-2.5 rounded-full"
                        style={{ width: `${p.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#003B71] hover:bg-slate-50 transition-colors shadow-xs"
                    title="เปิดดูโครงการ"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isAssignMemberOpen && (
        <div
          onClick={() => setIsAssignMemberOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 relative space-y-5"
          >
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
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value)
                    setSelectedUserIds([])
                    setSearchTeacher('')
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
                >
                  {myDeptProjects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      [{formatDepartmentShort(p.department)}] {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    เลือกอาจารย์ / บุคลากรลูกทีม *
                  </label>
                  {selectedUserIds.length > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#003B71]/10 text-[#003B71]">
                      เลือกแล้ว {selectedUserIds.length} ท่าน
                    </span>
                  )}
                </div>

                {selectedUserIds.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>รายชื่อที่เลือก:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedUserIds([])}
                        className="text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        ล้างการเลือก
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      {selectedUserIds.map((id) => {
                        const user = allUsers.find(u => u.user_id === id)
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#003B71]/20 text-xs font-semibold text-[#003B71] shadow-xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00A8B5]" />
                            <span>{user ? removeTitlesAndRoles(getUserFullName(user)) : id}</span>
                            <button
                              type="button"
                              onClick={() => toggleTeacher(id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer ml-0.5"
                              title="นำออก"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTeacher}
                      onChange={(e) => setSearchTeacher(e.target.value)}
                      placeholder="ค้นหาชื่ออาจารย์ หรือภาควิชา..."
                      className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003B71]"
                    />
                    {searchTeacher && (
                      <button
                        type="button"
                        onClick={() => setSearchTeacher('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {availableTeachers.length > 0 && selectedUserIds.length < availableTeachers.length && (
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = (filteredAvailableTeachers.length > 0 ? filteredAvailableTeachers : availableTeachers).map(u => u.user_id)
                        setSelectedUserIds(prev => Array.from(new Set([...prev, ...allIds])))
                      }}
                      className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                    >
                      เลือกทั้งหมด
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  {filteredAvailableTeachers.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                      {availableTeachers.length === 0
                        ? 'มอบหมายบุคลากรครบทุกคนแล้วในโครงการนี้'
                        : 'ไม่พบอาจารย์ที่ตรงกับคำค้นหา'}
                    </div>
                  ) : (
                    filteredAvailableTeachers.map((u) => {
                      const isSelected = selectedUserIds.includes(u.user_id)
                      return (
                        <div
                          key={u.user_id}
                          onClick={() => toggleTeacher(u.user_id)}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 select-none cursor-pointer ${
                            isSelected
                              ? 'bg-[#003B71]/5 border-[#003B71] text-slate-900 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-[#00A8B5] hover:bg-teal-50/20 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${
                                isSelected
                                  ? 'bg-[#003B71] border-[#003B71] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">
                                {removeTitlesAndRoles(getUserFullName(u))}
                              </p>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {formatDepartmentShort(u.department)}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#003B71] bg-[#003B71]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                              เลือกแล้ว
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isAssigning || selectedUserIds.length === 0 || !selectedProjectId}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#003B71] to-[#00A8B5] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAssigning
                  ? 'กำลังบันทึก...'
                  : selectedUserIds.length > 0
                  ? `บันทึกการมอบหมายอาจารย์ลูกทีม (${selectedUserIds.length} ท่าน)`
                  : 'บันทึกการมอบหมายอาจารย์ลูกทีม'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
