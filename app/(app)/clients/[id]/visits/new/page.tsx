import { notFound } from 'next/navigation'
import { VisitForm, type VisitDefaults } from '@/components/visit-form'
import { getClient, getMasters, getVisits } from '@/lib/data'

// Варианты заполнения: выбранная стрижка из подбора (поля в адресе) или ?repeat=1 — как в прошлый раз.
export default async function NewVisit({ params, searchParams }: { params: { id: string }; searchParams: VisitDefaults & { repeat?: string } }) {
    const id = Number(params.id)
    const [c, visits, masters] = await Promise.all([getClient(id), getVisits(id), getMasters()])
    if (!c) notFound()
    const last = visits[0]
    const str = (n: number | null | undefined) => (n == null ? undefined : String(n))
    const defaults: VisitDefaults = searchParams.repeat && last
        ? { cut_name: last.cut_name, len_top: str(last.len_top), len_crown: str(last.len_crown), len_sides: str(last.len_sides), len_nape: str(last.len_nape), brief: last.brief, refresh_weeks: String(last.refresh_weeks), master: last.master }
        : { ...searchParams, master: last?.master }
    return (
        <>
            <div>
                <h1 className="text-2xl font-bold">Новый визит</h1>
                <p className="text-sm text-muted">{c.name}</p>
            </div>
            <VisitForm clientId={id} today={new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })} defaults={defaults} masters={masters} />
        </>
    )
}
