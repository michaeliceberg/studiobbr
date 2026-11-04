'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { acceptConsent, confirmHair } from '@/app/actions'
import { compressPhoto } from '@/lib/photo-client'
import { FACE_SHAPES, HAIR_DENSITY, HAIR_TEXTURE, HAIR_THICK } from '@/lib/format'
import type { Analysis, Cut, Hair, Prefs, Suggestion } from '@/lib/ai'
import { Chips } from './chips'

const PREFS: { key: Exclude<keyof Prefs, 'wish'>; title: string; options: string[] }[] = [
    { key: 'length', title: 'Длина', options: ['Короче', 'Сохранить длину', 'Хочу отрастить'] },
    { key: 'style', title: 'Стиль', options: ['Классика', 'Деловой', 'Спортивный', 'Модный'] },
    { key: 'care', title: 'Укладка дома', options: ['Без укладки', 'До 5 минут', 'Готов укладывать'] },
    { key: 'beard', title: 'Борода', options: ['Без бороды', 'Оставить как есть', 'Хочу отрастить'] },
]
const ERR: Record<string, string> = {
    'no-ai': 'ИИ не подключён: нет ключа на сервере.',
    'no-consent': 'Сначала отметьте согласие клиента.',
    ai: 'ИИ не ответил. Нажмите ещё раз.',
}
const errText = (code?: string) => ERR[code ?? ''] ?? 'Что-то пошло не так. Нажмите ещё раз.'

