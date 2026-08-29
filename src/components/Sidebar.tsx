'use client'

import React from 'react'
import { useRole } from '@/components/RoleContext'
import {
  LayoutDashboard,
  Target,
  FolderGit2,
  FileCheck2,
  Users,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  LogOut,
  X,
  Crown,
  Layers,
  GraduationCap
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const { currentUser, allUsers, switchUser, currentRole, logout } = useRole()

  if (!currentUser) return null

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'ผู้ดูแลระบบ (Admin)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
      case 'executive':
        return { label: 'ผู้บริหารระดับสูง (Executive)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
      case 'head_okr':
        return { label: 'หัวหน้าโครงการ OKR', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' }
      case 'teacher':
        return { label: 'อาจารย์ลูกทีมโครงการ OKR', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
      case 'staff':
        return { label: 'บุคลากรทั่วไป (Staff)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
      default:
        return { label: role, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
    }
  }

  const roleInfo = getRoleBadge(currentRole || currentUser.role || 'teacher')

  const getMenuItems = () => {
    switch (currentRole) {
      case 'executive':
        return [
          { id: 'workspace', label: 'แผงยุทธศาสตร์ผู้บริหาร', icon: Crown },
          { id: 'analytics', label: 'การวิเคราะห์ภาพรวมคณะ', icon: Building2 },
          { id: 'okrs', label: 'เป้าหมาย OKR คณะ', icon: Target },
          { id: 'projects', label: 'โครงการทั้งหมด (Read-Only)', icon: FolderGit2 },
          { id: 'evidences', label: 'คลังเอกสารผลสัมฤทธิ์', icon: FileCheck2 },
        ]
      case 'head_okr':
        return [
          { id: 'workspace', label: 'พื้นที่บริหารโครงการ OKR', icon: Layers },
          { id: 'projects', label: 'โครงการในภาควิชา', icon: FolderGit2 },
          { id: 'okrs', label: 'เป้าหมาย OKR คณะ', icon: Target },
          { id: 'evidences', label: 'หลักฐานการดำเนินงาน', icon: FileCheck2 },
        ]
      case 'teacher':
        return [
          { id: 'workspace', label: 'โครงการที่ได้รับมอบหมาย', icon: GraduationCap },
          { id: 'evidences', label: 'แนบและดูหลักฐาน', icon: FileCheck2 },
          { id: 'okrs', label: 'เป้าหมาย OKR คณะ', icon: Target },
        ]
      case 'admin':
        return [
          { id: 'workspace', label: 'แผงควบคุมระบบ (Admin Center)', icon: ShieldCheck },
          { id: 'users', label: 'จัดการสิทธิ์ผู้ใช้งาน (RBAC)', icon: Users },
          { id: 'projects', label: 'จัดการโครงการทั้งหมด', icon: FolderGit2 },
          { id: 'okrs', label: 'จัดการเป้าหมาย OKR', icon: Target },
          { id: 'evidences', label: 'คลังหลักฐานระบบ', icon: FileCheck2 },
        ]
      case 'staff':
      default:
        return [
          { id: 'dashboard', label: 'ภาพรวมระบบ (Dashboard)', icon: LayoutDashboard },
          { id: 'projects', label: 'โครงการและภารกิจ', icon: FolderGit2 },
          { id: 'evidences', label: 'หลักฐานการดำเนินงาน', icon: FileCheck2 },
          { id: 'okrs', label: 'เป้าหมาย OKR คณะ', icon: Target },
        ]
    }
  }

  const menuItems = getMenuItems()

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId)
    onClose()
  }

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-navy-950/95 backdrop-blur-2xl border-r border-white/10 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-glow-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-tight">ระบบติดตาม OKR</h1>
              <p className="text-[11px] text-sky-400 font-medium">คณะวิทยาศาสตร์</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <img
              src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border border-sky-400/50 shadow-md"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-semibold text-white truncate">
                {currentUser?.first_name || 'ผู้ใช้งาน'} {currentUser?.last_name || ''}
              </h2>
              <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleInfo.color}`}>
                {roleInfo.label}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-white/10 bg-slate-900/40">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3 text-sky-400" />
            สลับบทบาท (Role Switcher)
          </label>
          <select
            value={currentUser?.user_id || ''}
            onChange={(e) => switchUser(e.target.value)}
            className="w-full bg-slate-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
          >
            {allUsers.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                [{u.role}] {u.first_name} ({u.position || u.department})
              </option>
            ))}
          </select>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/10 text-sky-300 border border-sky-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-400" />}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/20 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  )
}
