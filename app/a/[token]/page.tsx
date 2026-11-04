import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cancelByToken } from '@/app/book/actions'
import { ConfirmButton } from '@/components/confirm-button'
import { getAppointmentByToken, mskToday } from '@/lib/booking'
import { dateRu, telHref } from '@/lib/format'
import { OPERATOR } from '@/lib/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ваша запись — BBR Studio', robots: { index: false, follow: false } }

// Личная страница записи: ссылка со случайным кодом, вход не нужен.
export default async function AppointmentPage({ params }: { params: { token: string } }) {
    const a = await getAppointmentByToken(params.token)
    if (!a) notFound()
    const cancelled = a.status !== 'booked'
    const past = a.day < mskToday()
    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-4 pb-12">
            <h1 className="text-3xl font-black tracking-wide text-brass">BBR Studio</h1>
            <section className={`card flex flex-col gap-2 p-5 ${cancelled ? '' : 'border-mint'}`}>
                <p className={`font-bold ${cancelled ? 'text-danger' : 'text-mint'}`}>{cancelled ? 'Запись отменена' : 'Вы записаны'}</p>
                <p className="text-2xl font-black">{dateRu(`${a.day}T12:00:00+03:00`)}, {a.time}</p>
                <p>{a.service_name}</p>
                <p className="text-sm text-muted">{OPERATOR.address}</p>
            </section>
            {!cancelled && !past && (
                <>
                    <p className="text-sm text-muted">Сохраните эту страницу: по ней можно отменить запись.</p>
                    <form action={cancelByToken.bind(null, a.token)}>
                        <ConfirmButton message="Отменить запись?" className="btn-danger w-full">Отменить запись</ConfirmButton>
                    </form>
                </>
            )}
            {OPERATOR.phone && <a href={telHref(OPERATOR.phone)} className="btn-ghost w-full">Позвонить в студию</a>}
            {cancelled && <Link href="/book" className="btn-primary w-full">Записаться заново</Link>}
        </main>
    )
}
