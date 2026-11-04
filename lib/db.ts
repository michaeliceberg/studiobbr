import 'server-only'
import postgres from 'postgres'

// Одно подключение на процесс (в dev Next перезагружает модули — держим клиент в globalThis).
const g = globalThis as unknown as { __sql?: ReturnType<typeof postgres> }
// Локальная база (pglite) держит одно соединение и шумит служебными сообщениями.
const local = process.env.NODE_ENV !== 'production'
export const sql = g.__sql ?? postgres(process.env.DATABASE_URL!, { max: local ? 1 : 5, onnotice: local ? () => {} : undefined })
if (process.env.NODE_ENV !== 'production') g.__sql = sql
