'use client'

import React from 'react'
import { OKR, ProjectWithHeadAndAssignees } from '@/types/database.types'
import { Crown, TrendingUp, DollarSign, AlertCircle, Download, CheckCircle2, ChevronRight, Building } from 'lucide-react'
import { ExecutiveAnalytics } from '@/components/ExecutiveAnalytics'

interface ExecutiveWorkspaceProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onExportPDF: () => void
}

export function ExecutiveWorkspace({
  okrs,
  projects,
  onSelectProject,
  onExportPDF
}: ExecutiveWorkspaceProps) {
  const totalProjects = projects.length
  const totalBudget = projects.reduce((acc, p) => acc + Number(p.budget), 0)
  const totalSpent = projects.reduce((acc, p) => acc + Number(p.spent_amount), 0)
  const avgProgress = totalProjects > 0
    ? (projects.reduce((acc, p) => acc + Number(p.progress_percentage), 0) / totalProjects).toFixed(1)
    : '0.0'

  const delayedProjects = projects.filter(p => p.status === 'Delayed' || (p.bottleneck && p.bottleneck.length > 0))

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-navy-900/60 to-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shadow-glow-primary flex-shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Executive Portal
              </span>
              <span className="text-xs text-slate-400">มุมมองผู้บริหารระดับสูง</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
              แผงวิเคราะห์ยุทธศาสตร์และประเมินผลเชิงบริหาร
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              ติดตามความสำเร็จ OKR ประจำปี, อัตราเบิกจ่ายงบประมาณ 6 ภาควิชา, และจุดติดขัดที่ต้องสนับสนุน
            </p>
          </div>
        </div>

        <button
          onClick={onExportPDF}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-glow-primary transition-all active:scale-95 flex items-center gap-1.5 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export รายงานสรุปผู้บริหาร</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4">
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">ยุทธศาสตร์ OKR คณะ</span>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-1">{okrs.length} เป้าหมาย</div>
          <span className="text-[11px] text-sky-400">{totalProjects} โครงการรองรับ</span>
        </div>

        <div className="glass-card p-4">
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">ความก้าวหน้าเฉลี่ย</span>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">{avgProgress}%</div>
          <span className="text-[11px] text-emerald-300">ภาพรวมทุกภาควิชา</span>
        </div>

        <div className="glass-card p-4">
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">งบประมาณเบิกจ่าย</span>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1">
            {(totalSpent / 1000000).toFixed(2)} / {(totalBudget / 1000000).toFixed(1)} ลบ.
          </div>
          <span className="text-[11px] text-purple-300">
            เบิกจ่ายแล้ว {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="glass-card p-4">
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">โครงการที่ต้องเร่งรัด</span>
          <div className={`text-2xl sm:text-3xl font-bold mt-1 ${delayedProjects.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {delayedProjects.length} โครงการ
          </div>
          <span className="text-[11px] text-slate-400">สถานะล่าช้าหรือติดปัญหา</span>
        </div>
      </div>

      <ExecutiveAnalytics projects={projects} />

      {delayedProjects.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-rose-500/20 bg-rose-950/10">
          <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            โครงการที่ติดปัญหาและต้องการการสนับสนุนจากผู้บริหาร ({delayedProjects.length} โครงการ)
          </h3>

          <div className="space-y-2.5">
            {delayedProjects.map((p) => (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                      {p.department.replace('ภาควิชา', '')}
                    </span>
                    <h4 className="text-xs font-bold text-white">{p.project_name}</h4>
                  </div>
                  <p className="text-[11px] text-rose-200/80 mt-1">
                    <b>ปัญหาที่พบ:</b> {p.bottleneck}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-rose-400">{p.progress_percentage}%</span>
                    <span className="text-[10px] text-slate-400 block">งบ {(Number(p.budget) / 1000).toLocaleString()}k</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
