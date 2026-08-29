'use client'

import React from 'react'
import { Calendar, Download, RefreshCw, Filter, Menu } from 'lucide-react'

interface HeaderProps {
  selectedYear: number
  setSelectedYear: (year: number) => void
  selectedQuarter: string
  setSelectedQuarter: (quarter: string) => void
  onRefresh: () => void
  onExportPDF: () => void
  onToggleMobileMenu: () => void
  isRefreshing?: boolean
}

export function Header({
  selectedYear,
  setSelectedYear,
  selectedQuarter,
  setSelectedQuarter,
  onRefresh,
  onExportPDF,
  onToggleMobileMenu,
  isRefreshing
}: HeaderProps) {
  return (
    <header className="glass-panel sticky top-0 z-20 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white lg:hidden"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
              ระบบติดตาม OKR คณะวิทยาศาสตร์
            </h1>
            <p className="text-[11px] text-slate-400">
              ปีงบประมาณและการศึกษา {selectedYear} ({selectedQuarter})
            </p>
          </div>
        </div>

        <button
          onClick={onExportPDF}
          className="sm:hidden p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30"
          title="Export PDF"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900/70 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs flex-1 sm:flex-none justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px]">ปี:</span>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value={2567} className="bg-slate-900 text-white">2567</option>
            <option value={2566} className="bg-slate-900 text-white">2566</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/70 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs flex-1 sm:flex-none justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px]">ไตรมาส:</span>
          </div>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-white">ทุกไตรมาส</option>
            <option value="Q1" className="bg-slate-900 text-white">Q1</option>
            <option value="Q2" className="bg-slate-900 text-white">Q2</option>
            <option value="Q3" className="bg-slate-900 text-white">Q3</option>
            <option value="Q4" className="bg-slate-900 text-white">Q4</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-all flex items-center gap-1.5"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          <span className="hidden sm:inline">รีเฟรช</span>
        </button>

        <button
          onClick={onExportPDF}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-primary transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export PDF</span>
        </button>
      </div>
    </header>
  )
}
