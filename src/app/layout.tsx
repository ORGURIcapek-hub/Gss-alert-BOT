import type { Metadata } from 'next'
import './globals.css'
import { RoleProvider } from '@/components/RoleContext'

export const metadata: Metadata = {
  title: 'ระบบติดตาม OKR มหาวิทยาลัยสวนดุสิต | Suan Dusit University OKR System',
  description: 'ระบบติดตามและประเมินผล OKR มหาวิทยาลัยสวนดุสิต พัฒนาด้วย Next.js, TypeScript, และ Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className="antialiased bg-white text-slate-900 selection:bg-[#003B71] selection:text-white">
        <RoleProvider>
          {children}
        </RoleProvider>
      </body>
    </html>
  )
}
