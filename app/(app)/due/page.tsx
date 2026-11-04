import Link from 'next/link'
import { getDue } from '@/lib/data'
import { dateRu, telHref } from '@/lib/format'

// Срок считается по стрижке из последнего визита (фейд — 3 недели, классика — 4–5). Рассылки пока нет: мастер звонит или пишет сам.
export default async function DuePage() {
    const due = await getDue()
    return (
        <>
            <h1 className="text-2xl font-bold">Пора обновить</h1>
            {due.length === 0 && <div className="card p-6 text-center text-muted">Пока никого.</div>}
            <ul className="flex flex-col gap-2">
                {due.map((c) => (
                    <li key={c.id} className="card flex items-center justify-between gap-3 p-4">
                        <Link href={`/clients/${c.id}`} className="min-w-0">
                            <span className="block truncate font-bold">{c.name}</span>
                            <span className="block truncate text-sm text-muted">{c.cut_name || 'Стрижка'} · с {dateRu(c.next_date)}</span>
                        </Link>
                        {c.phone && <a href={telHref(c.phone)} className="btn-ghost !min-h-[44px] shrink-0 !px-3 text-sm">Позвонить</a>}
                    </li>
                ))}
            </ul>
        </>
    )
}
