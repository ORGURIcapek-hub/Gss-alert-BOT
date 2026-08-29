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
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-navy-900/60 to-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shadow-glow-emerald flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Team Member Workspace
              </span>
              <span className="text-xs text-emerald-400 font-semibold">{currentUser?.department}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
              โครงการ OKR ที่คุณได้รับมอบหมาย
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              รายงานความก้าวหน้าการดำเนินงาน, แจ้งข้อจำกัด/อุปสรรค, และอัปโหลดหลักฐานผลสัมฤทธิ์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 block">งานที่ได้รับมอบหมาย</span>
            <span className="text-base font-bold text-white">{myAssignedProjects.length} โครงการ</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] text-emerald-400 block">แนบหลักฐานแล้ว</span>
            <span className="text-base font-bold text-emerald-300">{myTotalEvidences} รายการ</span>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          รายการโครงการที่คุณร่วมรับผิดชอบ
        </h3>

        {myAssignedProjects.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm">คุณยังไม่มีโครงการที่ได้รับมอบหมายในขณะนี้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myAssignedProjects.map((p) => {
              const headName = p.head ? `${p.head.first_name} ${p.head.last_name}` : 'อาจารย์หัวหน้าโครงการ'
              const isCompleted = p.progress_percentage === 100
              return (
                <div
                  key={p.project_id}
                  onClick={() => onSelectProject(p)}
                  className="glass-card p-4 sm:p-5 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                        {p.department.replace('ภาควิชา', '')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        หัวหน้า: <b className="text-slate-200">{headName}</b>
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                      {p.project_name}
                    </h4>

                    <p className="text-[11px] text-slate-300 line-clamp-2">
                      {p.main_objective || p.description || 'ไม่มีข้อมูลเป้าหมายระบุ'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-slate-400">ความก้าวหน้าโครงการ</span>
                        <span className="text-emerald-400 font-bold">{p.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-sky-400'}`}
                          style={{ width: `${p.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        หลักฐาน: <b>{p.evidences?.length || 0} ไฟล์</b>
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <span>อัปเดตงาน & แนบไฟล์</span>
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
