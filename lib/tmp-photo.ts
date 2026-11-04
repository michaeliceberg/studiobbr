import 'server-only'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'

const dir = () => path.join(process.env.UPLOAD_DIR!, 'tmp')

// Прокси рвёт тела больше ~30 КБ, поэтому фото отдаём сервисам одноразовой ссылкой (см. /api/tmp-photo). Живёт секунды.
export async function saveTmpPhoto(buf: Buffer) {
    await fs.mkdir(dir(), { recursive: true })
    for (const n of await fs.readdir(dir())) { // подчистить забытые старше 10 минут
        const st = await fs.stat(path.join(dir(), n)).catch(() => null)
        if (st && Date.now() - st.mtimeMs > 600_000) await fs.rm(path.join(dir(), n), { force: true })
    }
    const id = crypto.randomUUID()
    const file = path.join(dir(), `${id}.jpg`)
    await fs.writeFile(file, buf)
    return { file, url: `${process.env.PUBLIC_URL}/api/tmp-photo/${id}` }
}
export const removeTmpPhotos = (files: string[]) => Promise.all(files.map((f) => fs.rm(f, { force: true })))
