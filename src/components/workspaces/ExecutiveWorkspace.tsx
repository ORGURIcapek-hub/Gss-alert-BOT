'use client'

import React, { useState, useEffect } from 'react'
import { OKR, ProjectWithHeadAndAssignees, DashboardReportWithDetails, ExecutiveSummaryProjectSnapshot, UserProfile } from '@/types/database.types'
import {
  Crown,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Building,
  Sparkles,
  FileText,
  UserCheck,
  Calendar,
  UserPlus,
  BarChart3,
  Award,
  Activity,
  Layers,
  Inbox,
  ArrowUpRight
} from 'lucide-react'
import { ExecutiveAnalytics } from '@/components/ExecutiveAnalytics'
import { AssignHeadModal } from './AssignHeadModal'
import { fetchDashboardReports } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'
import { formatDepartmentShort, formatThaiDate, getUserFullName, removeTitlesAndRoles } from '@/lib/user-constants'

interface ExecutiveWorkspaceProps {
  okrs: OKR[]
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
  onNavigateTab?: (tab: string) => void
}

export function ExecutiveWorkspace({
  okrs,
  projects,
  onSelectProject,
  onNavigateTab
}: ExecutiveWorkspaceProps) {
  const { currentUser, allUsers, refreshUsers } = useRole()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL')
  const [dashboardReports, setDashboardReports] = useState<DashboardReportWithDetails[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false)

  // Assign OKR Head modal state
  const [isAssignHeadOpen, setIsAssignHeadOpen] = useState(false)

  const loadReports = async () => {
    setIsLoadingReports(true)
    try {
      const reports = await fetchDashboardReports()
      setDashboardReports(reports)
    } catch (e) {
      console.error('[ExecutiveWorkspace] Error loading reports', e)
    } finally {
      setIsLoadingReports(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const filteredProjects = selectedProjectId === 'ALL'
    ? projects
    : projects.filter(p => p.project_id === selectedProjectId)

  const totalProjects = projects.length
  const totalBudget = projects.reduce((acc, p) => acc + Number(p.budget), 0)
  const totalSpent = projects.reduce((acc, p) => acc + Number(p.spent_amount), 0)
  const avgProgress = totalProjects > 0
    ? (projects.reduce((acc, p) => acc + Number(p.progress_percentage), 0) / totalProjects).toFixed(1)
    : '0.0'

  const delayedProjects = projects.filter(p => p.status === 'Delayed' || (p.bottleneck && p.bottleneck.length > 0))

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            แผงยุทธศาสตร์ผู้บริหาร (Executive Strategy Dashboard)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto flex-shrink-0">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('executive_summaries')}
              className="px-4 py-2.5 rounded-xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Inbox className="w-4 h-4 text-[#00A8B5]" />
              <span>ห้องมองสรุป Dashboard ที่ส่งมา ({dashboardReports.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsAssignHeadOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#00A8B5] hover:bg-[#008B97] text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>กำหนดหัวหน้าโครงการ (Assign OKR Head)</span>
          </button>
        </div>
      </div>

      {/* Main Focus Area: Dynamic Active Projects Filter */}
      <div className="bg-white rounded-2xl p-5 border-2 border-slate-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00A8B5]" />
            <h3 className="text-sm font-bold text-slate-900">
              โฟกัสโครงการยุทธศาสตร์ที่กำลังดำเนินการ (Active Projects Focus)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            เลือกโครงการเพื่อเจาะลึกข้อมูลเฉพาะส่วน ({projects.length} โครงการในระบบ)
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setSelectedProjectId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
              selectedProjectId === 'ALL'
                ? 'bg-[#003B71] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-slate-800'
            }`}
          >
            🌟 ภาพรวมทุกโครงการ ({projects.length})
          </button>

          {projects.map((p) => {
            const isSelected = selectedProjectId === p.project_id
            return (
              <button
                key={p.project_id}
                onClick={() => setSelectedProjectId(p.project_id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#003B71] text-white shadow-sm font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${p.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                <span className="max-w-[200px] truncate">{p.project_name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {p.progress_percentage}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ยุทธศาสตร์ OKR คณะ</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{okrs.length} เป้าหมาย</div>
          <span className="text-xs text-[#003B71] font-semibold mt-1 block">{filteredProjects.length} โครงการ</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ความก้าวหน้าเฉลี่ย</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{avgProgress}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">งบประมาณเบิกจ่าย</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {(totalSpent / 1000000).toFixed(2)} / {(totalBudget / 1000000).toFixed(1)} ลบ.
          </div>
          <span className="text-xs text-purple-700 font-semibold mt-1 block">
            เบิกจ่ายแล้ว {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">โครงการที่ต้องเร่งรัด</span>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${delayedProjects.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {delayedProjects.length} โครงการ
          </div>
          <span className="text-xs text-slate-500 font-semibold mt-1 block">สถานะล่าช้าหรือติดปัญหา</span>
        </div>
      </div>

      {/* Analytics Charts & Project Status Breakdown */}
      <ExecutiveAnalytics projects={filteredProjects} onSelectProject={onSelectProject} />

      {/* SECTION: Reports submitted by OKR Head with Visual Infographics & 5-Star Interactive Rating */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#003B71]" />
              <span>รายงานสรุปและกราฟผลสัมฤทธิ์จากหัวหน้าโครงการ OKR</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              แสดงผลคำเขียนสรุปและกราฟเดี่ยวของแต่ละงานที่ส่งมอบให้ผู้บริหาร
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('executive_summaries')}
                className="px-3.5 py-1 rounded-xl text-xs font-bold bg-[#003B71] hover:bg-[#00264D] text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>ไปที่ห้องมองสรุปเต็มรูปแบบ</span>
              </button>
            )}
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-sky-50 text-[#003B71] border border-sky-300">
              {dashboardReports.length} รายงาน
            </span>
          </div>
        </div>

        {dashboardReports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm sm:text-base">
            ยังไม่มีรายงานสรุปเชิงยุทธศาสตร์ที่ส่งเข้ามาในระบบ
          </div>
        ) : (
          <div className="space-y-7">
            {dashboardReports.map((report) => {
              const snapshots = (report.project_snapshots && report.project_snapshots.length > 0)
                ? report.project_snapshots
                : (report.project_ids && report.project_ids.length > 0)
                ? projects.filter(p => report.project_ids?.includes(p.project_id)).map(p => ({
                    project_id: p.project_id,
                    project_name: p.project_name,
                    department: p.department,
                    progress_percentage: p.progress_percentage,
                    budget: Number(p.budget) || 0,
                    spent_amount: Number(p.spent_amount) || 0,
                    status: p.status || 'In Progress',
                    bottleneck: p.bottleneck || null,
                    main_objective: p.main_objective || null,
                    head_name: removeTitlesAndRoles(p.head?.name || '') || null
                  }))
                : []

              return (
                <div
                  key={report.dashboard_id}
                  className="rounded-3xl bg-slate-50/60 border-2 border-slate-900 hover:border-[#003B71] hover:shadow-lg transition-all p-6 sm:p-7 space-y-6 flex flex-col justify-between"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#003B71] text-white flex items-center justify-center font-bold shadow-sm">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          {report.head_name || 'หัวหน้าโครงการ OKR'}
                        </h4>
                        <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#00A8B5]" />
                          ปีงบประมาณ {report.academic_year || 2567} • {formatThaiDate(report.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/15">
                        {snapshots.length} โครงการในสรุปนี้
                      </span>
                    </div>
                  </div>

                  {/* 1. คำเขียนสรุป (Executive Written Summary) */}
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-sky-50/50 border-2 border-amber-300 p-5 space-y-2 shadow-xs">
                    <span className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      คำเขียนสรุปสำหรับผู้บริหาร (Executive Summary):
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                      {report.overall_okr_info}
                    </p>
                  </div>

                  {/* 2. กราฟงานนั้นเดี่ยวๆ (Individual Standalone Single-Project Graphs & Metrics) */}
                  {snapshots.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-[#003B71]" />
                        <span>กราฟผลสัมฤทธิ์รายโครงการเดี่ยวๆ ({snapshots.length} งาน)</span>
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {snapshots.map((ps) => {
                          const isComplete = ps.progress_percentage === 100
                          const isDelayed = ps.status === 'Delayed' || (ps.bottleneck && ps.bottleneck.trim().length > 0)
                          const budgetNum = Number(ps.budget) || 0
                          const spentNum = Number(ps.spent_amount) || 0
                          const spentRate = budgetNum > 0 ? ((spentNum / budgetNum) * 100).toFixed(1) : '0'
                          const matchedProject = projects.find(p => p.project_id === ps.project_id)

                          const radius = 34
                          const circumference = 2 * Math.PI * radius
                          const strokeDashoffset = circumference - (ps.progress_percentage / 100) * circumference
                          const gaugeColor = isComplete ? '#10B981' : isDelayed ? '#E11D48' : '#003B71'

                          return (
                            <div
                              key={ps.project_id}
                              className="rounded-2xl bg-white border-2 border-slate-800 p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-[#003B71] transition-all"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {formatDepartmentShort(ps.department)}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                      isComplete
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : isDelayed
                                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                                        : 'bg-sky-50 text-sky-700 border-sky-300'
                                    }`}
                                  >
                                    {isComplete ? 'เสร็จสิ้น' : isDelayed ? 'ติดปัญหา' : 'คืบหน้า'}
                                  </span>
                                </div>
                                <h6 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {ps.project_name}
                                </h6>
                              </div>

                              {/* Single Project Graph Visuals */}
                              <div className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="col-span-4 flex items-center justify-center">
                                  <div className="relative w-16 h-16 flex items-center justify-center">
                                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 96 96">
                                      <circle cx="48" cy="48" r={radius} stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
                                      <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        stroke={gaugeColor}
                                        strokeWidth="8"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        fill="transparent"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                      <span className="text-xs font-black text-slate-900">{ps.progress_percentage}%</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-8 space-y-1.5 text-[10px]">
                                  <div className="flex justify-between font-bold">
                                    <span className="text-slate-600">การใช้จ่าย:</span>
                                    <span className="text-[#003B71]">{spentRate}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full ${Number(spentRate) > 90 ? 'bg-amber-500' : 'bg-[#003B71]'}`}
                                      style={{ width: `${Math.min(100, Number(spentRate))}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-slate-500 font-medium">
                                    <span>งบ: {budgetNum.toLocaleString()} ฿</span>
                                    <span>ใช้: {spentNum.toLocaleString()} ฿</span>
                                  </div>
                                </div>
                              </div>

                              {ps.bottleneck && (
                                <p className="text-[10px] text-rose-700 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                                  ⚠️ {ps.bottleneck}
                                </p>
                              )}

                              {matchedProject && (
                                <button
                                  type="button"
                                  onClick={() => onSelectProject(matchedProject)}
                                  className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-[#003B71] hover:text-white text-slate-800 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <span>ดูรายละเอียดงานนี้</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delayed Projects Attention Box */}
      {delayedProjects.length > 0 && (
        <div className="bg-rose-50/70 rounded-2xl p-6 border-2 border-rose-400 space-y-4 shadow-sm">
          <h3 className="text-sm sm:text-base font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            โครงการที่ติดปัญหาและต้องการการสนับสนุนจากผู้บริหาร ({delayedProjects.length} โครงการ)
          </h3>

          <div className="space-y-3">
            {delayedProjects.map((p) => (
              <div
                key={p.project_id}
                onClick={() => onSelectProject(p)}
                className="p-4 rounded-xl bg-white border-2 border-slate-900 hover:border-rose-500 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {formatDepartmentShort(p.department)}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{p.project_name}</h4>
                  </div>
                  <p className="text-xs text-rose-700 mt-1.5 font-medium">
                    <b>ปัญหาที่พบ:</b> {p.bottleneck}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600">{p.progress_percentage}%</span>
                    <span className="text-[11px] text-slate-500 block">งบ {(Number(p.budget) / 1000).toLocaleString()}k</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN OKR HEAD TO PROJECT */}
      <AssignHeadModal
        isOpen={isAssignHeadOpen}
        onClose={() => setIsAssignHeadOpen(false)}
        projects={projects}
        allUsers={allUsers}
        onSuccess={refreshUsers}
      />
    </div>
  )
}
