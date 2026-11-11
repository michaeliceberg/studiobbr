'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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

// Свёрнутый шаг: что выбрано, и кнопка «Изменить»
function Done({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
    return (
        <button type="button" onClick={onEdit} className="card flex items-center justify-between gap-3 border-mint/60 p-3 text-left">
            <span className="min-w-0"><span className="block text-xs text-muted">{label}</span><span className="block truncate font-bold">{value}</span></span>
            <span className="shrink-0 text-sm font-semibold text-brass">Изменить</span>
        </button>
    )
}

// Запись в один экран: мастер → услуга → день → время → контакты. Каждый следующий шаг появляется после выбора предыдущего.
export function BookingFlow({ staff, services, days, tgKey }: { staff: Master[]; services: Svc[]; days: string[]; tgKey?: string }) {
    const router = useRouter()
    const [master, setMaster] = useState<Master | null>(staff.length === 1 ? staff[0] : null)
    const [picked, setPicked] = useState<Svc[]>([])
    const [day, setDay] = useState<string | null>(null)
    const [slots, setSlots] = useState<string[] | null>(null)
    const [time, setTime] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [comment, setComment] = useState('')
    const [consent, setConsent] = useState(false)
    const [website, setWebsite] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editing, setEditing] = useState<'master' | 'service' | 'when' | null>(null)
    const [openCat, setOpenCat] = useState<string | null>(null)

    const total = { min: picked.reduce((n, x) => n + x.duration_min, 0), price: picked.reduce((n, x) => n + x.price, 0) }
    const service = picked.length ? picked[0] : null
    const toggle = (x: Svc) => setPicked((l) => (l.some((y) => y.id === x.id) ? l.filter((y) => y.id !== x.id) : [...l, x]))
    const mine = services.filter((s) => s.staff_id === master?.id)
    const cats = Array.from(new Set(mine.map((s) => s.category)))
    const masterOpen = !master || editing === 'master'
    const serviceOpen = !!master && (!picked.length || editing === 'service')
    const whenOpen = !!service && (!time || editing === 'when')

    useEffect(() => {
        setTime(null); setSlots(null)
        if (!service || !day) return
        let live = true
        loadSlots(picked.map((x) => x.id), day).then((s) => { if (live) setSlots(s) })
        return () => { live = false }
    }, [picked, day])

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!service || !day || !time) return
        setBusy(true); setError(null)
        const phone = String(new FormData(e.currentTarget).get('phone') ?? '')
        const r = await book({ serviceIds: picked.map((x) => x.id), day, time, name, phone, comment, consent, website, k: tgKey }).catch(() => ({ error: 'net' }))
        if ('token' in r && r.token) { router.push(`/a/${r.token}`); return }
        const code = 'error' in r ? String(r.error) : ''
        setError(ERR[code] ?? 'Не получилось записать. Попробуйте ещё раз.')
        if (code === 'taken') { setTime(null); setSlots(await loadSlots(picked.map((x) => x.id), day)) }
        setBusy(false)
    }

    return (
        <div className="flex flex-col gap-5">
            {!masterOpen && master ? <Done label="Мастер" value={`${master.name}, ${master.title}`} onEdit={() => setEditing('master')} /> : (
            <section className="flex flex-col gap-2">
                <h2 className="font-bold">Мастер</h2>
                <div className="grid grid-cols-2 gap-2">
                    {staff.map((m) => (
                        <button key={m.id} type="button" aria-pressed={master?.id === m.id} onClick={() => { if (master?.id !== m.id) { setPicked([]); setDay(null); setTime(null) } setMaster(m); setEditing(null); setOpenCat(null) }}
                            className={`card p-4 text-left ${master?.id === m.id ? 'border-mint bg-mint/10' : ''}`}>
                            <span className="block text-lg font-black">{m.name}</span><span className="block text-sm text-muted">{m.title}</span>
                        </button>
                    ))}
                </div>
            </section>
            )}

            {master && !serviceOpen && picked.length > 0 && <Done label={picked.length > 1 ? `Услуги (${picked.length})` : 'Услуга'} value={`${picked.map((x) => x.name).join(' + ')} · ${total.min} мин${total.price > 0 ? ` · ${total.price} ₽` : ''}`} onEdit={() => setEditing('service')} />}
            {master && serviceOpen && (
                <section className="flex flex-col gap-2">
                    <h2 className="font-bold">Услуги</h2>
                    <p className="text-sm text-muted">Можно выбрать несколько: например, стрижку, бороду и срочный выход.</p>
                    {cats.map((cat) => {
                        const list = mine.filter((s) => s.category === cat)
                        const open = cats.length === 1 || openCat === cat
                        return (
                            <div key={cat} className="flex flex-col gap-2">
                                {cats.length > 1 && (
                                    <button type="button" aria-expanded={open} onClick={() => setOpenCat(open ? null : cat)} className="card flex items-center justify-between gap-3 p-4 text-left">
                                        <span className="font-bold">{cat || 'Другое'}{picked.filter((x) => x.category === cat).length > 0 && <span className="ml-2 text-sm text-mint">выбрано {picked.filter((x) => x.category === cat).length}</span>}</span>
                                        <span className="flex shrink-0 items-center gap-2 text-sm text-muted">{list.length}<ChevronDown size={18} className={open ? 'rotate-180' : ''} /></span>
                                    </button>
                                )}
                                {open && list.map((s) => (
                                    <button key={s.id} type="button" aria-pressed={picked.some((x) => x.id === s.id)} onClick={() => toggle(s)}
                                        className={`card flex items-center justify-between gap-3 p-4 text-left ${picked.some((x) => x.id === s.id) ? 'border-mint bg-mint/10' : ''}`}>
                                        <span className="min-w-0"><span className="block font-bold">{s.name}</span><span className="block text-sm text-muted">{s.duration_min} мин</span></span>
                                        <span className="shrink-0 font-bold text-brass">{s.price > 0 ? `${s.price} ₽` : ''}</span>
                                    </button>
                                ))}
                            </div>
                        )
                    })}
                    {picked.length > 0 && (
                        <button type="button" onClick={() => setEditing(null)} className="btn-primary sticky bottom-3 w-full">
                            Дальше: {picked.length} · {total.min} мин{total.price > 0 ? ` · ${total.price} ₽` : ''}
                        </button>
                    )}
                </section>
            )}

            {service && !serviceOpen && !whenOpen && day && time && <Done label="День и время" value={`${wd(day)}, ${dayNum(day)}.${day.slice(5, 7)} в ${time}`} onEdit={() => setEditing('when')} />}
            {service && !serviceOpen && whenOpen && (
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

            {service && !serviceOpen && whenOpen && day && (
                <section className="flex flex-col gap-2">
                    <h2 className="font-bold">Время</h2>
                    {slots === null ? <p className="text-sm text-muted">Смотрю расписание…</p>
                        : slots.length === 0 ? <p className="card p-4 text-sm text-muted">На этот день свободного времени нет. Выберите другой.</p>
                        : <div className="grid grid-cols-4 gap-2">
                            {slots.map((t) => <button key={t} type="button" aria-pressed={time === t} onClick={() => { setTime(t); setEditing(null) }} className={`chip !px-0 ${time === t ? 'chip-on' : ''}`}>{t}</button>)}
                        </div>}
                </section>
            )}

            {service && !serviceOpen && day && time && (
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
