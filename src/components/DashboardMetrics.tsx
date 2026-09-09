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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">
            เป้าหมาย OKR
          </span>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#003B71] flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{okrs.length}</span>
          <span className="text-xs sm:text-sm text-slate-500 font-bold">เป้าหมาย</span>
        </div>
        <div className="mt-1.5 text-xs sm:text-sm text-slate-600 truncate font-semibold">
          {totalProjects} โครงการ ({completedProjects} สำเร็จ)
        </div>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">
            ความก้าวหน้ารวม
          </span>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">{avgProgress}%</span>
        </div>
        <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(Number(avgProgress), 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">
            งบประมาณรวม
          </span>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3.5 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {(totalSpent / 1000000).toFixed(2)}
          </span>
          <span className="text-xs sm:text-sm text-slate-600 font-bold">/ {(totalBudget / 1000000).toFixed(1)} ลบ.</span>
        </div>
        <div className="mt-1.5 text-xs sm:text-sm text-purple-800 font-semibold">
          เบิกจ่ายแล้ว <b>{spentPercent}%</b>
        </div>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">
            สถานะความเสี่ยง
          </span>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${delayedProjects > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {delayedProjects > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
        </div>
        <div className="mt-3.5 flex items-baseline gap-2">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${delayedProjects > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {delayedProjects > 0 ? `${delayedProjects} โครงการ` : 'ปกติ'}
          </span>
        </div>
        <div className="mt-1.5 text-xs sm:text-sm text-slate-600 truncate font-semibold">
          {delayedProjects > 0 ? 'พบโครงการที่ล่าช้า' : 'ทุกโครงการตามแผน'}
        </div>
      </div>
    </div>
  )
}
