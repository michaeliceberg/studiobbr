import 'server-only'
import { sql } from './db'
import { formatPhone } from './format'

// Россия живёт без перехода на летнее время: всё расписание считаем по Москве, +03:00.
export const SLOT_STEP = 30
export const HORIZON_DAYS = 21
const LEAD_MIN = 60 // не раньше, чем через час: мастер должен успеть увидеть запись

export type Service = { id: number; staff_id: number; category: string; name: string; duration_min: number; price: number; sort: number; active: boolean }
export type Staff = { id: number; name: string; title: string }
export type WorkHours = { weekday: number; is_open: boolean; open_min: number; close_min: number }
export type Appointment = {
    id: number; token: string; client_id: number | null; service_name: string; name: string; phone: string; comment: string
    day: string; time: string; end_time: string; status: string; source: string; staff_name: string
}

export const mskToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
export const addDays = (day: string, n: number) => new Date(new Date(`${day}T12:00:00+03:00`).getTime() + n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
const weekdayOf = (day: string) => new Date(`${day}T12:00:00+03:00`).getUTCDay()
export const minToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const at = (day: string, min: number) => new Date(`${day}T${minToTime(min)}:00+03:00`)

export const getStaff = () => sql<Staff[]>`SELECT id, name, title FROM staff WHERE active ORDER BY sort, id`
export const getServices = (all = false) =>
    sql<Service[]>`SELECT * FROM services WHERE ${all ? sql`true` : sql`active`} ORDER BY sort, id`
export const getWorkHours = () => sql<WorkHours[]>`SELECT * FROM work_hours ORDER BY weekday`
export const getClosedDays = async () =>
    (await sql<{ day: string }[]>`SELECT day::text FROM closed_days WHERE day >= ${mskToday()}::date ORDER BY day`).map((d) => d.day)

const APPT = sql`a.id, a.token, a.client_id, a.service_name, a.name, a.phone, a.comment, a.status, a.source,
    to_char(a.starts_at AT TIME ZONE 'Europe/Moscow', 'YYYY-MM-DD') AS day,
    to_char(a.starts_at AT TIME ZONE 'Europe/Moscow', 'HH24:MI') AS time,
    to_char(a.ends_at AT TIME ZONE 'Europe/Moscow', 'HH24:MI') AS end_time,
    (SELECT name FROM staff WHERE id = a.staff_id) AS staff_name`

export const getAppointments = (from: string, to: string) => sql<Appointment[]>`
    SELECT ${APPT} FROM appointments a
    WHERE a.status = 'booked' AND a.starts_at >= ${at(from, 0)} AND a.starts_at < ${at(addDays(to, 1), 0)}
    ORDER BY a.starts_at`
export async function getAppointmentByToken(token: string) {
    if (!/^[0-9a-f-]{36}$/.test(token)) return null
    const [a] = await sql<Appointment[]>`SELECT ${APPT} FROM appointments a WHERE a.token = ${token}`
    return a ?? null
}

// Свободное время на день для услуги этой длительности.
export async function getSlots(serviceId: number, day: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < mskToday() || day > addDays(mskToday(), HORIZON_DAYS)) return []
    const [s] = await sql<Service[]>`SELECT * FROM services WHERE id = ${serviceId} AND active`
    if (!s) return []
    const [[h], [closed], busy] = await Promise.all([
        sql<WorkHours[]>`SELECT * FROM work_hours WHERE weekday = ${weekdayOf(day)}`,
        sql`SELECT 1 FROM closed_days WHERE day = ${day}::date`,
        sql<{ starts_at: Date; ends_at: Date }[]>`SELECT starts_at, ends_at FROM appointments WHERE status = 'booked' AND staff_id = ${s.staff_id} AND starts_at < ${at(addDays(day, 1), 0)} AND ends_at > ${at(day, 0)}`,
    ])
    if (!h?.is_open || closed) return []
    const earliest = Date.now() + LEAD_MIN * 60000
    const out: string[] = []
    for (let m = h.open_min; m + s.duration_min <= h.close_min; m += SLOT_STEP) {
        const a = at(day, m).getTime(), b = a + s.duration_min * 60000
        if (a >= earliest && !busy.some((x) => a < x.ends_at.getTime() && b > x.starts_at.getTime())) out.push(minToTime(m))
    }
    return out
}

async function findOrCreateClient(name: string, phone: string) {
    const [c] = await sql<{ id: number }[]>`SELECT id FROM clients WHERE phone = ${phone} ORDER BY id LIMIT 1`
    if (c) return c.id
    const [n] = await sql<{ id: number }[]>`INSERT INTO clients (name, phone) VALUES (${name}, ${phone}) RETURNING id`
    return n.id
}

export const activeBookingsByPhone = async (phone: string) =>
    (await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM appointments WHERE phone = ${formatPhone(phone)} AND status = 'booked' AND starts_at > now()`)[0].n

// Единственное место, где создаётся запись. Занятое время отсекает сама база: см. EXCLUDE в схеме.
export async function createAppointment(a: { serviceId: number; day: string; time: string; name: string; phone: string; comment: string; source: 'online' | 'master'; consent: boolean }) {
    const [s] = await sql<Service[]>`SELECT * FROM services WHERE id = ${a.serviceId}`
    if (!s) return { error: 'bad' as const }
    const phone = formatPhone(a.phone)
    const start = at(a.day, timeToMin(a.time))
    const end = new Date(start.getTime() + s.duration_min * 60000)
    const client_id = await findOrCreateClient(a.name, phone)
    try {
        const [row] = await sql<{ token: string }[]>`
            INSERT INTO appointments (client_id, staff_id, service_id, service_name, name, phone, comment, starts_at, ends_at, source, consent_at)
            VALUES (${client_id}, ${s.staff_id}, ${s.id}, ${s.name}, ${a.name}, ${phone}, ${a.comment}, ${start}, ${end}, ${a.source}, ${a.consent ? new Date() : null})
            RETURNING token`
        return { token: row.token }
    } catch (e) {
        if ((e as { code?: string }).code === '23P01') return { error: 'taken' as const }
        throw e
    }
}
