'use client'

import React from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { GraduationCap, FileCheck2, Clock, Upload, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import { useRole } from '@/components/RoleContext'

interface TeacherWorkspaceProps {
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
}

export function TeacherWorkspace({
  projects,
  onSelectProject
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
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#00264D] via-[#003B71] to-[#005B94] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 flex-shrink-0 shadow-inner">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#00A8B5] text-white">
                Team Member Workspace
              </span>
              <span className="text-xs text-sky-200 font-semibold">{currentUser?.department}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight">
              โครงการ OKR ที่คุณได้รับมอบหมาย
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl leading-relaxed">
              รายงานความก้าวหน้าการดำเนินงาน, แจ้งข้อจำกัด/อุปสรรค, อัปโหลดหรือลบหลักฐานผลสัมฤทธิ์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-center">
            <span className="text-[10px] text-sky-200 block font-semibold">งานที่ได้รับมอบหมาย</span>
            <span className="text-base font-black text-white">{myAssignedProjects.length} โครงการ</span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-center">
            <span className="text-[10px] text-emerald-200 block font-semibold">แนบหลักฐานแล้ว</span>
            <span className="text-base font-black text-emerald-300">{myTotalEvidences} รายการ</span>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          รายการโครงการที่คุณร่วมรับผิดชอบ ({myAssignedProjects.length})
        </h3>

        {myAssignedProjects.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-medium">คุณยังไม่มีโครงการที่ได้รับมอบหมายในขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myAssignedProjects.map((p) => {
              const headName = p.head ? `${p.head.first_name} ${p.head.last_name}` : 'อาจารย์หัวหน้าโครงการ'
              const isCompleted = p.progress_percentage === 100
              return (
                <div
                  key={p.project_id}
                  onClick={() => onSelectProject(p)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.department.replace('ภาควิชา', '')}
                      </span>
                      <span className="text-xs text-slate-500">
                        หัวหน้า: <b className="text-slate-800">{headName}</b>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                      {p.project_name}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {p.main_objective || p.description || 'ไม่มีข้อมูลเป้าหมายระบุ'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-500">ความก้าวหน้าโครงการ</span>
                        <span className="text-emerald-700">{p.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#003B71]'}`}
                          style={{ width: `${p.progress_percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500 font-medium">
                        หลักฐาน: <b className="text-slate-900">{p.evidences?.length || 0} ไฟล์</b>
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-all border border-emerald-200"
                      >
                        <span>อัปเดตงาน & จัดการไฟล์</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
