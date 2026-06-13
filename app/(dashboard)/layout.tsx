'use cache'

import { Suspense } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      <Suspense fallback={<div className="w-60 shrink-0 bg-[#0f172a] border-r border-slate-800" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
