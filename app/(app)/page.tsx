import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Beha } from '@/components/beha'
import { LiveSearch } from '@/components/live-search'
import { getDue, searchClients } from '@/lib/data'
import { dateRu } from '@/lib/format'

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
    const q = searchParams.q ?? ''
    const [clients, due] = await Promise.all([searchClients(q), q ? Promise.resolve([]) : getDue()])
    return (
        <>
            <LiveSearch initial={q} />
            {due.length > 0 && (
                <Link href="/due" className="card flex items-center justify-between border-brass/40 bg-brass/10 p-4">
                    <span className="font-bold text-brass">Пора обновить стрижку: {due.length}</span>
                    <ChevronRight className="text-brass" />
                </Link>
            )}
            {clients.length === 0 ? (
                <div className="card flex flex-col items-center p-6 text-center text-muted">
                    <Beha pose={q ? 'think' : 'hello'} size={160} className="mb-3" />
                    {q ? 'Никого не нашлось.' : 'Пока ни одного клиента.'}
                    <div className="mt-4"><Link href="/clients/new" className="btn-primary">Добавить клиента</Link></div>
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {clients.map((c) => (
                        <li key={c.id}>
                            <Link href={`/clients/${c.id}`} className="card flex items-center justify-between gap-2 p-4">
                                <span className="min-w-0">
                                    <span className="block truncate font-bold">{c.name}</span>
                                    <span className="block truncate text-sm text-muted">{c.last_visit ? `${c.last_cut || 'Стрижка'} · ${dateRu(c.last_visit)}` : c.phone || 'Ещё не стригся'}</span>
                                </span>
                                <ChevronRight size={20} className="shrink-0 text-muted" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )
}
