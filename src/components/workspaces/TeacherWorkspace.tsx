'use client'

import React from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { GraduationCap, FileCheck2, Clock, Upload, ArrowRight, Sparkles, CheckCircle2, Plus } from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { getUserFullName, formatDepartmentShort, removeTitlesAndRoles } from '@/lib/user-constants'

interface TeacherWorkspaceProps {
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateModal?: () => void
}

export function TeacherWorkspace({
  projects,
  onSelectProject,
  onOpenCreateModal
}: TeacherWorkspaceProps) {
  const { currentUser } = useRole()

  const myAssignedProjects = projects.filter(p =>
    p.head_of_project === currentUser?.user_id ||
    p.assignees?.some(a => a.user_id === currentUser?.user_id)
  )

  const myCompleted = myAssignedProjects.filter(p => p.progress_percentage === 100).length
  const myTotalEvidences = myAssignedProjects.reduce((acc, p) => acc + (p.evidences?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            โครงการ OKR ที่คุณได้รับมอบหมาย
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>ป้อนโครงการ OKR ใหม่</span>
            </button>
          )}

          <div className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-semibold">งานที่ได้รับมอบหมาย</span>
            <span className="text-sm font-black text-slate-900">{myAssignedProjects.length} โครงการ</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-600 block font-semibold">แนบหลักฐานแล้ว</span>
            <span className="text-sm font-black text-emerald-700">{myTotalEvidences} รายการ</span>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span>รายการโครงการที่คุณร่วมรับผิดชอบ ({myAssignedProjects.length})</span>
        </h3>

        {myAssignedProjects.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm sm:text-base font-medium">คุณยังไม่มีโครงการที่ได้รับมอบหมายในขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {myAssignedProjects.map((p) => {
              const rawHeadName = getUserFullName(p.head) || 'หัวหน้าโครงการ'
              const headName = removeTitlesAndRoles(rawHeadName) || 'หัวหน้าโครงการ'
              const isCompleted = p.progress_percentage === 100
              return (
                <div
                  key={p.project_id}
                  onClick={() => onSelectProject(p)}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {formatDepartmentShort(p.department)}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-600">
                        หัวหน้า: <b className="text-slate-900">{headName}</b>
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                      {p.project_name}
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-700 line-clamp-2 leading-relaxed font-medium">
                      {p.main_objective || p.description || 'ไม่มีข้อมูลเป้าหมายระบุ'}
                    </p>
                  </div>

                  <div className="pt-3.5 border-t border-slate-100 space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between text-xs sm:text-sm font-bold mb-1.5">
                        <span className="text-slate-600">ความก้าวหน้าโครงการ</span>
                        <span className="text-emerald-700">{p.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#003B71]'}`}
                          style={{ width: `${p.progress_percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs sm:text-sm text-slate-600 font-medium">
                        หลักฐาน: <b className="text-slate-900">{p.evidences?.length || 0} ไฟล์</b>
                      </span>
                      <button
                        type="button"
                        className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all border border-emerald-200 cursor-pointer active:scale-95"
                      >
                        <span>อัปเดตงาน & จัดการไฟล์</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
