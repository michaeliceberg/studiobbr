import { addMaster, bookingLink, chatAppointments, appointmentLink, fmtWhen, getMasters, masterPayload, notifyMasters, removeMaster, tgSend } from '@/lib/tg'
import { OPERATOR } from '@/lib/legal'

// Обновления Telegram приносит опросчик (scripts/tg-poller.mjs) с секретным заголовком.
type Msg = { chat: { id: number; type: string }; from?: { first_name?: string; last_name?: string; username?: string }; text?: string }

const B = { book: '📅 Записаться', mine: '🗓 Мои записи', where: '📍 Как нас найти' }
const menu = { keyboard: [[{ text: B.book }, { text: B.mine }], [{ text: B.where }]], resize_keyboard: true, is_persistent: true }
const who = (m: Msg) => [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || (m.from?.username ? '@' + m.from.username : 'Без имени')

const sendBooking = (chatId: string) => tgSend(chatId, 'Выберите услугу, день и время — запись сразу подтвердится 🪓',
    { reply_markup: { inline_keyboard: [[{ text: '📅 Записаться онлайн', url: bookingLink(chatId) }]] } })

export async function POST(req: Request) {
    if (!process.env.TG_WEBHOOK_SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TG_WEBHOOK_SECRET)
        return new Response('forbidden', { status: 403 })
    const u = await req.json().catch(() => null) as { message?: Msg } | null
    const m = u?.message
    if (!m?.chat || m.chat.type !== 'private') return Response.json({ ok: true })
    try { await handle(m) } catch (e) { console.error('tg', e) }
    return Response.json({ ok: true })
}

async function handle(m: Msg) {
    const chatId = String(m.chat.id)
    const text = (m.text ?? '').trim()
    const masters = await getMasters()
    const isMaster = masters.some((x) => x.chat_id === chatId)

    // Подключение мастера: ссылка /start m_<подпись> со страницы «Услуги и график»
    if (text === `/start ${masterPayload()}`) {
        await addMaster(chatId, who(m))
        await tgSend(chatId, '✅ Подключено. Сюда будут приходить новые записи и отмены.\nОтключиться — /stopmaster')
        await notifyMasters(`👤 К уведомлениям подключился ${who(m)}`, chatId)
        return
    }
    if (isMaster && text === '/stopmaster') {
        await removeMaster(chatId)
        await tgSend(chatId, 'Готово, уведомления о записях больше не придут.')
        return
    }
    if (isMaster && (text === '/start' || text === '/zapis')) {
        await tgSend(chatId, `Вы подключены как мастер: сюда приходят записи и отмены.\nСсылка для клиентов — её можно пересылать: ${bookingLink(chatId).split('?')[0]}`)
        return
    }

    if (text === '/start' || text.startsWith('/start ')) {
        await tgSend(chatId, `Привет! Это BBR Studio, барбершоп Бэхи 🪓\n${OPERATOR.address}\n\nЗдесь можно записаться на стрижку и посмотреть свои записи.`, { reply_markup: menu })
        await sendBooking(chatId)
        return
    }
    if (text === B.book || text === '/zapis' || /^(записаться|запись)$/i.test(text)) { await sendBooking(chatId); return }
    if (text === B.mine || text === '/mine') {
        const list = await chatAppointments(chatId)
        if (!list.length) { await tgSend(chatId, 'Будущих записей нет.', { reply_markup: { inline_keyboard: [[{ text: '📅 Записаться', url: bookingLink(chatId) }]] } }); return }
        await tgSend(chatId, list.map((a) => `• ${fmtWhen(a.starts_at)} — ${a.service_name}`).join('\n'),
            { reply_markup: { inline_keyboard: list.map((a) => [{ text: `📋 ${fmtWhen(a.starts_at)}`, url: appointmentLink(a.token) }]) } })
        return
    }
    if (text === B.where) { await tgSend(chatId, `📍 ${OPERATOR.address}\n📞 ${OPERATOR.phone}`); return }

    // Любое другое сообщение клиента — мастерам, чтобы не потерялось
    if (!isMaster && text) {
        await notifyMasters(`💬 ${who(m)} пишет в бота:\n${text.slice(0, 1000)}`)
        await tgSend(chatId, 'Передал мастеру — он ответит, как освободится. А записаться можно сразу 👇', { reply_markup: menu })
    }
}
