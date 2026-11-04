'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { formatPhone, SOURCES } from '@/lib/format'

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const mm = (f: FormData, k: string) => { const n = parseInt(s(f, k), 10); return Number.isFinite(n) && n >= 0 && n < 1000 ? n : null }

export async function saveClient(id: number | null, f: FormData) {
    requireAuth()
    const name = s(f, 'name')
    if (!name) throw new Error('Нужно имя')
    const source = SOURCES.some((x) => x.id === s(f, 'source')) ? s(f, 'source') : ''
    const phone = formatPhone(s(f, 'phone'))
    const notes = s(f, 'notes')
    const birthday = s(f, 'birthday') || null
    const consent = f.get('consent') === 'on'
    const hair = { face_shape: s(f, 'face_shape'), hair_density: s(f, 'hair_density'), hair_thick: s(f, 'hair_thick'), hair_texture: s(f, 'hair_texture'), hair_growth: s(f, 'hair_growth') }
    const checked = Object.values(hair).some(Boolean)
    const [row] = id
        ? await sql<{ id: number }[]>`UPDATE clients SET name = ${name}, phone = ${phone}, notes = ${notes}, source = ${source}, birthday = ${birthday}, ${sql(hair)},
            hair_checked_at = CASE WHEN ${checked} THEN COALESCE(hair_checked_at, now()) ELSE hair_checked_at END,
            pd_consent_at = CASE WHEN ${consent} THEN COALESCE(pd_consent_at, now()) ELSE NULL END
            WHERE id = ${id} RETURNING id`
        : await sql<{ id: number }[]>`INSERT INTO clients ${sql({ name, phone, notes, source, birthday, ...hair, hair_checked_at: checked ? new Date() : null, pd_consent_at: consent ? new Date() : null })} RETURNING id`
    revalidatePath('/')
    redirect(`/clients/${row.id}`)
}

export async function deleteClient(id: number) {
    requireAuth()
    await sql`DELETE FROM clients WHERE id = ${id}`
    revalidatePath('/')
    redirect('/')
}

export async function saveVisit(clientId: number, f: FormData) {
    requireAuth()
    const refresh_weeks = Math.min(26, Math.max(1, parseInt(s(f, 'refresh_weeks'), 10) || 4))
    const visit_date = s(f, 'visit_date') || new Date().toISOString().slice(0, 10)
    const [v] = await sql<{ id: number }[]>`
        INSERT INTO visits (client_id, visit_date, master, cut_name, len_top, len_crown, len_sides, len_nape, brief, notes, refresh_weeks, next_date)
        VALUES (${clientId}, ${visit_date}, ${s(f, 'master')}, ${s(f, 'cut_name')}, ${mm(f, 'len_top')}, ${mm(f, 'len_crown')}, ${mm(f, 'len_sides')}, ${mm(f, 'len_nape')},
            ${s(f, 'brief')}, ${s(f, 'notes')}, ${refresh_weeks}, ${visit_date}::date + ${refresh_weeks * 7}::int)
        RETURNING id`
    revalidatePath('/')
    redirect(`/visits/${v.id}`)
}

export async function deleteVisit(id: number, clientId: number) {
    requireAuth()
    await sql`DELETE FROM visits WHERE id = ${id}`
    revalidatePath(`/clients/${clientId}`)
    redirect(`/clients/${clientId}`)
}

// Итог консультации: мастер подтвердил параметры — пишем их в карточку клиента.
export async function confirmHair(clientId: number, h: { face_shape: string; hair_density: string; hair_thick: string; hair_texture: string; hair_growth: string }) {
    requireAuth()
    await sql`UPDATE clients SET face_shape = ${h.face_shape}, hair_density = ${h.hair_density}, hair_thick = ${h.hair_thick}, hair_texture = ${h.hair_texture},
        hair_growth = ${h.hair_growth}, hair_checked_at = now() WHERE id = ${clientId}`
    revalidatePath(`/clients/${clientId}`)
}

export async function acceptConsent(clientId: number) {
    requireAuth()
    await sql`UPDATE clients SET pd_consent_at = COALESCE(pd_consent_at, now()) WHERE id = ${clientId}`
}
