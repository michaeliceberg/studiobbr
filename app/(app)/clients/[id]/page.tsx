import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Pencil, Phone, Scissors, Sparkles } from 'lucide-react'
import { getClient, getVisits } from '@/lib/data'
import { dateRu, hairLine, lengthsLine, sourceLabel, telHref } from '@/lib/format'

export default async function ClientPage({ params }: { params: { id: string } }) {
    const id = Number(params.id)
    const [c, visits] = await Promise.all([getClient(id), getVisits(id)])
    if (!c) notFound()
    const last = visits[0]
    const hair = hairLine(c)
    return (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold">{c.name}</h1>
                    <p className="text-sm text-muted">{sourceLabel(c.source)} · визитов: {visits.length}</p>
                </div>
                <Link href={`/clients/${id}/edit`} aria-label="Изменить" className="btn-ghost !min-h-[44px] !px-3"><Pencil size={18} /></Link>
            </div>
            {c.phone && <a href={telHref(c.phone)} className="btn-ghost w-full"><Phone size={18} />{c.phone}</a>}

            <section className="card flex flex-col gap-2 p-4">
                <h2 className="font-bold text-brass">Паспорт стрижки</h2>
                {last ? (
                    <>
                        <p className="text-lg font-bold">{last.cut_name || 'Стрижка'}</p>
                        {lengthsLine(last) && <p className="text-sm">{lengthsLine(last)}</p>}
                        {last.brief && <p className="whitespace-pre-line text-sm text-muted">{last.brief}</p>}
                    </>
                ) : <p className="text-sm text-muted">Заполнится после первого визита.</p>}
                <p className="text-sm text-muted">
                    {c.face_shape && `Лицо: ${c.face_shape.toLowerCase()}. `}{hair ? `Волосы: ${hair}. ` : 'Волосы ещё не проверены. '}{c.hair_growth}
                </p>
                {c.notes && <p className="text-sm">{c.notes}</p>}
            </section>

            <Link href={`/clients/${id}/consult`} className="btn-primary w-full"><Sparkles size={20} />Подобрать стрижку</Link>
            <Link href={`/clients/${id}/visits/new${last ? '?repeat=1' : ''}`} className="btn-ghost w-full"><Scissors size={18} />{last ? 'Постричь так же' : 'Новый визит'}</Link>

            {visits.length > 0 && (
                <section className="flex flex-col gap-2">
                    <h2 className="font-bold">История</h2>
                    {visits.map((v) => (
                        <Link key={v.id} href={`/visits/${v.id}`} className="card flex items-center justify-between gap-2 p-4">
                            <span className="min-w-0">
                                <span className="block truncate font-semibold">{v.cut_name || 'Стрижка'}</span>
                                <span className="block truncate text-sm text-muted">{dateRu(v.visit_date)}{v.master && ` · ${v.master}`}</span>
                            </span>
                            <ChevronRight size={20} className="shrink-0 text-muted" />
                        </Link>
                    ))}
                </section>
            )}
        </>
    )
}
