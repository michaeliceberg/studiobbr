'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Plus, BellRing, MapPin, CalendarDays, Sparkles } from 'lucide-react'

type Tab = 'clients' | 'schedule' | 'new' | 'due' | 'sources' | null
const tabOf = (p: string): Tab =>
    p === '/clients/new' ? 'new'
        : p === '/' || p.startsWith('/clients') || p.startsWith('/visits') ? 'clients'
            : p.startsWith('/schedule') ? 'schedule'
                : p.startsWith('/due') ? 'due'
                    : p.startsWith('/sources') ? 'sources' : null

// Нижнее меню, как в Garaggio: выбранный раздел — иконка подпрыгивает, под ней светится «таблетка».
// Подсвечиваем сразу по нажатию (страница может грузиться секунду), потом — по адресу.
// «+ Клиент» посередине, под большой палец: приподнятая кнопка с переливающимся кольцом.
export function BottomNav() {
    const pathname = usePathname()
    const [tapped, setTapped] = useState<Tab>(null)
    useEffect(() => setTapped(null), [pathname])
    const active = tapped ?? tabOf(pathname)

    const item = (tab: Exclude<Tab, 'new' | null>, href: string, Icon: typeof Users, label: string) => {
        const on = active === tab
        return (
            <Link href={href} onClick={() => setTapped(tab)} aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors duration-300 ${on ? 'text-brass' : 'text-muted'}`}>
                <span key={on ? 'on' : 'off'} className={`nav-pill ${on ? 'nav-pill-on' : ''}`}><Icon size={24} strokeWidth={on ? 2.4 : 2} /></span>
                {label}
            </Link>
        )
    }
    return (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            {/* ушко, как «Ещё» в Garaggio: открытая всем примерка /try — показать клиенту или скинуть ссылку */}
            <div className="relative mx-auto max-w-2xl">
                <Link href="/try" aria-label="Примерка стрижек для клиентов"
                    className="try-tab absolute -top-[31px] right-3 flex h-[31px] items-center gap-1 rounded-t-xl border border-b-0 border-brass/50 bg-bg px-3 text-xs font-bold text-brass">
                    <Sparkles size={15} strokeWidth={2.6} className="try-tab-icon" />Примерка
                </Link>
            </div>
            <div className="mx-auto grid max-w-2xl grid-cols-5">
                {item('clients', '/', Users, 'Клиенты')}
                {item('schedule', '/schedule', CalendarDays, 'Запись')}
                <Link href="/clients/new" onClick={() => setTapped('new')} aria-label="Новый клиент" aria-current={active === 'new' ? 'page' : undefined}
                    className="flex flex-col items-center gap-1 pb-2.5 text-xs font-semibold text-mint">
                    <span key={active === 'new' ? 'on' : 'off'} className={`nav-plus -mt-6 ${active === 'new' ? 'nav-plus-on' : ''}`}>
                        <span className="nav-plus-core"><Plus size={28} strokeWidth={3} /></span>
                    </span>
                    Клиент
                </Link>
                {item('due', '/due', BellRing, 'Пора')}
                {item('sources', '/sources', MapPin, 'Откуда')}
            </div>
        </nav>
    )
}
