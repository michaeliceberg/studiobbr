import { addClosedDay, removeClosedDay, saveHours, saveService } from '@/app/schedule-actions'
import { getClosedDays, getServices, getStaff, getWorkHours, minToTime } from '@/lib/booking'
import { dateRu } from '@/lib/format'

export const dynamic = 'force-dynamic'
const WEEK = [[1, 'Пн'], [2, 'Вт'], [3, 'Ср'], [4, 'Чт'], [5, 'Пт'], [6, 'Сб'], [0, 'Вс']] as const

export default async function ScheduleSettings() {
    const [services, hours, closed, staff] = await Promise.all([getServices(true), getWorkHours(), getClosedDays(), getStaff()])
    const serviceFields = (s?: (typeof services)[number]) => (
        <>
            <div><label className="label">Название</label><input name="name" defaultValue={s?.name} placeholder="Мужская стрижка" className="input" required /></div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Мастер</label><select name="staff_id" defaultValue={s?.staff_id ?? staff[0]?.id} className="input">{staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                <div><label className="label">Раздел</label><input name="category" defaultValue={s?.category} className="input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Минут</label><input name="duration_min" inputMode="numeric" defaultValue={s?.duration_min ?? 60} className="input" /></div>
                <div><label className="label">Цена, ₽</label><input name="price" inputMode="numeric" defaultValue={s?.price ?? ''} className="input" /></div>
            </div>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="h-5 w-5 accent-[#6CC0A8]" />Показывать клиентам</label>
        </>
    )
    return (
        <>
            <h1 className="text-2xl font-bold">Услуги и график</h1>
            <section className="flex flex-col gap-2">
                <h2 className="font-bold text-brass">Услуги</h2>
                {services.map((s) => (
                    <form key={s.id} action={saveService.bind(null, s.id)} className="card flex flex-col gap-3 p-4">
                        {serviceFields(s)}
                        <button className="btn-ghost !min-h-[44px] w-full text-sm">Сохранить</button>
                    </form>
                ))}
                <form action={saveService.bind(null, null)} className="card flex flex-col gap-3 border-dashed p-4">
                    {serviceFields()}
                    <button className="btn-primary w-full">Добавить услугу</button>
                </form>
            </section>
            <section className="flex flex-col gap-2">
                <h2 className="font-bold text-brass">Рабочие часы</h2>
                <form action={saveHours} className="card flex flex-col gap-3 p-4">
                    {WEEK.map(([d, label]) => {
                        const h = hours.find((x) => x.weekday === d)
                        return (
                            <div key={d} className="grid grid-cols-[64px_1fr_1fr] items-center gap-2">
                                <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name={`on_${d}`} defaultChecked={h?.is_open} className="h-5 w-5 accent-[#6CC0A8]" />{label}</label>
                                <input type="time" name={`open_${d}`} aria-label={`${label}, начало`} defaultValue={minToTime(h?.open_min ?? 600)} className="input !px-2" />
                                <input type="time" name={`close_${d}`} aria-label={`${label}, конец`} defaultValue={minToTime(h?.close_min ?? 1260)} className="input !px-2" />
                            </div>
                        )
                    })}
                    <button className="btn-primary w-full">Сохранить часы</button>
                </form>
            </section>
            <section className="flex flex-col gap-2">
                <h2 className="font-bold text-brass">Выходные дни</h2>
                {closed.map((d) => (
                    <form key={d} action={removeClosedDay.bind(null, d)} className="card flex items-center justify-between gap-3 p-3">
                        <span className="font-semibold">{dateRu(`${d}T12:00:00+03:00`)}</span>
                        <button className="btn-ghost !min-h-[40px] !px-3 text-sm">Убрать</button>
                    </form>
                ))}
                <form action={addClosedDay} className="card flex items-end gap-2 p-3">
                    <div className="min-w-0 flex-1"><label className="label" htmlFor="closed">Закрыть день</label><input id="closed" type="date" name="day" className="input" required /></div>
                    <button className="btn-ghost shrink-0 text-sm">Добавить</button>
                </form>
            </section>
        </>
    )
}
