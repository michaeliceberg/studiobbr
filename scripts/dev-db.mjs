// Локальная база для разработки без установки Postgres: npm run db:local (данные в .local-db).
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

const db = await PGlite.create('./.local-db')
const server = new PGLiteSocketServer({ db, port: 5433, host: '127.0.0.1' })
await server.start()
console.log('local db on 127.0.0.1:5433')
