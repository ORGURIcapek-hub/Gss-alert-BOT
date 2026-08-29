'use client'

import React from 'react'
import { Target, TrendingUp, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ProjectWithHeadAndAssignees, OKR } from '@/types/database.types'

interface DashboardMetricsProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
}

export function DashboardMetrics({ okrs, projects }: DashboardMetricsProps) {
  const totalProjects = projects.length
  const completedProjects = projects.filter(p => p.progress_percentage === 100 || p.status === 'Completed').length
  const delayedProjects = projects.filter(p => p.status === 'Delayed' || (p.bottleneck && p.bottleneck.length > 0)).length

  const avgProgress = totalProjects > 0
    ? (projects.reduce((acc, p) => acc + Number(p.progress_percentage), 0) / totalProjects).toFixed(1)
    : '0.0'

  const totalBudget = projects.reduce((acc, p) => acc + Number(p.budget), 0)
  const totalSpent = projects.reduce((acc, p) => acc + Number(p.spent_amount), 0)
  const spentPercent = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="glass-card p-3.5 sm:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
            เป้าหมาย OKR
          </span>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Target className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-3xl font-bold text-white tracking-tight">{okrs.length}</span>
          <span className="text-[11px] sm:text-xs text-slate-400">เป้าหมาย</span>
        </div>
        <div className="mt-1 text-[10px] sm:text-xs text-slate-400 truncate">
          {totalProjects} โครงการ ({completedProjects} สำเร็จ)
        </div>
      </div>

      <div className="glass-card p-3.5 sm:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
            ความก้าวหน้า
          </span>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-3xl font-bold text-emerald-400 tracking-tight">{avgProgress}%</span>
        </div>
        <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(Number(avgProgress), 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="glass-card p-3.5 sm:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
            งบประมาณ
          </span>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2 sm:mt-3 flex items-baseline gap-1">
          <span className="text-lg sm:text-2xl font-bold text-white tracking-tight">
            {(totalSpent / 1000000).toFixed(2)}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400">/ {(totalBudget / 1000000).toFixed(1)} ลบ.</span>
        </div>
        <div className="mt-1 text-[10px] sm:text-xs text-indigo-300">
          เบิกจ่ายแล้ว <b>{spentPercent}%</b>
        </div>
      </div>

      <div className="glass-card p-3.5 sm:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
            สถานะความเสี่ยง
          </span>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${delayedProjects > 0 ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
            {delayedProjects > 0 ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
        </div>
        <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
          <span className={`text-xl sm:text-3xl font-bold tracking-tight ${delayedProjects > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {delayedProjects > 0 ? `${delayedProjects} โครงการ` : 'ปกติ'}
          </span>
        </div>
        <div className="mt-1 text-[10px] sm:text-xs text-slate-400 truncate">
          {delayedProjects > 0 ? 'พบโครงการที่ล่าช้า' : 'ทุกโครงการตามแผน'}
        </div>
      </div>
    </div>
  )
}
