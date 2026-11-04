import 'server-only'
import crypto from 'node:crypto'
import { sql } from './db'

// Telegram-бот BBR Studio (как в Garaggio): с сервера Telegram доступен только через Cloudflare-прокси (TG_API_BASE),
// вебхук до сервера не доходит — обновления приносит опросчик scripts/tg-poller.mjs в /api/tg.
export const BOT = process.env.TG_BOT_USERNAME || 'studiobbr_bot'
export const tgEnabled = () => !!process.env.TG_BOT_TOKEN
const SITE = process.env.PUBLIC_URL || 'https://studiobbr.ru'

export async function tgApi<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
    const r = await fetch(`${process.env.TG_API_BASE || 'https://api.telegram.org'}/bot${process.env.TG_BOT_TOKEN}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15_000),
    })
    const j = await r.json() as { ok: boolean; result: T; description?: string }
    if (!j.ok) throw new Error(j.description || 'telegram error')
    return j.result
}
export const tgSend = (chatId: string | number, text: string, extra: Record<string, unknown> = {}) =>
    tgApi<{ message_id: number }>('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, ...extra })

// Подписи ссылок: m_<hmac> — подключение мастера; k=<чат>.<hmac> — запись из бота (подтверждение придёт в этот чат).
const sign = (v: string) => crypto.createHmac('sha256', process.env.SESSION_SECRET!).update('tg:' + v).digest('base64url').slice(0, 12)
export const masterPayload = () => `m_${sign('master')}`
export const masterLink = () => `https://t.me/${BOT}?start=${masterPayload()}`
export const botLink = () => `https://t.me/${BOT}`
export const bookingLink = (chatId: string | number) => `${SITE}/book?k=${chatId}.${sign('book' + chatId)}`
export const appointmentLink = (token: string) => `${SITE}/a/${token}`
export function chatFromBookingKey(k?: string | null) {
    const m = /^(\d+)\.([\w-]+)$/.exec(k ?? '')
    return m && m[2] === sign('book' + m[1]) ? m[1] : null
}

export const getMasters = () => sql<{ chat_id: string; name: string }[]>`SELECT chat_id::text, name FROM tg_masters ORDER BY created_at`
export const addMaster = (chatId: string, name: string) =>
    sql`INSERT INTO tg_masters (chat_id, name) VALUES (${chatId}, ${name}) ON CONFLICT (chat_id) DO UPDATE SET name = EXCLUDED.name`
export const removeMaster = (chatId: string) => sql`DELETE FROM tg_masters WHERE chat_id = ${chatId}`

// Разослать мастерам. Ошибка Telegram не должна ломать запись клиента — только в лог.
export async function notifyMasters(text: string, except?: string) {
    if (!tgEnabled()) return
    for (const m of await getMasters()) {
        if (m.chat_id === except) continue
        await tgSend(m.chat_id, text).catch((e) => console.error('tg master', m.chat_id, e))
    }
}

const fmtWhen = (d: Date) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(d)
type Appt = { token: string; name: string; phone: string; service_name: string; comment: string; starts_at: Date; staff_name: string; source: string; tg_chat_id: string | null }
async function apptByToken(token: string) {
    const [a] = await sql<Appt[]>`SELECT a.token, a.name, a.phone, a.service_name, a.comment, a.starts_at, a.source, a.tg_chat_id::text, s.name AS staff_name
        FROM appointments a JOIN staff s ON s.id = a.staff_id WHERE a.token = ${token}`
    return a
}

// Новая запись: мастерам — заявка, клиенту из бота — подтверждение с личной ссылкой (там же отмена).
export async function announceBooking(token: string) {
    if (!tgEnabled()) return
    const a = await apptByToken(token).catch(() => null)
    if (!a) return
    const from = a.tg_chat_id ? ' · из бота' : a.source === 'master' ? ' · записал мастер' : ''
    await notifyMasters(`🪓 Новая запись${from}\n${fmtWhen(a.starts_at)} — ${a.service_name} (${a.staff_name})\n${a.name}, ${a.phone}${a.comment ? `\n💬 ${a.comment}` : ''}`)
    if (a.tg_chat_id) await tgSend(a.tg_chat_id, `✅ Записали вас!\n${fmtWhen(a.starts_at)} — ${a.service_name}, мастер ${a.staff_name}.\n\nЕсли планы поменяются — отменить можно по ссылке.`,
        { reply_markup: { inline_keyboard: [[{ text: '📋 Моя запись', url: appointmentLink(a.token) }]] } }).catch((e) => console.error('tg client', e))
}
export async function announceCancel(token: string, byClient: boolean) {
    if (!tgEnabled()) return
    const a = await apptByToken(token).catch(() => null)
    if (!a) return
    await notifyMasters(`❌ Отмена${byClient ? ' клиентом' : ''}\n${fmtWhen(a.starts_at)} — ${a.service_name} (${a.staff_name})\n${a.name}, ${a.phone}`)
    if (!byClient && a.tg_chat_id) await tgSend(a.tg_chat_id, `Запись на ${fmtWhen(a.starts_at)} отменена мастером. Выберите другое время — /zapis`).catch(() => {})
}

// Будущие записи клиента, сделанные из этого чата
export const chatAppointments = (chatId: string) => sql<{ token: string; service_name: string; starts_at: Date }[]>`
    SELECT token, service_name, starts_at FROM appointments WHERE tg_chat_id = ${chatId} AND status = 'booked' AND starts_at > now() ORDER BY starts_at`
export { fmtWhen }
