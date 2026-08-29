'use client'

import React, { useState } from 'react'
import { OKR, UserProfile } from '@/types/database.types'
import { X, FolderPlus, CheckCircle } from 'lucide-react'
import { mockDepartments } from '@/lib/mock-data'
import { createProjectRecord } from '@/lib/services/okr-service'

interface CreateProjectModalProps {
  okrs: OKR[]
  users: UserProfile[]
  onClose: () => void
  onCreated: () => void
}

export function CreateProjectModal({ okrs, users, onClose, onCreated }: CreateProjectModalProps) {
  const [okrId, setOkrId] = useState(okrs[0]?.okr_id || '')
  const [projectName, setProjectName] = useState('')
  const [projectType, setProjectType] = useState('งานวิจัยขั้นแนวหน้า')
  const [department, setDepartment] = useState('ภาควิชาวิทยาการคอมพิวเตอร์')
  const [headId, setHeadId] = useState(users[3]?.user_id || users[0]?.user_id || '')
  const [budget, setBudget] = useState(500000)
  const [mainObjective, setMainObjective] = useState('')
  const [subObjective, setSubObjective] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('2024-01-01')
  const [endDate, setEndDate] = useState('2024-12-31')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return

    setIsSubmitting(true)
    await createProjectRecord({
      okr_id: okrId,
      project_name: projectName,
      project_type: projectType,
      department: department,
      head_of_project: headId,
      budget: Number(budget),
      main_objective: mainObjective,
      sub_objective: subObjective,
      description: description,
      start_date: startDate,
      end_date: endDate
    })

    setIsSubmitting(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl border border-white/15 shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <FolderPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">ป้อนโครงการ OKR ใหม่</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
              เป้าหมายหลัก OKR *
            </label>
            <select
              value={okrId}
              onChange={(e) => setOkrId(e.target.value)}
              required
              className="w-full glass-input rounded-xl px-3 py-2 bg-slate-900 text-white text-xs"
            >
              {okrs.map((okr) => (
                <option key={okr.okr_id} value={okr.okr_id} className="bg-slate-900 text-white">
                  [{okr.year}] {okr.okr_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
              ชื่อโครงการ *
            </label>
            <input
              type="text"
              placeholder="ระบุชื่อโครงการ..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className="w-full glass-input rounded-xl px-3 py-2 text-xs placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px]">ประเภทโครงการ</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 bg-slate-900 text-white text-xs"
              >
                <option value="งานวิจัยขั้นแนวหน้า" className="bg-slate-900 text-white">งานวิจัยขั้นแนวหน้า</option>
                <option value="งานวิจัยนวัตกรรม" className="bg-slate-900 text-white">งานวิจัยนวัตกรรม</option>
                <option value="พัฒนาหลักสูตร" className="bg-slate-900 text-white">พัฒนาหลักสูตร</option>
                <option value="บริการวิชาการเพื่อสังคม" className="bg-slate-900 text-white">บริการวิชาการเพื่อสังคม</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px]">ภาควิชา *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 bg-slate-900 text-white text-xs"
              >
                {mockDepartments.filter(d => d !== 'ทั้งหมด').map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-900 text-white">
                    {dept.replace('ภาควิชา', '')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                อาจารย์หัวหน้าโครงการ *
              </label>
              <select
                value={headId}
                onChange={(e) => setHeadId(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2 bg-slate-900 text-white text-xs"
              >
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id} className="bg-slate-900 text-white">
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                งบประมาณ (บาท) *
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                required
                className="w-full glass-input rounded-xl px-3 py-2 text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
              เป้าหมายและตัวชี้วัด (Key Results)
            </label>
            <textarea
              rows={2}
              placeholder="ระบุตัวชี้วัดความสำเร็จ..."
              value={mainObjective}
              onChange={(e) => setMainObjective(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-1.5 text-xs placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-primary flex items-center gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
