// Опросчик Telegram для бота BBR Studio (отдельный pm2-процесс `bbr-studio-tg-poller`), как в Garaggio.
// С сервера Telegram доступен только через прокси (TG_API_BASE), вебхук до сервера не доходит, поэтому long-polling,
// а каждое обновление отдаём в наш /api/tg на localhost — вся логика бота там.
//   pm2 start "node --env-file=.env scripts/tg-poller.mjs" --name bbr-studio-tg-poller
import fs from 'node:fs'
import path from 'node:path'

const TOKEN = process.env.TG_BOT_TOKEN
const BASE = process.env.TG_API_BASE || 'https://api.telegram.org'
const LOCAL = `http://127.0.0.1:${process.env.PORT || 3006}/api/tg`
const OFFSET_FILE = path.join(process.env.UPLOAD_DIR || '.', 'tg-offset.json')

const api = async (method, body, timeoutMs = 40_000) => {
    const r = await fetch(`${BASE}/bot${TOKEN}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
    })
    const j = await r.json()
    if (!j.ok) throw new Error(`${method}: ${j.description}`)
    return j.result
}
const readOffset = () => { try { return JSON.parse(fs.readFileSync(OFFSET_FILE, 'utf8')).offset ?? 0 } catch { return 0 } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await api('deleteWebhook', {}).catch((e) => console.error(e.message))
await api('setMyCommands', { commands: [{ command: 'try', description: 'Примерить стрижку по селфи' }, { command: 'zapis', description: 'Записаться на стрижку' }, { command: 'mine', description: 'Мои записи' }, { command: 'start', description: 'Меню' }] }).catch((e) => console.error(e.message))
await api('setMyDescription', { description: 'BBR Studio — барбершоп в Королёве 🪓\nОктябрьский бульвар, 26, 2-й этаж\n\n✨ Примерка стрижек по селфи\n📅 Запись на удобное время\n🗓 Ваши записи и отмена\n\nНажмите «Старт».' }).catch((e) => console.error(e.message))
await api('setMyShortDescription', { short_description: 'BBR Studio 🪓 Запись на стрижку онлайн · Королёв' }).catch((e) => console.error(e.message))
console.log('bbr-studio tg poller started')

let offset = readOffset()
for (;;) {
    try {
        const updates = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] })
        for (const u of updates) {
            try {
                const r = await fetch(LOCAL, {
                    method: 'POST', body: JSON.stringify(u),
                    headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': process.env.TG_WEBHOOK_SECRET },
                })
                if (!r.ok) console.error('local', r.status)
            } catch (e) { console.error('local', e.message) }
            offset = u.update_id + 1
            fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset }))
        }
    } catch (e) {
        console.error('poll', e.message)
        await sleep(5000)
    }
}
