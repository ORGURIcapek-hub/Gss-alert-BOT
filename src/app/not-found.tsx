import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <p className="text-slate-400 text-sm mb-6">ไม่พบหน้าที่คุณต้องการ</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold"
      >
        กลับสู่หน้าหลัก
      </Link>
    </div>
  )
}
