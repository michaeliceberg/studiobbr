// Применить db/schema.sql: npm run db:init
import fs from 'node:fs'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL)
await sql.unsafe(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
console.log('schema ok')
await sql.end()
