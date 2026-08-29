'use client'

import React, { useState } from 'react'
import { useRole } from '@/components/RoleContext'
import { UserRole } from '@/types/database.types'
import { ShieldCheck, UserCheck, Crown, Layers, GraduationCap, FileBarChart, ArrowRight, Lock, Mail, KeyRound, Sparkles } from 'lucide-react'

export function LoginPage() {
  const { login, quickLogin } = useRole()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('executive')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const rolesConfig: {
    role: UserRole
    title: string
    subtitle: string
    description: string
    icon: any
    color: string
    badgeColor: string
    demoEmail: string
    sampleUser: string
  }[] = [
    {
      role: 'executive',
      title: 'ผู้บริหารระดับสูง (Executive)',
      subtitle: 'คณบดี / รองคณบดีฝ่ายวิชาการ',
      description: 'ดูภาพรวม KPI ทั้งคณะ, ติดตามงบประมาณ, แนวโน้ม และ Export รายงานผู้บริหาร',
      icon: Crown,
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      demoEmail: 'dean@science.ac.th',
      sampleUser: 'ศ.ดร.ประสิทธิ์ พัฒนาวิทย์'
    },
    {
      role: 'admin',
      title: 'ผู้ดูแลระบบ (Admin)',
      subtitle: 'ฝ่ายเทคโนโลยีสารสนเทศส่วนกลาง',
      description: 'จัดการผู้ใช้งาน, กำหนดสิทธิ์ RLS, ควบคุมความปลอดภัย และตรวจสอบระบบ',
      icon: ShieldCheck,
      color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      demoEmail: 'admin@science.ac.th',
      sampleUser: 'ผู้ดูแลระบบ ส่วนกลาง'
    },
    {
      role: 'head_okr',
      title: 'หัวหน้าโครงการ OKR (Head of OKR)',
      subtitle: 'หัวหน้าภาควิชา / ประธานโครงการ',
      description: 'ป้อนโครงการใหม่, กำหนดเป้าหมายยุทธศาสตร์, จัดสรรงบประมาณ และมอบหมายลูกทีม',
      icon: Layers,
      color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      demoEmail: 'head.cs@science.ac.th',
      sampleUser: 'ผศ.ดร.สมชาย ใจดี'
    },
    {
      role: 'teacher',
      title: 'อาจารย์ลูกทีมโครงการ OKR',
      subtitle: 'อาจารย์ผู้ร่วมรับผิดชอบโครงการ',
      description: 'รายงานผลความก้าวหน้าโครงการที่ได้รับมอบหมาย, แจ้งปัญหา/อุปสรรค และแนบหลักฐาน',
      icon: GraduationCap,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      demoEmail: 'teacher.cs1@science.ac.th',
      sampleUser: 'อ.ดร.กานดา สุขสมบัติ'
    },
    {
      role: 'staff',
      title: 'บุคลากรทั่วไป (Staff)',
      subtitle: 'เจ้าหน้าที่วิเคราะห์นโยบายและแผน',
      description: 'เข้าดูรายงานความก้าวหน้าภาควิชา และสืบค้นคลังเอกสารหลักฐานผลสัมฤทธิ์',
      icon: FileBarChart,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      demoEmail: 'staff.plan@science.ac.th',
      sampleUser: 'น.ส.วิภาดา นโยบายดี'
    }
  ]

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    const success = await login(email, selectedRole)
    if (!success) {
      setErrorMsg('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบอีเมลหรือเลือกบทบาทเพื่อเข้าสู่ระบบทดสอบ')
    }
    setLoading(false)
  }

  const handleSelectRoleCard = (role: UserRole, demoEmail: string) => {
    setSelectedRole(role)
    setEmail(demoEmail)
    quickLogin(role)
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center p-4 sm:p-6 md:p-10 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-5xl z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            ระบบพิสูจน์สิทธิ์และแยกพื้นที่ทำงานตามบทบาท (RBAC)
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
            ระบบติดตาม OKR คณะวิทยาศาสตร์
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            เลือกบทบาทของคุณ หรือเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัยเพื่อเข้าสู่หน้าจอการทำงานเฉพาะบุคคล
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>เลือกบทบาทเพื่อเข้าสู่ระบบทันที (1-Click Fast Login)</span>
              <span className="text-sky-400">5 บทบาท</span>
            </div>

            <div className="space-y-2.5">
              {rolesConfig.map((item) => {
                const Icon = item.icon
                const isSelected = selectedRole === item.role
                return (
                  <div
                    key={item.role}
                    onClick={() => handleSelectRoleCard(item.role, item.demoEmail)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer bg-gradient-to-r ${item.color} ${
                      isSelected
                        ? 'border-sky-400 shadow-glow-primary scale-[1.01]'
                        : 'hover:border-white/20 hover:scale-[1.005]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs sm:text-sm font-bold text-white">
                              {item.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.badgeColor}`}>
                              {item.subtitle}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                            {item.description}
                          </p>
                          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                            <span>ผู้ใช้จำลอง: <b className="text-white">{item.sampleUser}</b></span>
                            <span>•</span>
                            <span className="font-mono text-sky-300">{item.demoEmail}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-all flex-shrink-0 self-center"
                      >
                        <span>เข้าใช้งาน</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">เข้าสู่ระบบด้วยอีเมล</h2>
                  <p className="text-[11px] text-slate-400">สำหรับบุคลากรคณะวิทยาศาสตร์</p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs mb-4">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCustomLogin} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                    อีเมลมหาวิทยาลัย (Email)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="เช่น dean@science.ac.th"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                    รหัสผ่าน (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                    เข้าใช้งานในบทบาท (Assigned Role)
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs bg-slate-900 text-white cursor-pointer"
                  >
                    <option value="executive" className="bg-slate-900 text-white">ผู้บริหารระดับสูง (Executive)</option>
                    <option value="admin" className="bg-slate-900 text-white">ผู้ดูแลระบบ (Admin)</option>
                    <option value="head_okr" className="bg-slate-900 text-white">หัวหน้าโครงการ OKR (Head of OKR)</option>
                    <option value="teacher" className="bg-slate-900 text-white">อาจารย์ลูกทีมโครงการ OKR (Teacher)</option>
                    <option value="staff" className="bg-slate-900 text-white">บุคลากรทั่วไป (Staff)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-glow-primary transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}</span>
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-white/10 text-[10px] text-slate-400 text-center">
                ระบบรักษาความปลอดภัยเชื่อมต่อ Supabase Row Level Security (RLS)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
