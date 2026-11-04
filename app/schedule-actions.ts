'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createAppointment, timeToMin } from '@/lib/booking'

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const int = (f: FormData, k: string, min: number, max: number, dflt: number) => { const n = parseInt(s(f, k), 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt }

export async function cancelAppointment(id: number) {
    requireAuth()
    await sql`UPDATE appointments SET status = 'cancelled' WHERE id = ${id}`
    revalidatePath('/schedule')
}

// Мастер записывает сам (клиент позвонил): может и вне рабочего времени, но не поверх чужой записи.
export async function addAppointment(f: FormData) {
    requireAuth()
    const name = s(f, 'name')
    if (!name) throw new Error('Нужно имя')
    const r = await createAppointment({ serviceId: Number(s(f, 'service_id')), day: s(f, 'day'), time: s(f, 'time'), name, phone: s(f, 'phone'), comment: s(f, 'comment'), source: 'master', consent: false })
    if ('error' in r) redirect(`/schedule/new?error=${r.error}`)
    revalidatePath('/schedule')
    redirect('/schedule')
}

export async function saveService(id: number | null, f: FormData) {
    requireAuth()
    const name = s(f, 'name')
    if (!name) return
    const row = { name, duration_min: int(f, 'duration_min', 15, 480, 60), price: int(f, 'price', 0, 1000000, 0), active: f.get('active') === 'on' }
    if (id) await sql`UPDATE services SET ${sql(row)} WHERE id = ${id}`
    else await sql`INSERT INTO services ${sql(row)}`
    revalidatePath('/schedule/settings')
}

export async function saveHours(f: FormData) {
    requireAuth()
    for (let d = 0; d < 7; d++) {
        const open = s(f, `open_${d}`), close = s(f, `close_${d}`)
        if (!open || !close) continue
        await sql`UPDATE work_hours SET is_open = ${f.get(`on_${d}`) === 'on'}, open_min = ${timeToMin(open)}, close_min = ${timeToMin(close)} WHERE weekday = ${d}`
    }
    revalidatePath('/schedule/settings')
}

export async function addClosedDay(f: FormData) {
    requireAuth()
    const day = s(f, 'day')
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) await sql`INSERT INTO closed_days (day) VALUES (${day}::date) ON CONFLICT DO NOTHING`
    revalidatePath('/schedule/settings')
}

export async function removeClosedDay(day: string) {
    requireAuth()
    await sql`DELETE FROM closed_days WHERE day = ${day}::date`
    revalidatePath('/schedule/settings')
}
