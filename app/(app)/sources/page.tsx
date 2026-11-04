import { getSourceStats } from '@/lib/data'
import { sourceLabel } from '@/lib/format'

// «Откуда узнали»: решения про Instagram, VK и рекламу — по этим цифрам, а не по ощущениям.
export default async function SourcesPage() {
    const rows = await getSourceStats()
    const max = Math.max(1, ...rows.map((r) => r.n))
    return (
        <>
            <h1 className="text-2xl font-bold">Откуда узнали</h1>
            {rows.length === 0 && <div className="card p-6 text-center text-muted">Пока нет клиентов.</div>}
            <ul className="flex flex-col gap-2">
                {rows.map((r) => (
                    <li key={r.source} className="card p-4">
                        <div className="flex justify-between gap-3"><b>{sourceLabel(r.source)}</b><span>{r.n}<span className="text-sm text-muted"> · за 30 дней {r.month}</span></span></div>
                        <div className="mt-2 h-2 rounded-full bg-bg"><div className="h-2 rounded-full bg-mint" style={{ width: `${(r.n / max) * 100}%` }} /></div>
                    </li>
                ))}
            </ul>
        </>
    )
}
