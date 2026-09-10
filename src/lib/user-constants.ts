import { UserRole, UserProfile } from '@/types/database.types'
import {
  Crown,
  Layers,
  GraduationCap,
  Briefcase,
  Shield,
  User,
  type LucideIcon
} from 'lucide-react'

// =============================================================================
// ROLE CONFIGURATIONS & LABELS
// =============================================================================

export interface RoleConfigItem {
  value: UserRole
  label: string
  shortLabel: string
  color: string
  icon: LucideIcon
  emoji: string
}

export const ROLE_CONFIG: Record<UserRole, RoleConfigItem> = {
  admin: {
    value: 'admin',
    label: 'ผู้ดูแลระบบ (Admin)',
    shortLabel: 'Admin',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Shield,
    emoji: '🛡️'
  },
  executive: {
    value: 'executive',
    label: 'ผู้บริหารระดับสูง (Executive)',
    shortLabel: 'Executive',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Crown,
    emoji: '👑'
  },
  head_okr: {
    value: 'head_okr',
    label: 'หัวหน้าโครงการ OKR (Head OKR)',
    shortLabel: 'Head OKR',
    color: 'bg-sky-50 text-[#003B71] border-sky-200',
    icon: Layers,
    emoji: '🎯'
  },
  teacher: {
    value: 'teacher',
    label: 'อาจารย์ลูกทีม (Teacher / Member)',
    shortLabel: 'Teacher',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: GraduationCap,
    emoji: '🎓'
  },
  staff: {
    value: 'staff',
    label: 'บุคลากรทั่วไป (Staff)',
    shortLabel: 'Staff',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Briefcase,
    emoji: '📋'
  }
}

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'teacher', label: ROLE_CONFIG.teacher.label },
  { value: 'head_okr', label: ROLE_CONFIG.head_okr.label },
  { value: 'executive', label: ROLE_CONFIG.executive.label },
  { value: 'staff', label: ROLE_CONFIG.staff.label },
  { value: 'admin', label: ROLE_CONFIG.admin.label }
]

export function getRoleBadge(role?: string | null): RoleConfigItem {
  if (role && role in ROLE_CONFIG) {
    return ROLE_CONFIG[role as UserRole]
  }
  return {
    value: (role as UserRole) || 'teacher',
    label: role || 'ผู้ใช้งาน',
    shortLabel: role || 'User',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: User,
    emoji: '👤'
  }
}

export const DEFAULT_ROLE_POSITIONS: Record<UserRole, string> = {
  teacher: 'อาจารย์ประจำภาควิชา',
  head_okr: 'หัวหน้าโครงการ OKR',
  executive: 'ผู้บริหารระดับสูง',
  staff: 'เจ้าหน้าที่ / บุคลากรทั่วไป',
  admin: 'ผู้ดูแลระบบ'
}

// =============================================================================
// DEPARTMENTS
// =============================================================================

export const DEPARTMENT_OPTIONS: string[] = [
  'ภาควิชาวิทยาการคอมพิวเตอร์',
  'ภาควิชาเคมี',
  'ภาควิชาชีววิทยา',
  'ภาควิชาฟิสิกส์',
  'ภาควิชาคณิตศาสตร์',
  'สำนักงานคณบดี'
]

export const DEFAULT_DEPARTMENT = DEPARTMENT_OPTIONS[0]

// =============================================================================
// AVATARS
// =============================================================================

export const PRESET_AVATARS: string[] = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
]

export const DEFAULT_AVATAR = PRESET_AVATARS[0]

// =============================================================================
// USER UTILITIES
// =============================================================================

/** Format full name from user record, falling back appropriately */
export function getUserFullName(user?: {
  first_name?: string | null
  last_name?: string | null
  name?: string | null
} | null): string {
  if (!user) return 'ไม่ระบุชื่อ'
  const first = user.first_name?.trim() || ''
  const last = user.last_name?.trim() || ''
  if (first || last) {
    return `${first} ${last}`.trim()
  }
  return user.name?.trim() || 'ไม่ระบุชื่อ'
}

/** Split a full name into first and last name components */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  if (!trimmed) {
    return { firstName: '', lastName: '' }
  }
  const parts = trimmed.split(/\s+/)
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''
  return { firstName, lastName }
}

/** Case-insensitive fuzzy search across all user identity fields */
export function filterUsersBySearchQuery(users: UserProfile[], query: string): UserProfile[] {
  const term = query.toLowerCase().trim()
  if (!term) return users

  return users.filter(u => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
    const name = (u.name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const username = (u.username || '').toLowerCase()
    const dept = (u.department || '').toLowerCase()
    const pos = (u.position || '').toLowerCase()

    return (
      name.includes(term) ||
      fullName.includes(term) ||
      email.includes(term) ||
      username.includes(term) ||
      dept.includes(term) ||
      pos.includes(term)
    )
  })
}

/** Safely format a department name by stripping "ภาควิชา" prefix without crashing on null/undefined */
export function formatDepartmentShort(dept?: string | null): string {
  if (!dept) return 'ส่วนกลาง'
  return dept.replace('ภาควิชา', '').trim() || 'ส่วนกลาง'
}

/** Safely format ISO date string into Thai locale date without throwing on invalid date */
export function formatThaiDate(dateStr?: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('th-TH', options)
  } catch {
    return '-'
  }
}

/** Strip academic ranks/titles (ยศ/คำนำหน้าทางวิชาการ) and role tags from name string */
export function removeTitlesAndRoles(name: string): string {
  if (!name) return ''
  return name
    .replace(/\[.*?\]\s*/g, '')
    .replace(/^(ศ\.|รศ\.|ผศ\.|อ\.|ดร\.)+(\s*(ศ\.|รศ\.|ผศ\.|อ\.|ดร\.))*\s*/gi, '')
    .replace(/^อาจารย์\s*/g, '')
    .trim()
}

