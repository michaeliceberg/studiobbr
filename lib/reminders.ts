import 'server-only'
import { sql } from './db'
import { appointmentLink, fmtWhen, notifyMasters, tgEnabled, tgSend } from './tg'

// Напоминания клиентам из бота (cron раз в 15 минут: /api/cron/reminders).
// • day  — накануне (за 20–30 ч до записи, только с 10:00 до 21:00 МСК), кнопки «Приеду» / «Перенести».
// • soon — за 2 часа («скоро стрижка»).
// Пишем только тем, кто записался через бота (tg_chat_id); reminder_log.ref гарантирует один раз на запись.
type Row = { id: number; token: string; name: string; service_name: string; starts_at: Date; tg_chat_id: string; staff_name: string }

const mskHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', hour12: false }).format(new Date()))
const first = (n: string) => n.trim().split(/\s+/)[0]

async function due(minH: number, maxH: number) {
    return sql<Row[]>`
        SELECT a.id, a.token, a.name, a.service_name, a.starts_at, a.tg_chat_id::text, s.name AS staff_name
        FROM appointments a JOIN staff s ON s.id = a.staff_id
        WHERE a.status = 'booked' AND a.tg_chat_id IS NOT NULL
          AND a.starts_at > now() + make_interval(hours => ${minH}) AND a.starts_at <= now() + make_interval(hours => ${maxH})`
}

async function send(kind: 'day' | 'soon', a: Row, text: string, buttons: unknown[][]) {
    const ref = `${kind}:${a.id}:${a.starts_at.toISOString()}`
    const [claimed] = await sql<{ id: number }[]>`INSERT INTO reminder_log (ref, appt_id, chat_id, text) VALUES (${ref}, ${a.id}, ${a.tg_chat_id}, ${text}) ON CONFLICT (ref) DO NOTHING RETURNING id`
    if (!claimed) return false
    try { await tgSend(a.tg_chat_id, text, { reply_markup: { inline_keyboard: buttons } }); return true }
    catch (e) { console.error('reminder', ref, e); await sql`DELETE FROM reminder_log WHERE id = ${claimed.id}`; return false }
}

export async function runReminders(opts: { ignoreHours?: boolean } = {}) {
    if (!tgEnabled()) return { sent: 0 }
    const done: string[] = []
    const h = mskHour()
    if (opts.ignoreHours || (h >= 10 && h < 21)) {
        for (const a of await due(20, 30)) {
            const ok = await send('day', a, `Привет, ${first(a.name)}! Это BBR Studio 🪓 Напоминаем: завтра, ${fmtWhen(a.starts_at)}, ждём вас — ${a.service_name}, мастер ${a.staff_name}.\n\nВсё в силе?`,
                [[{ text: '✅ Приеду', callback_data: `ap:yes:${a.id}` }, { text: '🔁 Перенести', callback_data: `ap:move:${a.id}` }]])
            if (ok) done.push(`${a.name} — ${fmtWhen(a.starts_at)} (за сутки)`)
        }
    }
    for (const a of await due(1, 2)) {
        const ok = await send('soon', a, `${first(a.name)}, скоро стрижка! 🪓 Через пару часов, ${fmtWhen(a.starts_at)}, ждём вас на Октябрьском бульваре, 26, 2-й этаж.`,
            [[{ text: '📋 Моя запись', url: appointmentLink(a.token) }]])
        if (ok) done.push(`${a.name} — ${fmtWhen(a.starts_at)} (за 2 часа)`)
    }
    if (done.length) await notifyMasters(`🔔 Бот напомнил клиентам:\n${done.map((d) => `• ${d}`).join('\n')}`)
    return { sent: done.length }
}
