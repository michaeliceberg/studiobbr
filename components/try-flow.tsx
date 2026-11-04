'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Camera, RotateCcw, Scissors, Sparkles } from 'lucide-react'
import { compressPhoto } from '@/lib/photo-client'
import { Beha } from './beha'
import { MagicButton } from './magic-button'

type Vibe = { key: string; title: string; emoji: string; names: string[] }
const ANGLES = ['Спереди', 'Сбоку', 'Вполоборота', 'Затылок']
const ERR: Record<string, string> = {
    'limit-me': 'На сегодня примерки закончились — приходите завтра или сразу к Бэхе 🙂',
    'limit-all': 'Сегодня примерок слишком много. Попробуйте завтра.',
    consent: 'Отметьте согласие, без него фото не отправить.',
    off: 'Примерка временно не работает.',
}
const errText = (c?: string) => ERR[c ?? ''] ?? 'Не получилось. Попробуйте ещё раз — лучше фото анфас при ровном свете.'
// Клетку вырезаем из сетки 2×2 CSS-ом (фон 206% срезает белые промежутки)
const tile = (img: string, i: number) => ({ backgroundImage: `url(${img})`, backgroundSize: '206% 206%', backgroundPosition: `${i % 2 ? 100 : 0}% ${i < 2 ? 0 : 100}%` })

