'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { DashboardReportWithDetails, ProjectWithHeadAndAssignees, ExecutiveSummaryProjectSnapshot } from '@/types/database.types'
import {
  Inbox,
  Sparkles,
  Calendar,
  UserCheck,
  Award,
  TrendingUp,
  DollarSign,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  BarChart3,
  Layers,
  ArrowUpRight
} from 'lucide-react'
import { fetchDashboardReports } from '@/lib/services/okr-service'
import { useRole } from '@/components/RoleContext'
import { formatDepartmentShort, formatThaiDate, removeTitlesAndRoles } from '@/lib/user-constants'

interface ExecutiveSummaryRoomProps {
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject: (project: ProjectWithHeadAndAssignees) => void
}

export function ExecutiveSummaryRoom({ projects, onSelectProject }: ExecutiveSummaryRoomProps) {
  const { currentUser } = useRole()
  const [reports, setReports] = useState<DashboardReportWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('ALL')

  const loadData = async () => {
    setIsLoading(true)
    try {
      const fetchedReports = await fetchDashboardReports()
      setReports(fetchedReports)
    } catch (e) {
      console.error('[ExecutiveSummaryRoom] Error loading reports', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter reports by search and year
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesYear = selectedYear === 'ALL' || String(r.academic_year) === selectedYear
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        r.head_name?.toLowerCase().includes(q) ||
        r.overall_okr_info?.toLowerCase().includes(q) ||
        r.project_snapshots?.some(ps => ps.project_name.toLowerCase().includes(q) || ps.department.toLowerCase().includes(q))
      return matchesYear && matchesSearch
    })
  }, [reports, selectedYear, searchQuery])

  // Helper to resolve project snapshots if not present
  const getResolvedSnapshots = (report: DashboardReportWithDetails): ExecutiveSummaryProjectSnapshot[] => {
    if (report.project_snapshots && report.project_snapshots.length > 0) {
      return report.project_snapshots
    }
    if (report.project_ids && report.project_ids.length > 0) {
      return projects
        .filter(p => report.project_ids?.includes(p.project_id))
        .map(p => ({
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
    }
    return []
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Inbox className="w-7 h-7 text-[#003B71]" />
            <span>ห้องมองสรุป Dashboard ที่ส่งมา (Executive Summary Room)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            รายงานสรุปเชิงยุทธศาสตร์ที่หัวหน้าโครงการ OKR ส่งมอบให้ผู้บริหาร แสดงผลเป็นกราฟเดี่ยวของแต่ละงานและคำเขียนสรุป
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/20">
            {reports.length} รายงานสรุปที่ได้รับ
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ส่ง, โครงการ, หรือข้อความ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#003B71] font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-600 font-semibold">ปีงบประมาณ:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#003B71]"
          >
            <option value="ALL">ทุกปีงบประมาณ</option>
            <option value="2567">ปีงบประมาณ 2567</option>
            <option value="2566">ปีงบประมาณ 2566</option>
          </select>
        </div>
      </div>

      {/* Submissions Feed */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          กำลังโหลดรายงานสรุปสำหรับผู้บริหาร...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">ยังไม่มีรายงานสรุปที่ส่งมาในห้องนี้</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            เมื่อหัวหน้าโครงการ OKR ส่งสรุป Dashboard ผ่านเมนู &quot;ส่งสรุป Dashboard ให้ผู้บริหาร&quot; ข้อมูลจะปรากฏที่ห้องนี้ทันที
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredReports.map((report) => {
            const snapshots = getResolvedSnapshots(report)

            return (
              <div
                key={report.dashboard_id}
                className="bg-white rounded-3xl border-2 border-slate-900 shadow-md overflow-hidden transition-all hover:border-[#003B71]"
              >
                {/* Card Top Banner: Submitter & Date */}
                <div className="bg-gradient-to-r from-slate-900 via-[#003B71] to-[#002b54] p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm text-white flex items-center justify-center font-bold shadow-sm border border-white/20">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black tracking-tight">
                          {report.head_name || 'หัวหน้าโครงการ OKR'}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00A8B5] text-white">
                          ส่งสรุปแล้ว
                        </span>
                      </div>
                      <span className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#00A8B5]" />
                        <span>ปีงบประมาณ {report.academic_year || 2567}</span>
                        <span>•</span>
                        <span>{formatThaiDate(report.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white/15 text-white border border-white/20">
                      {snapshots.length} โครงการในรายงานสรุปนี้
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-7">
                  {/* 1. ส่วนคำเขียนสรุป (Written Strategic Summary) */}
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50/70 via-sky-50/40 to-slate-50 border-2 border-amber-300 p-5 sm:p-6 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-900 flex items-center gap-2 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        คำเขียนสรุปสำหรับผู้บริหาร (Executive Strategic Summary)
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        ข้อความสรุปจากผู้ส่ง
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white/90 border border-amber-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-line shadow-xs">
                      {report.overall_okr_info || 'ไม่มีข้อความสรุประบุ'}
                    </div>
                  </div>

                  {/* 2. ส่วนกราฟงานนั้นเดี่ยวๆ (Individual Standalone Single-Project Graphs & Metrics) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#003B71]" />
                        <span>กราฟและผลสัมฤทธิ์รายโครงการเดี่ยวๆ ({snapshots.length} งาน)</span>
                      </h4>
                      <span className="text-xs text-slate-500 font-medium">
                        แต่ละกล่องแสดงกราฟความคืบหน้าและการใช้งบประมาณของงานนั้นเดี่ยวๆ
                      </span>
                    </div>

                    {snapshots.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                        ไม่ได้ระบุโครงการเฉพาะเจาะจงในรายงานสรุปนี้ (เป็นรายงานภาพรวมเชิงยุทธศาสตร์)
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {snapshots.map((ps) => {
                          const isComplete = ps.progress_percentage === 100
                          const isDelayed = ps.status === 'Delayed' || (ps.bottleneck && ps.bottleneck.trim().length > 0)
                          const budgetNum = Number(ps.budget) || 0
                          const spentNum = Number(ps.spent_amount) || 0
                          const spentRate = budgetNum > 0 ? ((spentNum / budgetNum) * 100).toFixed(1) : '0'

                          // Find live project object if available to allow opening ProjectDetailModal
                          const matchedProject = projects.find(p => p.project_id === ps.project_id)

                          // SVG circular gauge calculations
                          const radius = 38
                          const circumference = 2 * Math.PI * radius
                          const strokeDashoffset = circumference - (ps.progress_percentage / 100) * circumference

                          const gaugeColor = isComplete
                            ? '#10B981' // emerald
                            : isDelayed
                            ? '#E11D48' // rose
                            : '#003B71' // deep navy

                          return (
                            <div
                              key={ps.project_id}
                              className="rounded-2xl bg-white border-2 border-slate-800 hover:border-[#003B71] hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                            >
                              {/* Single Project Header */}
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {formatDepartmentShort(ps.department)}
                                  </span>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                      isComplete
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : isDelayed
                                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                                        : 'bg-sky-50 text-sky-700 border-sky-300'
                                    }`}
                                  >
                                    {isComplete ? 'เสร็จสิ้น 100%' : isDelayed ? 'ล่าช้า/ติดปัญหา' : 'กำลังดำเนินการ'}
                                  </span>
                                </div>

                                <h5 className="text-sm font-bold text-slate-900 line-clamp-1">
                                  {ps.project_name}
                                </h5>
                                {ps.main_objective && (
                                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 font-medium leading-relaxed">
                                    {ps.main_objective}
                                  </p>
                                )}
                              </div>

                              {/* กราฟเดี่ยว: Progress Donut & Budget Bars */}
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                {/* SVG Circular Donut Chart */}
                                <div className="sm:col-span-5 flex items-center justify-center gap-3">
                                  <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 96 96">
                                      <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        stroke="#E2E8F0"
                                        strokeWidth="8"
                                        fill="transparent"
                                      />
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
                                        className="transition-all duration-700 ease-out"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                      <span className="text-sm font-black text-slate-900 leading-none">
                                        {ps.progress_percentage}%
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-bold mt-0.5">
                                        คืบหน้า
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Single Project Budget Graph Bar */}
                                <div className="sm:col-span-7 space-y-2">
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                      <span className="text-slate-600 flex items-center gap-1">
                                        <DollarSign className="w-3 h-3 text-[#00A8B5]" />
                                        การใช้จ่ายงบ
                                      </span>
                                      <span className="text-[#003B71]">{spentRate}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                      <div
                                        className={`h-2.5 rounded-full transition-all duration-500 ${
                                          Number(spentRate) > 90 ? 'bg-amber-500' : 'bg-[#003B71]'
                                        }`}
                                        style={{ width: `${Math.min(100, Number(spentRate))}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="text-[10px] space-y-0.5 text-slate-600 font-medium">
                                    <div className="flex justify-between">
                                      <span>งบจัดสรร:</span>
                                      <b className="text-slate-900">{budgetNum.toLocaleString()} ฿</b>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>ใช้จริง:</span>
                                      <b className="text-emerald-700">{spentNum.toLocaleString()} ฿</b>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Bottleneck Warning Note if any */}
                              {ps.bottleneck && (
                                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium flex items-start gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                                  <span><b>ข้อติดขัด:</b> {ps.bottleneck}</span>
                                </div>
                              )}

                              {/* Action Button to inspect full project */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[11px] text-slate-500">
                                  หัวหน้างาน: <b className="text-slate-800">{ps.head_name || 'ไม่ระบุ'}</b>
                                </span>
                                {matchedProject && (
                                  <button
                                    type="button"
                                    onClick={() => onSelectProject(matchedProject)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#003B71] hover:text-white text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>ดูรายละเอียดงานนี้</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