// Подбор стрижки в кресле: фото → ИИ прикидывает лицо и волосы → мастер ПОДТВЕРЖДАЕТ руками → только тогда варианты.
// Порядок менять нельзя: иначе ИИ предложит то, что на этих волосах не получится.
export function ConsultFlow({ clientId, hasConsent, saved }: { clientId: number; hasConsent: boolean; saved: Hair }) {
    const router = useRouter()
    const [consent, setConsent] = useState(hasConsent)
    const [front, setFront] = useState<File | null>(null)
    const [side, setSide] = useState<File | null>(null)
    const [prefs, setPrefs] = useState<Prefs>({ length: 'Короче', style: 'Деловой', care: 'До 5 минут', beard: 'Оставить как есть', wish: '' })
    const [hair, setHair] = useState<Hair>(saved)
    const [why, setWhy] = useState('')
    const [step, setStep] = useState<'photo' | 'confirm' | 'cuts'>('photo')
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<Suggestion | null>(null)
    const set = (k: keyof Hair) => (v: string) => setHair((h) => ({ ...h, [k]: v }))
    const confirmed = hair.face_shape && hair.hair_density && hair.hair_thick && hair.hair_texture

    const analyze = async () => {
        if (!front) return
        setBusy('Смотрю на форму лица и волосы…'); setError(null)
        try {
            if (consent && !hasConsent) await acceptConsent(clientId)
            const f = new FormData()
            f.append('client_id', String(clientId))
            f.append('front', await compressPhoto(front), 'front.jpg')
            if (side) f.append('side', await compressPhoto(side), 'side.jpg')
            const res = await fetch('/api/consult/analyze', { method: 'POST', body: f })
            const a = await res.json() as Analysis & { error?: string }
            if (!res.ok) setError(errText(a.error))
            else if (!a.ok) setError(a.note || 'Не получилось разобрать фото. Переснимите анфас при ровном свете.')
            else {
                // ИИ лишь предлагает: то, что мастер уже проверял раньше, не затираем
                setHair({
                    face_shape: a.face_shape || saved.face_shape, hair_density: saved.hair_density || a.hair_density,
                    hair_thick: saved.hair_thick || a.hair_thick, hair_texture: saved.hair_texture || a.hair_texture,
                    hair_growth: saved.hair_growth || a.hair_growth,
                })
                setWhy(a.face_why); setStep('confirm')
            }
        } catch { setError(errText()) }
        setBusy(null)
    }
    const suggest = async () => {
        setBusy('Подбираю варианты…'); setError(null)
        try {
            await confirmHair(clientId, hair)
            const res = await fetch('/api/consult/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hair, prefs }) })
            const s = await res.json() as Suggestion & { error?: string }
            if (!res.ok) setError(errText(s.error))
            else { setResult(s); setStep('cuts'); window.scrollTo({ top: 0 }) }
        } catch { setError(errText()) }
        setBusy(null)
    }
    const pick = (c: Cut) => {
        const q = new URLSearchParams({
            cut_name: c.name, len_top: String(c.lengths.top), len_crown: String(c.lengths.crown), len_sides: String(c.lengths.sides), len_nape: String(c.lengths.nape),
            brief: c.brief.map((s, i) => `${i + 1}. ${s}`).join('\n') + (c.styling ? `\nУкладка: ${c.styling}` : ''), refresh_weeks: String(c.refresh_weeks),
        })
        router.push(`/clients/${clientId}/visits/new?${q}`)
    }
    const shot = (label: string, file: File | null, onPick: (f: File) => void) => (
        <label className="card flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden text-sm text-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {file ? <img src={URL.createObjectURL(file)} alt={label} className="h-full w-full object-cover" /> : <><Camera size={32} />{label}</>}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} />
        </label>
    )

    if (step === 'cuts' && result) return (
        <div className="flex flex-col gap-3">
            {result.cuts.map((c, i) => (
                <article key={i} className="card flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div><h2 className="text-lg font-bold">{i + 1}. {c.name}</h2><p className="text-sm text-muted">{c.term}</p></div>
                        <span className="rounded-full bg-mint/15 px-3 py-1 text-sm font-bold text-mint">{Math.round(c.match)}%</span>
                    </div>
                    <p>{c.why}</p>
                    <p className="text-sm text-muted">Верх {c.lengths.top} · макушка {c.lengths.crown} · бока {c.lengths.sides} · затылок {c.lengths.nape} мм</p>
                    <ol className="list-decimal pl-5 text-sm">{c.brief.map((s, j) => <li key={j}>{s}</li>)}</ol>
                    <p className="text-sm text-muted">Укладка: {c.styling}. Обновлять раз в {c.refresh_weeks} нед.</p>
                    <button className="btn-primary w-full" onClick={() => pick(c)}>Выбрать</button>
                </article>
            ))}
            {result.avoid.length > 0 && (
                <div className="card p-4 text-sm"><h2 className="mb-2 font-bold text-danger">Чего избегать</h2>
                    {result.avoid.map((a, i) => <p key={i}><b>{a.name}</b>: {a.why}</p>)}
                </div>
            )}
            <button className="btn-ghost w-full" onClick={() => setStep('confirm')}>Назад к параметрам</button>
        </div>
    )

    if (step === 'confirm') return (
        <div className="flex flex-col gap-4">
            <div className="card border-brass/50 bg-brass/10 p-4 text-sm">
                <b className="text-brass">Проверьте руками.</b> Это прикидка по фото. Густоту, толщину и вихры видно только на настоящих волосах.
                {why && <span className="mt-1 block text-muted">{why}</span>}
            </div>
            <div className="card flex flex-col gap-4 p-4">
                <Chips label="Форма лица" options={FACE_SHAPES} value={hair.face_shape} onChange={set('face_shape')} />
                <Chips label="Густота" options={HAIR_DENSITY} value={hair.hair_density} onChange={set('hair_density')} />
                <Chips label="Толщина" options={HAIR_THICK} value={hair.hair_thick} onChange={set('hair_thick')} />
                <Chips label="Тип" options={HAIR_TEXTURE} value={hair.hair_texture} onChange={set('hair_texture')} />
                <div>
                    <label className="label" htmlFor="growth">Вихры, линия роста</label>
                    <input id="growth" value={hair.hair_growth} onChange={(e) => set('hair_growth')(e.target.value)} className="input" />
                </div>
            </div>
            {error && <p className="text-sm font-semibold text-danger">{error}</p>}
            <button className="btn-primary w-full" disabled={!confirmed || !!busy} onClick={suggest}>{busy ?? 'Подтверждаю, показать стрижки'}</button>
            <button className="btn-ghost w-full" onClick={() => setStep('photo')}>Назад</button>
        </div>
    )

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
                {shot('Анфас', front, setFront)}
                {shot('Профиль, по желанию', side, setSide)}
            </div>
            <p className="text-sm text-muted">Ровный свет, волосы сухие, лоб открыт. Фото не сохраняется: уходит на разбор один раз.</p>
            {!hasConsent && (
                <label className="card flex items-start gap-3 p-4 text-sm">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-[#6CC0A8]" />
                    Клиент согласен на обработку данных и съёмку
                </label>
            )}
            <div className="card flex flex-col gap-4 p-4">
                {PREFS.map((p) => <Chips key={p.key} label={p.title} options={p.options} value={prefs[p.key]} onChange={(v) => setPrefs((x) => ({ ...x, [p.key]: v }))} />)}
                <div>
                    <label className="label" htmlFor="wish">Пожелания и ограничения</label>
                    <textarea id="wish" rows={2} value={prefs.wish} onChange={(e) => setPrefs((x) => ({ ...x, wish: e.target.value }))} placeholder="Работаю в офисе, не люблю фейд под ноль" className="input" />
                </div>
            </div>
            {error && <p className="text-sm font-semibold text-danger">{error}</p>}
            <button className="btn-primary w-full" disabled={!front || !consent || !!busy} onClick={analyze}>{busy ?? 'Разобрать фото'}</button>
            <button className="btn-ghost w-full" onClick={() => setStep('confirm')}>Без фото, задать параметры вручную</button>
        </div>
    )
}
