'use client'

import React from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { Layers, Plus, Users, Target, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { useRole } from '@/components/RoleContext'

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
  const { currentUser } = useRole()

  const myDeptProjects = projects.filter(
    p => p.department === currentUser?.department || p.head_of_project === currentUser?.user_id
  )

  const otherProjects = projects.filter(
    p => p.department !== currentUser?.department && p.head_of_project !== currentUser?.user_id
  )

  const myCompleted = myDeptProjects.filter(p => p.progress_percentage === 100).length
  const myInProgress = myDeptProjects.filter(p => p.progress_percentage < 100 && (!p.bottleneck || p.bottleneck.length === 0)).length
  const myDelayed = myDeptProjects.filter(p => p.bottleneck && p.bottleneck.length > 0).length

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-navy-900/60 to-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center shadow-glow-primary flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Head of OKR Workspace
              </span>
              <span className="text-xs text-sky-400 font-semibold">{currentUser?.department}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
              พื้นที่บริหารและขับเคลื่อนโครงการ OKR
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              ป้อนโครงการใหม่, มอบหมายงานให้อาจารย์ในสังกัด, และติดตามผลการปฏิบัติงาน
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-glow-primary transition-all active:scale-95 flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>ป้อนโครงการ OKR ใหม่</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold">โครงการในความดูแล</span>
            <div className="text-xl sm:text-2xl font-bold text-white">{myDeptProjects.length} โครงการ</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold">กำลังดำเนินการ / สำเร็จ</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">
              {myInProgress} / {myCompleted}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold">ติดปัญหาหรือล่าช้า</span>
            <div className="text-xl sm:text-2xl font-bold text-rose-400">{myDelayed} โครงการ</div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              โครงการในภาควิชาและโครงการที่คุณเป็นหัวหน้า ({myDeptProjects.length})
            </h3>
            <p className="text-xs text-slate-400">คลิกที่โครงการเพื่อมอบหมายลูกทีม หรือปรับปรุงความก้าวหน้า</p>
          </div>
        </div>

        <div className="space-y-3">
          {myDeptProjects.map((p) => {
            const assigneesCount = p.assignees?.length || 0
            return (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/20">
                      {p.project_type}
                    </span>
                    <span className="text-xs text-slate-400">
                      งบ: <b>{(Number(p.budget) / 1000).toLocaleString()}k ฿</b>
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">{p.project_name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>อาจารย์ลูกทีมผู้ร่วมรับผิดชอบ: <b>{assigneesCount} ท่าน</b></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-sky-400">{p.progress_percentage}%</span>
                    <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-sky-400 h-1.5 rounded-full"
                        style={{ width: `${p.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded-lg bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
