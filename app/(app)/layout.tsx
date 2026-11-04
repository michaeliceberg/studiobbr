import Link from 'next/link'
import { BottomNav } from '@/components/bottom-nav'
import { requireAuth } from '@/lib/auth'

// Всё, кроме входа, — только для мастера.
export default function AppLayout({ children }: { children: React.ReactNode }) {
    requireAuth()
    return (
        <div className="mx-auto min-h-screen max-w-2xl pb-28">
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
                <Link href="/" className="text-xl font-black tracking-wide text-brass">BBR Studio</Link>
                <form action="/api/logout" method="post"><button className="text-sm text-muted">Выйти</button></form>
            </header>
            <main className="flex flex-col gap-4 p-4">{children}</main>
            <BottomNav />
        </div>
    )
}
