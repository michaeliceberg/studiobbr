import type { Metadata } from 'next'
import { Beha, BehaNote } from '@/components/beha'
import { TryFlow } from '@/components/try-flow'
import { TRY_SETS } from '@/lib/hair-image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { isAuthed } from '@/lib/auth'
import { bookingUrl, OPERATOR } from '@/lib/legal'

export const metadata: Metadata = {
    title: 'Примерь стрижку — BBR Studio',
    description: 'Сделайте селфи — нейросеть покажет 4 стрижки прямо на вас. Понравилось — записывайтесь к Бэхе в BBR Studio, Королёв.',
}

// Публичная примерка для будущих клиентов: «вау» → запись. Без входа; расходы держит лимит в /api/try.
export const dynamic = 'force-dynamic'

export default function TryPage() {
    const vibes = Object.entries(TRY_SETS).map(([key, s]) => ({ key, title: s.title, emoji: s.emoji, names: s.cuts.map((c) => c.name) }))
    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 p-4 pb-12">
            {/* мастер пришёл сюда из приложения (ушко «Примерка») — даём вернуться; клиенту возвращаться некуда */}
            {isAuthed() && (
                <Link href="/" className="-mb-2 flex w-fit items-center gap-1 rounded-xl py-1 pr-3 text-sm font-semibold text-muted active:text-brass">
                    <ChevronLeft size={20} strokeWidth={2.6} />В приложение
                </Link>
            )}
            <header className="relative isolate flex items-center gap-3">
                <span aria-hidden className="magic-halo" />
                <Beha pose="mirror" size={96} className="shrink-0" />
                <div className="min-w-0">
                    <h1 className="inline-block bg-gradient-to-r from-brass via-[#F2A35B] to-mint bg-clip-text text-[28px] font-black leading-tight text-transparent">Примерь стрижку</h1>
                    <p className="text-sm text-muted">Селфи — и нейросеть покажет 4 стрижки прямо на вас</p>
                </div>
            </header>
            <TryFlow vibes={vibes} bookUrl={bookingUrl()} />
            <footer className="flex flex-col gap-1 text-center text-xs text-muted">
                <p className="font-bold text-brass">BBR Studio · {OPERATOR.address}</p>
                <BehaNote />
            </footer>
        </main>
    )
}
