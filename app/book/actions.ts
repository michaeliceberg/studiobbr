'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { isAuthed } from '@/lib/auth'
import { BOOKING_OPEN } from '@/lib/legal'
import { activeBookingsByPhone, createAppointment, getSlots } from '@/lib/booking'

const MAX_ACTIVE_PER_PHONE = 2
const hits = new Map<string, number[]>()
// Не больше 5 записей в час с одного адреса: страница открыта всем, без защиты её легко забить ботом.
function tooMany() {
    const ip = headers().get('x-real-ip') ?? 'local'
    const now = Date.now()
    const list = (hits.get(ip) ?? []).filter((t) => now - t < 3600000)
    hits.set(ip, list)
    if (list.length >= 5) return true
    list.push(now)
    return false
}

export async function loadSlots(serviceId: number, day: string) {
    return getSlots(serviceId, day)
}

export async function book(input: { serviceId: number; day: string; time: string; name: string; phone: string; comment: string; consent: boolean; website: string }) {
    if (!BOOKING_OPEN && !isAuthed()) return { error: 'closed' }
    if (input.website) return { error: 'bad' } // скрытое поле: его заполняют только боты
    const name = input.name.trim().slice(0, 80)
    const digits = input.phone.replace(/\D/g, '')
    if (!name || digits.length !== 11) return { error: 'contacts' }
    if (!input.consent) return { error: 'consent' }
    if (tooMany()) return { error: 'limit' }
    if ((await activeBookingsByPhone(input.phone)) >= MAX_ACTIVE_PER_PHONE) return { error: 'phone-limit' }
    if (!(await getSlots(input.serviceId, input.day)).includes(input.time)) return { error: 'taken' }
    const r = await createAppointment({ serviceId: input.serviceId, day: input.day, time: input.time, name, phone: input.phone, comment: input.comment.trim().slice(0, 500), source: 'online', consent: true })
    revalidatePath('/schedule')
    return r
}

export async function cancelByToken(token: string) {
    await sql`UPDATE appointments SET status = 'cancelled' WHERE token = ${token} AND status = 'booked' AND starts_at > now()`
    revalidatePath(`/a/${token}`)
    revalidatePath('/schedule')
}
