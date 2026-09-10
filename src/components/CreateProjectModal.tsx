'use client'

import React, { useState, useEffect } from 'react'
import { OKR, UserProfile } from '@/types/database.types'
import { X, FolderPlus, CheckCircle } from 'lucide-react'
import { mockDepartments } from '@/lib/mock-data'
import { createProjectRecord, assignProjectRole } from '@/lib/services/okr-service'
import { getUserFullName, formatDepartmentShort, removeTitlesAndRoles } from '@/lib/user-constants'
import { useRole } from '@/components/RoleContext'

interface CreateProjectModalProps {
  okrs: OKR[]
  users: UserProfile[]
  onClose: () => void
  onCreated: () => void
}

export function CreateProjectModal({ okrs, users, onClose, onCreated }: CreateProjectModalProps) {
  const { currentRole, currentUser } = useRole()
  const isTeacher = currentRole === 'teacher'

  // Only head_okr, staff, and teacher can be project heads (exclude admin and executive)
  const eligibleHeads = users.filter(u => u.role !== 'admin' && u.role !== 'executive')

  const [okrId, setOkrId] = useState(okrs[0]?.okr_id || '')
  const [projectName, setProjectName] = useState('')
  const [projectType, setProjectType] = useState('งานวิจัยขั้นแนวหน้า')
  const [department, setDepartment] = useState('ภาควิชาวิทยาการคอมพิวเตอร์')
  const [headId, setHeadId] = useState(() => {
    if (currentUser && eligibleHeads.some(u => u.user_id === currentUser.user_id)) {
      return currentUser.user_id
    }
    return eligibleHeads[0]?.user_id || ''
  })
  const [budget, setBudget] = useState<number | string>(500000)
  const [mainObjective, setMainObjective] = useState('')
  const [subObjective, setSubObjective] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('2024-01-01')
  const [endDate, setEndDate] = useState('2024-12-31')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (eligibleHeads.length > 0 && !eligibleHeads.some(u => u.user_id === headId)) {
      setHeadId(eligibleHeads[0].user_id)
    }
  }, [users, headId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim()) return

    setIsSubmitting(true)
    const createdProj = await createProjectRecord({
      okr_id: okrId,
      project_name: projectName,
      project_type: projectType,
      department: department,
      head_of_project: headId,
      budget: Number(budget) || 0,
      main_objective: mainObjective,
      sub_objective: subObjective,
      description: description,
      start_date: startDate,
      end_date: endDate
    })

    // If the creator is not the chosen head, automatically assign creator as project Member
    if (currentUser && currentUser.user_id !== headId && createdProj) {
      await assignProjectRole({
        project_id: createdProj.project_id,
        user_id: currentUser.user_id,
        role_type: 'Member',
        assigned_by: currentUser.user_id
      })
    }

    setIsSubmitting(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto custom-scrollbar relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#003B71] flex items-center justify-center font-bold">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">ป้อนโครงการ OKR ใหม่</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1 text-xs">
              ชื่อโครงการ *
            </label>
            <input
              type="text"
              placeholder="ระบุชื่อโครงการ..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                ประเภทโครงการ *
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
              >
                <option value="งานวิจัยขั้นแนวหน้า">งานวิจัยขั้นแนวหน้า</option>
                <option value="งานวิจัยนวัตกรรม">งานวิจัยนวัตกรรม</option>
                <option value="พัฒนาโครงสร้างพื้นฐาน">พัฒนาโครงสร้างพื้นฐาน</option>
                <option value="บริการวิชาการเพื่อสังคม">บริการวิชาการเพื่อสังคม</option>
                <option value="พัฒนาบุคลากร">พัฒนาบุคลากร</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                ภาควิชา / หน่วยงาน *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
              >
                {mockDepartments.filter(d => d !== 'ทั้งหมด').map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                หัวหน้าโครงการ (Head) *
              </label>
              <select
                value={headId}
                onChange={(e) => setHeadId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
              >
                {eligibleHeads.length === 0 ? (
                  <option value="">-- ไม่พบบุคลากรที่มีสิทธิ์เป็นหัวหน้าโครงการ --</option>
                ) : (
                  eligibleHeads.map((u) => {
                    const rawName = getUserFullName(u)
                    const displayName = isTeacher ? removeTitlesAndRoles(rawName) : rawName
                    return (
                      <option key={u.user_id} value={u.user_id}>
                        {displayName} ({formatDepartmentShort(u.department)})
                      </option>
                    )
                  })
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                งบประมาณโครงการ (บาท) *
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => {
                  const val = e.target.value
                  setBudget(val === '' ? '' : Number(val))
                }}
                onFocus={() => {
                  if (budget === 0 || budget === '0') setBudget('')
                }}
                onBlur={() => {
                  if (budget === '' || isNaN(Number(budget))) setBudget(0)
                }}
                placeholder="0"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#003B71]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1 text-xs">
              เป้าหมายหลัก (Main Objective / ตัวชี้วัดสำคัญ) *
            </label>
            <textarea
              placeholder="เช่น ตีพิมพ์ในวารสารระดับ Q1 จำนวน 2 บทความ..."
              value={mainObjective}
              onChange={(e) => setMainObjective(e.target.value)}
              required
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1 text-xs">
              คำอธิบายโครงการสังเขป
            </label>
            <textarea
              placeholder="รายละเอียดการดำเนินงานและผลลัพธ์ที่คาดหวัง..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-xs">
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-[#003B71]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3.5 rounded-2xl bg-[#003B71] hover:bg-[#00264D] text-white font-bold text-xs shadow-md shadow-[#003B71]/20 transition-all cursor-pointer"
          >
            {isSubmitting ? 'กำลังบันทึกโครงการ...' : 'บันทึกและสร้างโครงการ OKR'}
          </button>
        </form>
      </div>
    </div>
  )
}
