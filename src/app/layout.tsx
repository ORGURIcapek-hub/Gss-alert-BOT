import type { Metadata } from 'next'
import './globals.css'
import { RoleProvider } from '@/components/RoleContext'

export const metadata: Metadata = {
  title: 'ระบบติดตาม OKR คณะวิทยาศาสตร์ | Science OKR Tracking System',
  description: 'ระบบติดตามและประเมินผล OKR คณะวิทยาศาสตร์ พัฒนาด้วย TypeScript, Supabase, และ Row Level Security (RLS)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className="antialiased selection:bg-sky-500 selection:text-white">
        <RoleProvider>
          {children}
        </RoleProvider>
      </body>
    </html>
  )
}
