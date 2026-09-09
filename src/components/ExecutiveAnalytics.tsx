'use client'

import React, { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { ProjectWithHeadAndAssignees } from '@/types/database.types'
import { getUserFullName, formatDepartmentShort } from '@/lib/user-constants'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  PauseCircle,
  Building2,
  User,
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpRight,
  Search,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ExecutiveAnalyticsProps {
  projects: ProjectWithHeadAndAssignees[]
  onSelectProject?: (project: ProjectWithHeadAndAssignees) => void
}

type StatusFilterType = 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'ON_HOLD'

export function ExecutiveAnalytics({ projects, onSelectProject }: ExecutiveAnalyticsProps) {
  const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterType>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Categorize projects
  const completedProjects = useMemo(
    () => projects.filter(p => p.progress_percentage === 100 || p.status === 'Completed'),
    [projects]
  )

  const delayedProjects = useMemo(
    () => projects.filter(p => p.status === 'Delayed' || (p.bottleneck && p.bottleneck.trim().length > 0)),
    [projects]
  )

  const inProgressProjects = useMemo(
    () => projects.filter(p =>
      p.status === 'In Progress' &&
      p.progress_percentage < 100 &&
      (!p.bottleneck || p.bottleneck.trim() === '')
    ),
    [projects]
  )

  const onHoldProjects = useMemo(
    () => projects.filter(p => p.status === 'On Hold' || p.status === 'Draft'),
    [projects]
  )

  const totalCount = projects.length || 1
  const completedPct = ((completedProjects.length / totalCount) * 100).toFixed(1)
  const inProgressPct = ((inProgressProjects.length / totalCount) * 100).toFixed(1)
  const delayedPct = ((delayedProjects.length / totalCount) * 100).toFixed(1)
  const onHoldPct = ((onHoldProjects.length / totalCount) * 100).toFixed(1)

  // Filtered projects list based on status selection and search query
  const displayedProjects = useMemo(() => {
    let list: ProjectWithHeadAndAssignees[] = []
    if (activeStatusFilter === 'COMPLETED') list = completedProjects
    else if (activeStatusFilter === 'IN_PROGRESS') list = inProgressProjects
    else if (activeStatusFilter === 'DELAYED') list = delayedProjects
    else if (activeStatusFilter === 'ON_HOLD') list = onHoldProjects
    else list = projects

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(p => {
        const projName = (p.project_name || '').toLowerCase()
        const deptName = (p.department || '').toLowerCase()
        const headName = getUserFullName(p.head).toLowerCase()
        const bottleneck = (p.bottleneck || '').toLowerCase()
        return projName.includes(q) || deptName.includes(q) || headName.includes(q) || bottleneck.includes(q)
      })
    }

    return list
  }, [activeStatusFilter, completedProjects, inProgressProjects, delayedProjects, onHoldProjects, projects, searchQuery])

  // Chart 1: Doughnut Chart Data (สัดส่วนสถานะโครงการ)
  const doughnutData = {
    labels: [
      `เสร็จสิ้น (${completedProjects.length})`,
      `กำลังดำเนินการ (${inProgressProjects.length})`,
      `ล่าช้า/ติดปัญหา (${delayedProjects.length})`,
      `พักชะลอ (${onHoldProjects.length})`
    ],
    datasets: [
      {
        data: [
          completedProjects.length,
          inProgressProjects.length,
          delayedProjects.length,
          onHoldProjects.length
        ],
        backgroundColor: ['#10b981', '#003B71', '#f59e0b', '#94a3b8'],
        hoverBackgroundColor: ['#059669', '#00264d', '#d97706', '#64748b'],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6
      }
    ]
  }

  // Department Aggregations
  const deptMap: Record<string, { totalBudget: number; totalSpent: number; totalProgress: number; count: number }> = {}
  projects.forEach(p => {
    const dept = p.department || 'ส่วนกลาง'
    if (!deptMap[dept]) {
      deptMap[dept] = { totalBudget: 0, totalSpent: 0, totalProgress: 0, count: 0 }
    }
    deptMap[dept].totalBudget += Number(p.budget || 0)
    deptMap[dept].totalSpent += Number(p.spent_amount || 0)
    deptMap[dept].totalProgress += Number(p.progress_percentage || 0)
    deptMap[dept].count += 1
  })

  const deptLabels = Object.keys(deptMap)
  const shortDeptLabels = deptLabels.map(l => l.replace('ภาควิชา', '').replace('สำนักงาน', 'สนง.'))
  const deptProgress = deptLabels.map(d => (deptMap[d].totalProgress / (deptMap[d].count || 1)).toFixed(1))
  const deptSpentPct = deptLabels.map(d =>
    deptMap[d].totalBudget > 0 ? ((deptMap[d].totalSpent / deptMap[d].totalBudget) * 100).toFixed(1) : '0'
  )

  // Chart 2: Bar Chart - ความก้าวหน้าและการเบิกจ่าย (%) ตามภาควิชา
  const barData = {
    labels: shortDeptLabels,
    datasets: [
      {
        label: 'ความก้าวหน้า (%)',
        data: deptProgress,
        backgroundColor: '#003B71',
        borderRadius: 8,
        barThickness: 22
      },
      {
        label: 'เบิกจ่าย (%)',
        data: deptSpentPct,
        backgroundColor: '#00A8B5',
        borderRadius: 8,
        barThickness: 22
      }
    ]
  }

  // Chart 3: Financial Bar Chart - งบประมาณที่ได้รับ vs เบิกจ่ายจริง (ล้านบาท)
  const budgetAllocatedMB = deptLabels.map(d => (deptMap[d].totalBudget / 1000000).toFixed(2))
  const budgetSpentMB = deptLabels.map(d => (deptMap[d].totalSpent / 1000000).toFixed(2))

  const financeBarData = {
    labels: shortDeptLabels,
    datasets: [
      {
        label: 'งบจัดสรร (ล้านบาท)',
        data: budgetAllocatedMB,
        backgroundColor: '#6366f1',
        borderRadius: 8,
        barThickness: 20
      },
      {
        label: 'เบิกจ่ายจริง (ล้านบาท)',
        data: budgetSpentMB,
        backgroundColor: '#10b981',
        borderRadius: 8,
        barThickness: 20
      }
    ]
  }

  // Chart 4: Line Chart - ผลสัมฤทธิ์รายไตรมาส (Actual vs Target Trajectory)
  const lineData = {
    labels: ['ม.ค. (Q1)', 'ก.พ.', 'มี.ค.', 'เม.ย. (Q2)', 'พ.ค.', 'มิ.ย.', 'ก.ค. (Q3)', 'ส.ค.', 'ก.ย.', 'ต.ค. (Q4)', 'พ.ย.', 'ธ.ค.'],
    datasets: [
      {
        label: 'ผลงานจริง (Actual %)',
        data: [15, 28, 42, 52, 63, 72, 80, 86, 88.1, null, null, null],
        borderColor: '#003B71',
        backgroundColor: 'rgba(0, 59, 113, 0.12)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#003B71',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5
      },
      {
        label: 'เป้าหมายแผนงาน (Target %)',
        data: [10, 20, 30, 45, 55, 65, 75, 82, 90, 95, 98, 100],
        borderColor: '#94a3b8',
        borderDash: [5, 5],
        fill: false,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: '#94a3b8'
      }
    ]
  }

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#334155',
          font: { family: "'Prompt', 'Sarabun', sans-serif", size: 11, weight: 'bold' as const },
          boxWidth: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        padding: 10,
        cornerRadius: 10,
        titleFont: { family: "'Prompt', 'Sarabun', sans-serif", size: 12, weight: 'bold' as const },
        bodyFont: { family: "'Prompt', 'Sarabun', sans-serif", size: 11 }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { family: "'Prompt', 'Sarabun', sans-serif", size: 10, weight: 'bold' as const } },
        grid: { color: 'rgba(0, 0, 0, 0.03)' }
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { family: "'Prompt', 'Sarabun', sans-serif", size: 10 } },
        grid: { color: 'rgba(0, 0, 0, 0.04)' }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. STATUS PROPORTION BREAKDOWN INTERACTIVE BAR & SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#003B71]" />
              <span>สรุปสัดส่วนสถานะโครงการทั้งหมด (Project Status Proportion)</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              คลิกที่สถานะเพื่อกรองดูรายชื่อโครงการในแต่ละกลุ่มได้ทันที ({projects.length} โครงการทั้งหมด)
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto border border-slate-200">
            📊 รวม {projects.length} โครงการ
          </span>
        </div>

        {/* Visual Segmented Progress Bar */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner p-0.5 gap-0.5">
            {completedProjects.length > 0 && (
              <div
                style={{ width: `${completedPct}%` }}
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 hover:opacity-90 cursor-pointer"
                title={`เสร็จสิ้น: ${completedProjects.length} โครงการ (${completedPct}%)`}
                onClick={() => setActiveStatusFilter('COMPLETED')}
              />
            )}
            {inProgressProjects.length > 0 && (
              <div
                style={{ width: `${inProgressPct}%` }}
                className="bg-[#003B71] h-full rounded-full transition-all duration-500 hover:opacity-90 cursor-pointer"
                title={`กำลังดำเนินการ: ${inProgressProjects.length} โครงการ (${inProgressPct}%)`}
                onClick={() => setActiveStatusFilter('IN_PROGRESS')}
              />
            )}
            {delayedProjects.length > 0 && (
              <div
                style={{ width: `${delayedPct}%` }}
                className="bg-amber-500 h-full rounded-full transition-all duration-500 hover:opacity-90 cursor-pointer"
                title={`ล่าช้า/ติดปัญหา: ${delayedProjects.length} โครงการ (${delayedPct}%)`}
                onClick={() => setActiveStatusFilter('DELAYED')}
              />
            )}
            {onHoldProjects.length > 0 && (
              <div
                style={{ width: `${onHoldPct}%` }}
                className="bg-slate-400 h-full rounded-full transition-all duration-500 hover:opacity-90 cursor-pointer"
                title={`พักชะลอ: ${onHoldProjects.length} โครงการ (${onHoldPct}%)`}
                onClick={() => setActiveStatusFilter('ON_HOLD')}
              />
            )}
          </div>
        </div>

        {/* 4 Clickable Status Filter Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Completed */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter(activeStatusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              activeStatusFilter === 'COMPLETED'
                ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-400/20'
                : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>เสร็จสิ้น / บรรลุ</span>
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {completedPct}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {completedProjects.length} <span className="text-xs font-bold text-slate-500">โครงการ</span>
            </div>
          </button>

          {/* In Progress */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter(activeStatusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              activeStatusFilter === 'IN_PROGRESS'
                ? 'bg-sky-50 border-[#003B71] shadow-md ring-2 ring-[#003B71]/20'
                : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#003B71] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#003B71]" />
                <span>กำลังดำเนินการ</span>
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-[#003B71] border border-sky-200">
                {inProgressPct}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {inProgressProjects.length} <span className="text-xs font-bold text-slate-500">โครงการ</span>
            </div>
          </button>

          {/* Delayed / Bottleneck */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter(activeStatusFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              activeStatusFilter === 'DELAYED'
                ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>ล่าช้า / ติดปัญหา</span>
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {delayedPct}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {delayedProjects.length} <span className="text-xs font-bold text-slate-500">โครงการ</span>
            </div>
          </button>

          {/* On Hold / Draft */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter(activeStatusFilter === 'ON_HOLD' ? 'ALL' : 'ON_HOLD')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              activeStatusFilter === 'ON_HOLD'
                ? 'bg-slate-100 border-slate-400 shadow-md ring-2 ring-slate-400/20'
                : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <PauseCircle className="w-4 h-4 text-slate-500" />
                <span>พักชะลอ / แบบร่าง</span>
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                {onHoldPct}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {onHoldProjects.length} <span className="text-xs font-bold text-slate-500">โครงการ</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ENHANCED EXECUTIVE SUMMARY CHARTS (กราฟสรุปข้อมูลสำหรับผู้บริหาร) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Donut Proportion */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#003B71]" />
                <span>สัดส่วนสถานะโครงการทั้งหมด (Status Distribution)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ร้อยละของการดำเนินงานจำแนกตาม 4 ระดับสถานะ
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              100%
            </span>
          </div>

          <div className="h-64 flex items-center justify-center relative my-2">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: '#334155',
                      font: { family: "'Prompt', 'Sarabun', sans-serif", size: 11, weight: 'bold' as const },
                      boxWidth: 12,
                      usePointStyle: true
                    }
                  }
                },
                cutout: '68%'
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-3xl font-black text-slate-900">{projects.length}</span>
              <span className="text-[11px] font-bold text-slate-500">โครงการรวม</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Progress & Spent Percentage by Department */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#003B71]" />
                <span>ความก้าวหน้าและการเบิกจ่ายตามภาควิชา (%)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                เปรียบเทียบผลงานจริง vs อัตราการเบิกจ่ายงบประมาณ
              </p>
            </div>
          </div>

          <div className="h-64 my-2">
            <Bar data={barData} options={commonChartOptions} />
          </div>
        </div>

        {/* Chart 3: Financial Allocation vs Spent in MB */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>งบประมาณจัดสรร vs เบิกจ่ายจริง (ล้านบาท)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                วิเคราะห์สภาพคล่องทางการเงินและการใช้จ่ายจริงตามภาควิชา
              </p>
            </div>
          </div>

          <div className="h-64 my-2">
            <Bar data={financeBarData} options={commonChartOptions} />
          </div>
        </div>

        {/* Chart 4: Quarterly OKR Trajectory Trend */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00A8B5]" />
                <span>แนวโน้มผลสัมฤทธิ์ OKR รายไตรมาส (Q1 - Q4)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                เปรียบเทียบความก้าวหน้าผลงานจริงกับเป้าหมายตามแผนยุทธศาสตร์
              </p>
            </div>
          </div>

          <div className="h-64 my-2">
            <Line data={lineData} options={commonChartOptions} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PROJECT LIST ACCORDING TO PROPORTION (รายชื่อโครงการพร้อมสถานะ) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                รายชื่อโครงการจำแนกตามสถานะผลสัมฤทธิ์
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#003B71] text-white">
                {displayedProjects.length} โครงการ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              แสดงชื่อโครงการ, ผู้รับผิดชอบ, ความคืบหน้า, งบประมาณ และสาเหตุข้อติดขัด
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({projects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  activeStatusFilter === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>เสร็จสิ้น</span> ({completedProjects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStatusFilter('IN_PROGRESS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  activeStatusFilter === 'IN_PROGRESS' ? 'bg-[#003B71] text-white shadow-sm' : 'text-[#003B71] hover:bg-sky-50'
                }`}
              >
                <span>ดำเนินการ</span> ({inProgressProjects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStatusFilter('DELAYED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  activeStatusFilter === 'DELAYED' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                <span>ล่าช้า</span> ({delayedProjects.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาโครงการ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
              />
            </div>
          </div>
        </div>

        {/* Project Cards Grid */}
        {displayedProjects.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-sm font-medium">
            ไม่พบโครงการที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedProjects.map((p) => {
              const isCompleted = p.progress_percentage === 100 || p.status === 'Completed'
              const isDelayed = p.status === 'Delayed' || (p.bottleneck && p.bottleneck.trim().length > 0)
              const spentRatio = Number(p.budget) > 0 ? ((Number(p.spent_amount) / Number(p.budget)) * 100).toFixed(1) : 0

              let statusBadge = {
                text: 'กำลังดำเนินการ',
                bg: 'bg-sky-50 text-[#003B71] border-sky-200',
                barColor: 'bg-[#003B71]',
                icon: Clock
              }

              if (isCompleted) {
                statusBadge = {
                  text: 'เสร็จสิ้น 100%',
                  bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  barColor: 'bg-emerald-500',
                  icon: CheckCircle2
                }
              } else if (isDelayed) {
                statusBadge = {
                  text: 'ล่าช้า / ติดปัญหา',
                  bg: 'bg-amber-50 text-amber-800 border-amber-200',
                  barColor: 'bg-amber-500',
                  icon: AlertTriangle
                }
              } else if (p.status === 'On Hold' || p.status === 'Draft') {
                statusBadge = {
                  text: 'พักชะลอ',
                  bg: 'bg-slate-100 text-slate-700 border-slate-200',
                  barColor: 'bg-slate-400',
                  icon: PauseCircle
                }
              }

              const StatusIcon = statusBadge.icon

              return (
                <div
                  key={p.project_id}
                  onClick={() => onSelectProject && onSelectProject(p)}
                  className="rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-[#003B71]/40 hover:shadow-md transition-all p-5 space-y-3.5 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    {/* Top row: Department and Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{formatDepartmentShort(p.department)}</span>
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 flex-shrink-0 ${statusBadge.bg}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusBadge.text}</span>
                      </span>
                    </div>

                    {/* Project Name */}
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#003B71] transition-colors leading-snug line-clamp-2">
                      {p.project_name}
                    </h4>

                    {/* Responsible Head */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>หัวหน้าโครงการ: </span>
                      <span className="font-bold text-slate-800">
                        {getUserFullName(p.head) || 'ผศ.ดร.สมชาย ใจดี'}
                      </span>
                    </div>
                  </div>

                  {/* Progress & Budget */}
                  <div className="space-y-2 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">ความคืบหน้า</span>
                      <span className="text-slate-900">{p.progress_percentage}%</span>
                    </div>

                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusBadge.barColor} rounded-full transition-all duration-300`}
                        style={{ width: `${p.progress_percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>งบประมาณ: <b>{Number(p.budget).toLocaleString()} บ.</b></span>
                      <span>เบิกจ่าย: <b className="text-slate-700">{Number(p.spent_amount).toLocaleString()} บ. ({spentRatio}%)</b></span>
                    </div>
                  </div>

                  {/* Bottleneck Warning Box if delayed */}
                  {p.bottleneck && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                      <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-900 block">ข้อติดขัด / ปัญหาที่ต้องเร่งรัด:</span>
                        <span>{p.bottleneck}</span>
                      </div>
                    </div>
                  )}

                  {/* Footer detail action */}
                  <div className="flex items-center justify-end text-xs font-bold text-[#003B71] group-hover:translate-x-0.5 transition-transform pt-1">
                    <span>คลิกเพื่อดูรายละเอียดโครงการ</span>
                    <ChevronRight className="w-4 h-4 ml-0.5" />
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
