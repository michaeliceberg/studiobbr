'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Plus, BellRing, MapPin, CalendarDays } from 'lucide-react'

// Нижнее меню: «+ Клиент» посередине, под большой палец.
export function BottomNav() {
    const p = usePathname()
    const item = (href: string, Icon: typeof Users, label: string, on: boolean) => (
        <Link href={href} aria-current={on ? 'page' : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${on ? 'text-brass' : 'text-muted'}`}>
            <Icon size={24} strokeWidth={on ? 2.4 : 2} />{label}
        </Link>
    )
    return (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <div className="mx-auto grid max-w-2xl grid-cols-5">
                {item('/', Users, 'Клиенты', p === '/' || (p.startsWith('/clients') && p !== '/clients/new') || p.startsWith('/visits'))}
                {item('/schedule', CalendarDays, 'Запись', p.startsWith('/schedule'))}
                <Link href="/clients/new" aria-label="Новый клиент" className="flex flex-col items-center gap-1 pb-2.5 text-xs font-semibold text-mint">
                    <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg bg-mint text-[#0D1412]"><Plus size={28} strokeWidth={3} /></span>
                    Клиент
                </Link>
                {item('/due', BellRing, 'Пора', p.startsWith('/due'))}
                {item('/sources', MapPin, 'Откуда', p.startsWith('/sources'))}
            </div>
        </nav>
    )
}
