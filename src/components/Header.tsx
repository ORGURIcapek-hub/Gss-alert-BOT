'use client'

import React from 'react'
import { Calendar, Filter, Menu, Bell } from 'lucide-react'
import { useRole } from '@/components/RoleContext'
import { SDULogo } from '@/components/SDULogo'
import { getRoleBadge } from '@/lib/user-constants'

interface HeaderProps {
  selectedYear: number
  setSelectedYear: (year: number) => void
  selectedQuarter: string
  setSelectedQuarter: (quarter: string) => void
  onRefresh?: () => void
  onToggleMobileMenu: () => void
  onNavigateTab?: (tab: string) => void
  isRefreshing?: boolean
}

export function Header({
  selectedYear,
  setSelectedYear,
  selectedQuarter,
  setSelectedQuarter,
  onRefresh,
  onToggleMobileMenu,
  onNavigateTab,
  isRefreshing
}: HeaderProps) {
  const { currentRole, pendingCount } = useRole()
  const isAdmin = currentRole === 'admin'
  const roleInfo = getRoleBadge(currentRole)

  return (
    <header className="bg-white sticky top-0 z-20 px-4 sm:px-8 py-3 sm:py-4 flex flex-col gap-3 sm:gap-4 border-b border-slate-200 shadow-sm">
      {/* Row 1: menu + title + role badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 lg:hidden transition-colors active:scale-95"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <SDULogo size="sm" showText={false} className="hidden sm:flex" />
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
              ระบบติดตามและประเมินผล OKR
            </h1>
          </div>
        </div>

        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xs flex-shrink-0 ${roleInfo.color}`}>
          <span>{roleInfo.emoji}</span>
          <span className="opacity-80">สิทธิ์ปี {selectedYear}:</span>
          <span className="font-extrabold">{roleInfo.shortLabel}</span>
        </div>
      </div>

      {/* Row 2: filters + notifications */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {isAdmin && pendingCount > 0 && (
          <button
            onClick={() => onNavigateTab?.('pending_users')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 transition-all animate-pulse cursor-pointer border border-amber-300/40 flex-1 sm:flex-none justify-center"
            title="มีคำขอสิทธิ์การเข้าใช้งานใหม่จากผู้สมัครสมาชิก คลิกเพื่อตรวจสอบและอนุมัติ"
          >
            <Bell className="w-3.5 h-3.5 fill-white animate-bounce" />
            <span>คำขอสิทธิ์ใหม่ ({pendingCount})</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs flex-1 sm:flex-none justify-between sm:justify-start min-w-0">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#003B71]" />
            <span>ปีงบประมาณ:</span>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer pl-1 min-w-0"
          >
            <option value={2568}>2568</option>
            <option value={2569}>2569</option>
            <option value={2570}>2570</option>
            <option value={2571}>2571</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs flex-1 sm:flex-none justify-between sm:justify-start min-w-0">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#00A8B5]" />
            <span>ไตรมาส:</span>
          </div>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="bg-transparent text-slate-900 text-xs font-bold focus:outline-none cursor-pointer pl-1 min-w-0 max-w-[118px] sm:max-w-none truncate"
          >
            <option value="ALL">ทุกไตรมาส</option>
            <option value="Q1">ไตรมาส 1 (Q1)</option>
            <option value="Q2">ไตรมาส 2 (Q2)</option>
            <option value="Q3">ไตรมาส 3 (Q3)</option>
            <option value="Q4">ไตรมาส 4 (Q4)</option>
          </select>
        </div>
      </div>
    </header>
  )
}
