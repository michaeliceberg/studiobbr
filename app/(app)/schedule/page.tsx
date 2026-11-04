import Link from 'next/link'
import { Plus, Settings } from 'lucide-react'
import { cancelAppointment } from '@/app/schedule-actions'
import { ConfirmButton } from '@/components/confirm-button'
import { addDays, getAppointments, HORIZON_DAYS, mskToday } from '@/lib/booking'
import { dateRu, telHref } from '@/lib/format'

export const dynamic = 'force-dynamic'

// Журнал: все записи на ближайшие три недели по дням. Онлайн-записи появляются здесь сами.
export default async function SchedulePage() {
    const today = mskToday()
    const list = await getAppointments(today, addDays(today, HORIZON_DAYS))
    const days = Array.from(new Set(list.map((a) => a.day)))
    return (
        <>
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold">Запись</h1>
                <div className="flex gap-2">
                    <Link href="/schedule/settings" aria-label="Услуги и график" className="btn-ghost !min-h-[44px] !px-3"><Settings size={18} /></Link>
                    <Link href="/schedule/new" className="btn-ghost !min-h-[44px] !px-3 text-sm"><Plus size={18} />Записать</Link>
                </div>
            </div>
            <Link href="/book" className="text-sm text-brass">Страница записи для клиентов: studiobbr.ru/book</Link>
            {days.length === 0 && <div className="card p-6 text-center text-muted">Записей пока нет.</div>}
            {days.map((d) => (
                <section key={d} className="flex flex-col gap-2">
                    <h2 className="font-bold text-brass">{d === today ? 'Сегодня' : d === addDays(today, 1) ? 'Завтра' : dateRu(`${d}T12:00:00+03:00`)}</h2>
                    {list.filter((a) => a.day === d).map((a) => (
                        <article key={a.id} className="card flex flex-col gap-3 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-lg font-black">{a.time}–{a.end_time}</p>
                                    {a.client_id ? <Link href={`/clients/${a.client_id}`} className="block truncate font-bold">{a.name}</Link> : <p className="truncate font-bold">{a.name}</p>}
                                    <p className="text-sm text-muted">{a.staff_name} · {a.service_name}{a.source === 'online' && ' · онлайн'}</p>
                                    {a.comment && <p className="mt-1 text-sm">{a.comment}</p>}
                                </div>
                                {a.phone && <a href={telHref(a.phone)} className="btn-ghost !min-h-[44px] shrink-0 !px-3 text-sm">Позвонить</a>}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {a.client_id ? <Link href={`/clients/${a.client_id}/visits/new?repeat=1`} className="btn-ghost !min-h-[44px] text-sm">Начать визит</Link> : <span />}
                                <form action={cancelAppointment.bind(null, a.id)}>
                                    <ConfirmButton message="Отменить запись?" className="btn-danger !min-h-[44px] w-full text-sm">Отменить</ConfirmButton>
                                </form>
                            </div>
                        </article>
                    ))}
                </section>
            ))}
        </>
    )
}
