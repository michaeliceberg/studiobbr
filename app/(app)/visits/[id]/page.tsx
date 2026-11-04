import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AddPhotos } from '@/components/add-photos'
import { ConfirmButton } from '@/components/confirm-button'
import { deleteVisit } from '@/app/actions'
import { getClient, getPhotos, getVisit } from '@/lib/data'
import { dateRu, lengthsLine } from '@/lib/format'

export default async function VisitPage({ params }: { params: { id: string } }) {
    const v = await getVisit(Number(params.id))
    if (!v) notFound()
    const [c, photos] = await Promise.all([getClient(v.client_id), getPhotos(v.id)])
    return (
        <>
            <div>
                <Link href={`/clients/${v.client_id}`} className="text-sm text-brass">{c?.name}</Link>
                <h1 className="text-2xl font-bold">{v.cut_name || 'Стрижка'}</h1>
                <p className="text-sm text-muted">{dateRu(v.visit_date)}{v.master && ` · ${v.master}`}</p>
            </div>
            <section className="card flex flex-col gap-2 p-4">
                {lengthsLine(v) && <p>{lengthsLine(v)}</p>}
                {v.brief && <p className="whitespace-pre-line text-sm text-muted">{v.brief}</p>}
                {v.notes && <p className="text-sm">{v.notes}</p>}
                <p className="text-sm text-brass">Обновить: {dateRu(v.next_date)} (через {v.refresh_weeks} нед.)</p>
            </section>
            {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {photos.map((p) => <img key={p.id} src={`/api/photos/${p.id}`} alt="Результат" className="aspect-square w-full rounded-xl object-cover" />)}
                </div>
            )}
            {c?.pd_consent_at
                ? <AddPhotos visitId={v.id} />
                : <Link href={`/clients/${v.client_id}/edit`} className="card p-4 text-sm text-muted">Фото можно добавить после согласия клиента на съёмку. <span className="text-brass">Отметить в карточке</span></Link>}
            <form action={deleteVisit.bind(null, v.id, v.client_id)}>
                <ConfirmButton message="Удалить визит и его фото?" className="btn-danger w-full">Удалить визит</ConfirmButton>
            </form>
        </>
    )
}
