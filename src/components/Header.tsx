'use client'

import React from 'react'
import { Calendar, Download, Filter, Menu, KeyRound } from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { SDULogo } from '@/components/SDULogo'

interface HeaderProps {
  selectedYear: number
  setSelectedYear: (year: number) => void
  selectedQuarter: string
  setSelectedQuarter: (quarter: string) => void
  onRefresh?: () => void
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
  const { currentRole, openChangePasswordModal } = useRole()
  const isAdmin = currentRole === 'admin'

  return (
    <header className="bg-white sticky top-0 z-20 px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 lg:hidden transition-colors"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <SDULogo size="sm" showText={false} className="hidden sm:flex" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                ระบบติดตามและประเมินผล OKR
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                มหาวิทยาลัยสวนดุสิต • ปีงบประมาณ {selectedYear} {!isAdmin && `(${selectedQuarter === 'ALL' ? 'ทุกไตรมาส' : selectedQuarter})`}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Export button (hidden for admin) */}
        {!isAdmin && (
          <button
            onClick={onExportPDF}
            className="sm:hidden p-2.5 rounded-xl bg-[#003B71]/10 text-[#003B71] border border-[#003B71]/20 font-bold"
            title="Export PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {/* Fiscal Year Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs flex-1 sm:flex-none justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-[#003B71]" />
            <span>ปีงบประมาณ:</span>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer pl-1"
          >
            <option value={2567}>2567</option>
            <option value={2566}>2566</option>
          </select>
        </div>

        {/* Quarter Selector - Completely hidden for Admin */}
        {!isAdmin && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs flex-1 sm:flex-none justify-between sm:justify-start">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <Filter className="w-3.5 h-3.5 text-[#00A8B5]" />
              <span>ไตรมาส:</span>
            </div>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer pl-1"
            >
              <option value="ALL">ทุกไตรมาส</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
        )}



        {/* Change Password Button */}
        <button
          type="button"
          onClick={openChangePasswordModal}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#003B71] transition-all flex items-center gap-1.5 cursor-pointer"
          title="เปลี่ยนรหัสผ่านของตนเอง"
        >
          <KeyRound className="w-3.5 h-3.5 text-[#003B71]" />
          <span className="hidden sm:inline">เปลี่ยนรหัสผ่าน</span>
        </button>

        {/* Export PDF Button - Completely hidden for Admin */}
        {!isAdmin && (
          <button
            onClick={onExportPDF}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#003B71] to-[#005B94] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#003B71]/15 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        )}
      </div>
    </header>
  )
}
