'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { book, loadSlots } from '@/app/book/actions'
import { PhoneInput } from './phone-input'

type Svc = { id: number; staff_id: number; category: string; name: string; duration_min: number; price: number }
type Master = { id: number; name: string; title: string }
const ERR: Record<string, string> = {
    contacts: 'Проверьте имя и номер телефона.',
    consent: 'Нужно согласие на обработку данных.',
    taken: 'Это время только что заняли. Выберите другое.',
    limit: 'Слишком много записей подряд. Попробуйте позже.',
    'phone-limit': 'На этот номер уже есть две записи. Отмените одну или позвоните нам.',
}
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const dayNum = (d: string) => Number(d.slice(8))
const wd = (d: string) => WD[new Date(`${d}T12:00:00+03:00`).getUTCDay()]

// Запись в один экран: мастер → услуга → день → время → контакты. Каждый следующий шаг появляется после выбора предыдущего.
export function BookingFlow({ staff, services, days }: { staff: Master[]; services: Svc[]; days: string[] }) {
    const router = useRouter()
    const [master, setMaster] = useState<Master | null>(staff.length === 1 ? staff[0] : null)
    const [service, setService] = useState<Svc | null>(null)
    const [day, setDay] = useState<string | null>(null)
    const [slots, setSlots] = useState<string[] | null>(null)
    const [time, setTime] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [comment, setComment] = useState('')
    const [consent, setConsent] = useState(false)
    const [website, setWebsite] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const mine = services.filter((s) => s.staff_id === master?.id)

    useEffect(() => {
        setTime(null); setSlots(null)
        if (!service || !day) return
        let live = true
        loadSlots(service.id, day).then((s) => { if (live) setSlots(s) })
        return () => { live = false }
    }, [service, day])

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!service || !day || !time) return
        setBusy(true); setError(null)
        const phone = String(new FormData(e.currentTarget).get('phone') ?? '')
        const r = await book({ serviceId: service.id, day, time, name, phone, comment, consent, website }).catch(() => ({ error: 'net' }))
        if ('token' in r && r.token) { router.push(`/a/${r.token}`); return }
        const code = 'error' in r ? String(r.error) : ''
        setError(ERR[code] ?? 'Не получилось записать. Попробуйте ещё раз.')
        if (code === 'taken') { setTime(null); setSlots(await loadSlots(service.id, day)) }
        setBusy(false)
    }

    return (
        <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
                <h2 className="font-bold">Мастер</h2>
                <div className="grid grid-cols-2 gap-2">
                    {staff.map((m) => (
                        <button key={m.id} type="button" aria-pressed={master?.id === m.id} onClick={() => { setMaster(m); setService(null); setDay(null) }}
                            className={`card p-4 text-left ${master?.id === m.id ? 'border-mint bg-mint/10' : ''}`}>
                            <span className="block text-lg font-black">{m.name}</span><span className="block text-sm text-muted">{m.title}</span>
                        </button>
                    ))}
                </div>
            </section>

            {master && (
                <section className="flex flex-col gap-2">
                    <h2 className="font-bold">Услуга</h2>
                    {Array.from(new Set(mine.map((s) => s.category))).map((cat) => (
                        <div key={cat} className="flex flex-col gap-2">
                            {cat && <h3 className="mt-1 text-sm font-semibold text-muted">{cat}</h3>}
                            {mine.filter((s) => s.category === cat).map((s) => (
                                <button key={s.id} type="button" aria-pressed={service?.id === s.id} onClick={() => setService(s)}
                                    className={`card flex items-center justify-between gap-3 p-4 text-left ${service?.id === s.id ? 'border-mint bg-mint/10' : ''}`}>
                                    <span className="min-w-0"><span className="block font-bold">{s.name}</span><span className="block text-sm text-muted">{s.duration_min} мин</span></span>
                                    <span className="shrink-0 font-bold text-brass">{s.price > 0 ? `${s.price} ₽` : ''}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </section>
            )}

            {service && (
                <section className="flex flex-col gap-2">
                    <h2 className="font-bold">День</h2>
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                        {days.map((d) => (
                            <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)}
                                className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-sm font-semibold ${day === d ? 'border-mint bg-mint text-[#0D1412]' : 'border-line bg-card'}`}>
                                <span className={day === d ? '' : 'text-muted'}>{wd(d)}</span><span className="text-lg font-black">{dayNum(d)}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {service && day && (
                <section className="flex flex-col gap-2">
                    <h2 className="font-bold">Время</h2>
                    {slots === null ? <p className="text-sm text-muted">Смотрю расписание…</p>
                        : slots.length === 0 ? <p className="card p-4 text-sm text-muted">На этот день свободного времени нет. Выберите другой.</p>
                        : <div className="grid grid-cols-4 gap-2">
                            {slots.map((t) => <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={`chip !px-0 ${time === t ? 'chip-on' : ''}`}>{t}</button>)}
                        </div>}
                </section>
            )}

            {service && day && time && (
                <form onSubmit={submit} className="card flex flex-col gap-4 p-4">
                    <div>
                        <label className="label" htmlFor="book-name">Как вас зовут</label>
                        <input id="book-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" className="input" required />
                    </div>
                    <PhoneInput />
                    <div>
                        <label className="label" htmlFor="book-comment">Комментарий, по желанию</label>
                        <textarea id="book-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className="input" />
                    </div>
                    <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" />
                    <label className="flex items-start gap-3 text-sm">
                        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#6CC0A8]" />
                        <span>Согласен на обработку персональных данных по <Link href="/privacy" className="text-brass underline">политике</Link></span>
                    </label>
                    {error && <p className="text-sm font-semibold text-danger">{error}</p>}
                    <button className="btn-primary w-full" disabled={busy || !consent}>{busy ? 'Записываю…' : `Записаться на ${time}`}</button>
                </form>
            )}
            {error && !time && <p className="text-sm font-semibold text-danger">{error}</p>}
        </div>
    )
}
