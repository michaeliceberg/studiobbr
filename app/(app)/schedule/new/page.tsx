import Link from 'next/link'
import { addAppointment } from '@/app/schedule-actions'
import { PhoneInput } from '@/components/phone-input'
import { getServices, mskToday } from '@/lib/booking'

export const dynamic = 'force-dynamic'

export default async function NewAppointment({ searchParams }: { searchParams: { error?: string } }) {
    const services = await getServices()
    if (services.length === 0) return <div className="card p-6 text-center text-muted">Сначала добавьте услуги.<div className="mt-4"><Link href="/schedule/settings" className="btn-primary">Услуги и график</Link></div></div>
    return (
        <>
            <h1 className="text-2xl font-bold">Записать клиента</h1>
            {searchParams.error === 'taken' && <p className="card border-danger/50 p-3 text-sm font-semibold text-danger">Это время уже занято.</p>}
            <form action={addAppointment} className="card flex flex-col gap-4 p-4">
                <div><label className="label" htmlFor="name">Имя</label><input id="name" name="name" className="input" required /></div>
                <PhoneInput />
                <div><label className="label" htmlFor="service_id">Услуга</label>
                    <select id="service_id" name="service_id" className="input">{services.map((s) => <option key={s.id} value={s.id}>{s.name}, {s.duration_min} мин</option>)}</select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="label" htmlFor="day">День</label><input id="day" name="day" type="date" defaultValue={mskToday()} className="input" required /></div>
                    <div><label className="label" htmlFor="time">Время</label><input id="time" name="time" type="time" step={300} defaultValue="12:00" className="input" required /></div>
                </div>
                <div><label className="label" htmlFor="comment">Комментарий</label><textarea id="comment" name="comment" rows={2} className="input" /></div>
                <button className="btn-primary w-full">Записать</button>
            </form>
        </>
    )
}