// Примерка для будущего клиента: селфи → настроение → 4 стрижки на нём → понравилась → «со всех сторон» и запись к Бэхе.
export function TryFlow({ vibes, bookUrl }: { vibes: Vibe[]; bookUrl: string }) {
    const [photo, setPhoto] = useState<File | null>(null)
    const [vibe, setVibe] = useState(vibes[0].key)
    const [consent, setConsent] = useState(false)
    const [website, setWebsite] = useState('')
    const [grid, setGrid] = useState<{ img: string; vibe: string } | null>(null)
    const [angles, setAngles] = useState<{ img: string; cut: number } | null>(null)
    const [zoom, setZoom] = useState<{ img: string; i: number; label: string; cut: number | null } | null>(null)
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [left, setLeft] = useState<number | null>(null)
    const cur = vibes.find((v) => v.key === (grid?.vibe ?? vibe))!

    const send = async (cut: number | null) => {
        if (!photo) return null
        setError(null)
        const f = new FormData()
        f.append('photo', await compressPhoto(photo), 'photo.jpg')
        f.append('vibe', grid?.vibe ?? vibe)
        f.append('consent', consent ? '1' : '0')
        f.append('website', website)
        if (cut !== null) f.append('cut', String(cut))
        const res = await fetch('/api/try', { method: 'POST', body: f }).catch(() => null)
        const j = res ? await res.json().catch(() => ({})) as { image?: string; error?: string; left?: number } : {}
        if (j.image) { if (typeof j.left === 'number') setLeft(j.left); return j.image }
        setError(errText(j.error)); return null
    }
    const runGrid = async () => {
        setBusy('Примеряю 4 стрижки… до минуты'); setAngles(null)
        const img = await send(null)
        if (img) { setGrid({ img, vibe }); setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }), 50) }
        setBusy(null)
    }
    const runAngles = async (cut: number) => {
        setZoom(null); setBusy('Смотрю со всех сторон…')
        const img = await send(cut)
        if (img) { setAngles({ img, cut }); setTimeout(() => document.getElementById('angles')?.scrollIntoView({ behavior: 'smooth' }), 50) }
        setBusy(null)
    }

    if (busy) return (
        <div className="card relative isolate flex flex-col items-center gap-3 overflow-hidden p-6 text-center font-semibold">
            <span aria-hidden className="magic-halo" />
            <Beha pose="think" size={200} />{busy}
            <p className="text-sm font-normal text-muted">Бэха колдует над вашим фото ✂️</p>
        </div>
    )

    return (
        <div className="flex flex-col gap-4">
            {!grid && (
                <>
                    <label className={`card relative mx-auto flex aspect-[3/4] w-full max-w-[280px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden text-center font-bold ${photo ? 'border-mint' : 'border-dashed border-brass/60 text-brass'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {photo ? <img src={URL.createObjectURL(photo)} alt="Ваше фото" className="h-full w-full object-cover" /> : <>
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brass/15"><Camera size={32} /></span>
                            Сделать селфи<span className="px-6 text-xs font-normal text-muted">Анфас, ровный свет, лоб открыт</span>
                        </>}
                        <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(f); e.target.value = '' }} />
                    </label>
                    {photo && <p className="-mt-2 text-center text-xs text-muted">Нажмите на фото, чтобы переснять</p>}

                    <div className="flex flex-col gap-2">
                        <p className="font-bold">Какое настроение?</p>
                        <div className="grid grid-cols-2 gap-2">
                            {vibes.map((v) => (
                                <button key={v.key} type="button" onClick={() => setVibe(v.key)}
                                    className={`card flex flex-col items-start gap-1 p-3 text-left transition-colors ${vibe === v.key ? 'border-brass bg-brass/15' : ''}`}>
                                    <span className="text-lg font-black">{v.emoji} {v.title}</span>
                                    <span className="text-xs text-muted">{v.names.slice(0, 3).join(', ')}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-start gap-3 text-sm text-muted">
                        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#6CC0A8]" />
                        <span>Согласен на обработку фото нейросетью fal.ai (США) для примерки. Фото не сохраняется. <Link href="/privacy" className="underline">Подробнее</Link></span>
                    </label>
                    <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden />
                    {error && <p className="text-sm font-semibold text-danger">{error}</p>}
                    <MagicButton title="Примерить 4 стрижки" subtitle={!photo ? 'Сначала сделайте селфи' : !consent ? 'Отметьте согласие' : 'Бесплатно, до минуты'} disabled={!photo || !consent} onClick={runGrid} />
                </>
            )}

            {grid && (
                <section id="result" className="card relative isolate flex flex-col gap-3 overflow-hidden border-brass/60 p-4 shadow-[0_0_24px_rgba(212,176,106,0.18)]">
                    <span aria-hidden className="magic-halo" />
                    <div><h2 className="text-xl font-black text-brass">Вот вы с новыми стрижками ✨</h2><p className="text-sm text-muted">Нажмите на понравившуюся</p></div>
                    <div className="grid grid-cols-2 gap-2">
                        {cur.names.map((name, i) => (
                            <button type="button" key={i} onClick={() => setZoom({ img: grid.img, i, label: name, cut: i })} className="relative aspect-square overflow-hidden rounded-xl bg-cover" style={tile(grid.img, i)}>
                                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-left text-xs font-semibold text-white">{name}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted">Это приблизительно. Мастер оценит толщину и густоту ваших волос на консультации.</p>
                    <a href={bookUrl} className="btn-primary w-full"><Scissors size={20} />Записаться к Бэхе</a>
                    <button type="button" className="btn-ghost w-full" onClick={() => { setGrid(null); setAngles(null) }}><RotateCcw size={18} />Другое настроение или фото</button>
                    {left !== null && <p className="text-center text-xs text-muted">Осталось примерок сегодня: {left}</p>}
                    {error && <p className="text-sm font-semibold text-danger">{error}</p>}
                </section>
            )}

            {grid && angles && (
                <section id="angles" className="card flex flex-col gap-3 p-4">
                    <h2 className="text-lg font-black">{cur.names[angles.cut]} со всех сторон</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {ANGLES.map((a, i) => (
                            <button type="button" key={a} onClick={() => setZoom({ img: angles.img, i, label: `${cur.names[angles.cut]} · ${a}`, cut: null })} className="relative aspect-square overflow-hidden rounded-xl bg-cover" style={tile(angles.img, i)}>
                                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-left text-xs font-semibold text-white">{a}</span>
                            </button>
                        ))}
                    </div>
                    <a href={bookUrl} className="btn-primary w-full"><Scissors size={20} />Хочу так — записаться</a>
                </section>
            )}

            {zoom && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4" onClick={() => setZoom(null)}>
                    <span className="aspect-square w-full max-w-xl rounded-xl bg-cover" style={tile(zoom.img, zoom.i)} />
                    <span className="text-lg font-bold text-white">{zoom.label}</span>
                    <div className="flex w-full max-w-xl flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                        <a href={bookUrl} className="btn-primary w-full"><Scissors size={20} />Хочу эту — записаться</a>
                        {zoom.cut !== null && (left === null || left > 0) && (
                            <MagicButton title="Посмотреть со всех сторон" subtitle="Сбоку, вполоборота и затылок" icon={<Sparkles className="magic-icon h-6 w-6" strokeWidth={2.4} />} onClick={() => runAngles(zoom.cut!)} />
                        )}
                        <button type="button" className="btn-ghost w-full" onClick={() => setZoom(null)}>Закрыть</button>
                    </div>
                </div>
            )}
        </div>
    )
}
