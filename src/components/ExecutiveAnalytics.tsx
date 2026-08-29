'use client'

import React from 'react'
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
}

export function ExecutiveAnalytics({ projects }: ExecutiveAnalyticsProps) {
  const completed = projects.filter(p => p.progress_percentage === 100 || p.status === 'Completed').length
  const inProgress = projects.filter(p => p.status === 'In Progress' && p.progress_percentage < 100).length
  const delayed = projects.filter(p => p.status === 'Delayed' || (p.bottleneck && p.bottleneck.length > 0)).length
  const onHold = projects.filter(p => p.status === 'On Hold' || p.status === 'Draft').length

  const doughnutData = {
    labels: ['บรรลุเป้าหมาย', 'กำลังดำเนินการ', 'ล่าช้า/ติดปัญหา', 'พักชะลอ'],
    datasets: [
      {
        data: [completed, inProgress, delayed, onHold],
        backgroundColor: ['#10b981', '#0ea5e9', '#f59e0b', '#64748b'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  }

  const deptMap: Record<string, { totalBudget: number; totalSpent: number; totalProgress: number; count: number }> = {}
  projects.forEach(p => {
    if (!deptMap[p.department]) {
      deptMap[p.department] = { totalBudget: 0, totalSpent: 0, totalProgress: 0, count: 0 }
    }
    deptMap[p.department].totalBudget += Number(p.budget)
    deptMap[p.department].totalSpent += Number(p.spent_amount)
    deptMap[p.department].totalProgress += Number(p.progress_percentage)
    deptMap[p.department].count += 1
  })

  const deptLabels = Object.keys(deptMap)
  const deptProgress = deptLabels.map(d => (deptMap[d].totalProgress / deptMap[d].count).toFixed(1))
  const deptSpentPct = deptLabels.map(d => ((deptMap[d].totalSpent / (deptMap[d].totalBudget || 1)) * 100).toFixed(1))

  const barData = {
    labels: deptLabels.map(l => l.replace('ภาควิชา', '')),
    datasets: [
      {
        label: 'ความก้าวหน้า (%)',
        data: deptProgress,
        backgroundColor: '#0ea5e9',
        borderRadius: 6
      },
      {
        label: 'เบิกจ่าย (%)',
        data: deptSpentPct,
        backgroundColor: '#f59e0b',
        borderRadius: 6
      }
    ]
  }

  const lineData = {
    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
    datasets: [
      {
        label: 'ความคืบหน้า (%)',
        data: [15, 28, 42, 50, 63, 71, 78, 84, 88, 92, 95, 98],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointRadius: 3
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: { family: "'Google Sans', 'Plus Jakarta Sans', 'Prompt', sans-serif", size: 11 }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { family: "'Google Sans', 'Plus Jakarta Sans', 'Prompt', sans-serif", size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#94a3b8', font: { family: "'Google Sans', 'Plus Jakarta Sans', 'Prompt', sans-serif", size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="glass-card p-4 sm:p-5 flex flex-col">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-1">สัดส่วนสถานะโครงการ</h3>
        <div className="h-56 sm:h-60 flex items-center justify-center">
          <Doughnut
            data={doughnutData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { color: '#cbd5e1', font: { family: "'Google Sans', 'Plus Jakarta Sans', 'Prompt', sans-serif", size: 10 } }
                }
              },
              cutout: '70%'
            }}
          />
        </div>
      </div>

      <div className="glass-card p-4 sm:p-5 flex flex-col">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-1">ความก้าวหน้าและการเบิกจ่าย</h3>
        <div className="h-56 sm:h-60">
          <Bar data={barData} options={chartOptions} />
        </div>
      </div>

      <div className="glass-card p-4 sm:p-5 flex flex-col">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-1">แนวโน้มผลงานประจำปี</h3>
        <div className="h-56 sm:h-60">
          <Line data={lineData} options={chartOptions} />
        </div>
      </div>
    </div>
  )
}
