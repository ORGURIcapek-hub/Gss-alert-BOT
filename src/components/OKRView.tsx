'use client'

import React, { useState } from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { Target, ChevronDown, ChevronRight, Plus, FolderGit2, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { getUserFullName, formatDepartmentShort } from '@/lib/user-constants'

interface OKRViewProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onOpenCreateProject: () => void
}

export function OKRView({ okrs, projects, onSelectProject, onOpenCreateProject }: OKRViewProps) {
  const { currentRole } = useRole()
  const [expandedOkr, setExpandedOkr] = useState<string | null>(okrs[0]?.okr_id || null)

  const canCreate = currentRole ? ['admin', 'head_okr', 'executive'].includes(currentRole) : false

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            โครงสร้างเป้าหมาย OKR และโครงการรองรับ
          </h2>
        </div>

        {canCreate && (
          <button
            onClick={onOpenCreateProject}
            className="px-4 py-2.5 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>สร้างโครงการใหม่</span>
          </button>
        )}
      </div>

      {/* OKR Accordions */}
      <div className="space-y-4">
        {okrs.map((okr) => {
          const okrProjects = projects.filter((p) => p.okr_id === okr.okr_id)
          const isExpanded = expandedOkr === okr.okr_id
          const totalBudget = okrProjects.reduce((acc, p) => acc + Number(p.budget), 0)
          const avgProgress = okrProjects.length > 0
            ? (okrProjects.reduce((acc, p) => acc + Number(p.progress_percentage), 0) / okrProjects.length).toFixed(1)
            : '0.0'

          return (
            <div
              key={okr.okr_id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all"
            >
              <div
                onClick={() => setExpandedOkr(isExpanded ? null : okr.okr_id)}
                className="p-6 cursor-pointer hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#003B71] flex items-center justify-center flex-shrink-0 font-bold">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
                        {okr.okr_type}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        ปี {okr.year} {okr.quarter && `(${okr.quarter})`}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {okr.okr_title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end md:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium block">
                      {okrProjects.length} โครงการรองรับ
                    </span>
                    <span className="text-xs font-bold text-emerald-600 block mt-0.5">
                      คืบหน้าเฉลี่ย {avgProgress}%
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100 text-slate-500">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-3 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 pt-2">
                    โครงการภายใต้เป้าหมายยุทธศาสตร์นี้ ({okrProjects.length}):
                  </div>

                  {okrProjects.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white text-center text-slate-400 text-xs border border-slate-200">
                      ยังไม่มีโครงการที่ผูกกับเป้าหมาย OKR นี้
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {okrProjects.map((p) => {
                        const headName = getUserFullName(p.head)
                        return (
                          <div
                            key={p.project_id}
                            onClick={() => onSelectProject(p)}
                            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#003B71] transition-all cursor-pointer shadow-sm space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {formatDepartmentShort(p.department)}
                              </span>
                              <span className="text-xs text-slate-500">
                                หัวหน้า: <b className="text-slate-800">{headName}</b>
                              </span>
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                              {p.project_name}
                            </h4>

                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                              <span className="text-slate-500">งบ {(Number(p.budget) / 1000).toLocaleString()}k ฿</span>
                              <span className="font-bold text-[#003B71]">{p.progress_percentage}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
