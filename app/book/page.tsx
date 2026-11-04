import type { Metadata } from 'next'
import { BookingFlow } from '@/components/booking-flow'
import { isAuthed } from '@/lib/auth'
import { addDays, getClosedDays, getServices, getStaff, getWorkHours, HORIZON_DAYS, mskToday } from '@/lib/booking'
import { BOOKING_OPEN, OPERATOR } from '@/lib/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Запись — BBR Studio', description: 'Онлайн-запись в барбершоп BBR Studio, Королёв, Октябрьский бульвар, 26.' }

// Пока запись идёт через Dikidi, клиенты эту страницу не видят: мастер может проверить после входа.
export default async function BookPage() {
    const preview = isAuthed()
    const open = BOOKING_OPEN || preview
    const [staff, services, hours, closed] = await Promise.all([open ? getStaff() : [], open ? getServices() : [], open ? getWorkHours() : [], open ? getClosedDays() : ([] as string[])])
    const today = mskToday()
    const days = Array.from({ length: HORIZON_DAYS }, (_, i) => addDays(today, i)).filter((d) =>
        !closed.includes(d) && hours.find((h) => h.weekday === new Date(`${d}T12:00:00+03:00`).getUTCDay())?.is_open)
    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 p-4 pb-12">
            <header>
                <h1 className="text-3xl font-black tracking-wide text-brass">BBR Studio</h1>
                <p className="text-sm text-muted">{OPERATOR.address}</p>
            </header>
            {!BOOKING_OPEN && preview && <p className="card border-brass/50 bg-brass/10 p-3 text-sm text-brass">Клиенты эту страницу пока не видят: запись идёт через Dikidi.</p>}
            {!open ? <div className="card p-6 text-center text-muted">Онлайн-запись скоро откроется.</div>
                : services.length === 0 ? <div className="card p-6 text-center text-muted">Услуги ещё не добавлены.</div>
                : <BookingFlow staff={staff.filter((m) => services.some((s) => s.staff_id === m.id))} services={services.map(({ id, staff_id, category, name, duration_min, price }) => ({ id, staff_id, category, name, duration_min, price }))} days={days} />}
        </main>
    )
}
