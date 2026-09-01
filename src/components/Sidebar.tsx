'use client'

import React from 'react'
import { useRole } from '@/components/RoleContext'
import { SDULogo } from '@/components/SDULogo'
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
  GraduationCap,
  FilePlus,
  FileSpreadsheet,
  FileText,
  UserCheck,
  KeyRound,
  User
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const { currentUser, allUsers, switchUser, currentRole, logout, pendingCount, openChangePasswordModal, openProfileModal } = useRole()

  if (!currentUser) return null

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'ผู้ดูแลระบบ (Admin)', color: 'bg-rose-50 text-rose-700 border-rose-200' }
      case 'executive':
        return { label: 'ผู้บริหารระดับสูง (Executive)', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      case 'head_okr':
        return { label: 'หัวหน้าโครงการ OKR', color: 'bg-sky-50 text-[#003B71] border-sky-200' }
      case 'teacher':
        return { label: 'อาจารย์ลูกทีมโครงการ OKR', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      case 'staff':
        return { label: 'บุคลากรทั่วไป (Staff)', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      default:
        return { label: role, color: 'bg-slate-50 text-slate-700 border-slate-200' }
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
          { id: 'team_evidences', label: 'หลักฐานจากลูกทีม', icon: FileCheck2, highlight: true },
          { id: 'create_dashboard', label: 'สร้าง Dashboard สำหรับผู้บริหาร', icon: FilePlus },
          { id: 'create_normal_report', label: 'สร้างรายงานทั่วไป', icon: FileSpreadsheet },
          { id: 'normal_reports', label: 'Report โครงการ OKR', icon: FileText },
          { id: 'projects', label: 'โครงการในภาควิชา', icon: FolderGit2 },
          { id: 'okrs', label: 'เป้าหมาย OKR คณะ', icon: Target },
          { id: 'evidences', label: 'คลังหลักฐานทั้งหมด', icon: FileCheck2 },
        ]
      case 'teacher':
        return [
          { id: 'workspace', label: 'โครงการที่ได้รับมอบหมาย', icon: GraduationCap },
          { id: 'normal_reports', label: 'Report โครงการ OKR', icon: FileText },
          { id: 'evidences', label: 'แนบและดูหลักฐาน', icon: FileCheck2 },
          { id: 'okrs', label: 'เป้าหมาย OKR คณะ', icon: Target },
        ]
      case 'admin':
        return [
          {
            id: 'pending_users',
            label: 'อนุมัติผู้สมัครใหม่',
            icon: UserCheck,
            badge: pendingCount > 0 ? pendingCount : undefined,
            highlight: pendingCount > 0
          },
          { id: 'users', label: 'จัดการสิทธิ์ผู้ใช้งาน (RBAC)', icon: Users },
          { id: 'normal_reports', label: 'Report โครงการ OKR', icon: FileText },
          { id: 'projects', label: 'จัดการโครงการทั้งหมด', icon: FolderGit2 },
          { id: 'okrs', label: 'จัดการเป้าหมาย OKR', icon: Target },
          { id: 'evidences', label: 'คลังหลักฐานระบบ', icon: FileCheck2 },
        ]
      case 'staff':
      default:
        return [
          { id: 'dashboard', label: 'ภาพรวมระบบ (Dashboard)', icon: LayoutDashboard },
          { id: 'normal_reports', label: 'Report โครงการ OKR', icon: FileText },
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ease-in-out shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <SDULogo size="md" textColor="dark" showText={true} />

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 lg:hidden"
            aria-label="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Profile Card */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div
            onClick={openProfileModal}
            className="flex items-center gap-3 p-2 -m-2 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
            title="คลิกเพื่อดูและแก้ไขโปรไฟล์"
          >
            <div className="relative">
              <img
                src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt="Profile"
                className="w-11 h-11 rounded-full object-cover border-2 border-[#003B71]/30 shadow-sm group-hover:border-[#003B71] transition-all"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#003B71] text-white flex items-center justify-center text-[9px] shadow-sm">
                ✎
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-[#003B71] transition-colors">
                  {currentUser?.first_name || 'ผู้ใช้งาน'} {currentUser?.last_name || ''}
                </h2>
              </div>
              <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleInfo.color}`}>
                {roleInfo.label}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openProfileModal}
            className="mt-3 w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-[#003B71]/10 text-slate-700 hover:text-[#003B71] text-xs font-bold border border-slate-200 hover:border-[#003B71]/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
            title="แก้ไขชื่อ รูปโปรไฟล์ และข้อมูลส่วนตัว"
          >
            <User className="w-3.5 h-3.5 text-[#003B71]" />
            <span>ดูและแก้ไขโปรไฟล์</span>
          </button>
        </div>

        {/* Fast Role Switcher */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#003B71]" />
            สลับบัญชีทดสอบ (Role Switcher)
          </label>
          <select
            value={currentUser?.user_id || ''}
            onChange={(e) => switchUser(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#003B71] focus:ring-1 focus:ring-[#003B71]"
          >
            {allUsers.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                [{u.role}] {u.first_name} ({u.position || u.department})
              </option>
            ))}
          </select>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-[#003B71] text-white shadow-md shadow-[#003B71]/20'
                    : item.highlight
                    ? 'bg-sky-50 text-[#003B71] hover:bg-sky-100 border border-sky-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-[#00A8B5]' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {(item as any).badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black leading-none ${
                      isActive ? 'bg-white text-[#003B71]' : 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                    }`}>
                      {(item as any).badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white flex-shrink-0 ml-1" />}
                </div>
              </button>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  )
}
