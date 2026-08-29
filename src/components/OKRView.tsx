'use client'

import React, { useState } from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { Target, ChevronRight, ChevronDown, Plus, Layers, ArrowUpRight } from 'lucide-react'
import { useRole } from '@/components/RoleContext'

interface OKRViewProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (p: ProjectWithHeadAndAssignees) => void
  onOpenCreateProject: () => void
}

export function OKRView({ okrs, projects, onSelectProject, onOpenCreateProject }: OKRViewProps) {
  const { currentRole } = useRole()
  const [expandedOkr, setExpandedOkr] = useState<string | null>(okrs[0]?.okr_id || null)

  const toggleExpand = (okrId: string) => {
    setExpandedOkr(expandedOkr === okrId ? null : okrId)
  }

  const canCreate = currentRole ? ['admin', 'head_okr', 'executive'].includes(currentRole) : false

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-sky-400" />
            เป้าหมายเชิงยุทธศาสตร์ระดับคณะ (Faculty OKRs)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            โครงสร้างเป้าหมายหลักและโครงการย่อยที่ขับเคลื่อนพันธกิจคณะวิทยาศาสตร์
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onOpenCreateProject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-primary transition-all active:scale-95 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มโครงการภายใต้ OKR</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {okrs.map((okr) => {
          const okrProjects = projects.filter(p => p.okr_id === okr.okr_id)
          const isExpanded = expandedOkr === okr.okr_id
          const totalBudget = okrProjects.reduce((sum, p) => sum + Number(p.budget), 0)
          const totalSpent = okrProjects.reduce((sum, p) => sum + Number(p.spent_amount), 0)
          const avgProgress = okrProjects.length > 0
            ? (okrProjects.reduce((sum, p) => sum + Number(p.progress_percentage), 0) / okrProjects.length).toFixed(1)
            : '0.0'

          return (
            <div
              key={okr.okr_id}
              className="glass-card overflow-hidden border border-white/10 transition-all duration-200"
            >
              <div
                onClick={() => toggleExpand(okr.okr_id)}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-0.5 flex-shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        ปี {okr.year} ({okr.quarter || 'ตลอดปี'})
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {okr.okr_type}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {okr.okr_title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-5 self-end md:self-auto flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 font-medium">ความก้าวหน้ารวม</div>
                    <div className="text-sm sm:text-base font-bold text-emerald-400">{avgProgress}%</div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] text-slate-400 font-medium">งบประมาณรวม</div>
                    <div className="text-xs font-bold text-white">
                      {(totalSpent / 1000).toLocaleString()}k / {(totalBudget / 1000).toLocaleString()}k ฿
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-white/5 text-slate-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-sky-400" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-white/10 bg-slate-950/40 p-4 md:p-5 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    โครงการย่อยที่ขับเคลื่อน OKR นี้ ({okrProjects.length} โครงการ)
                  </div>
                  {okrProjects.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">ยังไม่มีโครงการย่อยที่เชื่อมโยง</p>
                  ) : (
                    okrProjects.map((p) => (
                      <div
                        key={p.project_id}
                        onClick={() => onSelectProject(p)}
                        className="p-3 rounded-xl bg-white/[0.03] hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 font-medium">
                              {p.department.replace('ภาควิชา', '')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              หัวหน้า: {p.head ? `${p.head.first_name} ${p.head.last_name}` : 'ไม่ระบุ'}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
                            {p.project_name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold text-sky-400">{p.progress_percentage}%</div>
                            <div className="w-20 bg-slate-800 rounded-full h-1.5 mt-0.5 overflow-hidden">
                              <div
                                className="bg-sky-400 h-1.5 rounded-full"
                                style={{ width: `${p.progress_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                        </div>
                      </div>
                    ))
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
