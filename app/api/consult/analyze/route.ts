import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { getClient } from '@/lib/data'
import { analyzePhoto, type PhotoInput } from '@/lib/ai'

const TMP_DIR = () => path.join(process.env.UPLOAD_DIR!, 'tmp')

// Шаг 1 подбора. Фото клиента не сохраняем: только временный файл с одноразовой ссылкой (прокси рвёт большие тела),
// после разбора он удаляется. Без согласия клиента фото не принимаем.
export async function POST(req: Request) {
    if (!isAuthed()) return NextResponse.json({ error: 'auth' }, { status: 401 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'no-ai' }, { status: 503 })
    const form = await req.formData()
    const client = await getClient(Number(form.get('client_id')))
    if (!client) return NextResponse.json({ error: 'bad' }, { status: 400 })
    if (!client.pd_consent_at) return NextResponse.json({ error: 'no-consent' }, { status: 403 })
    const blobs = ['front', 'side'].map((k) => form.get(k)).filter((f): f is File => f instanceof Blob && f.size > 0 && f.size <= 8_000_000)
    if (!blobs.length) return NextResponse.json({ error: 'bad' }, { status: 400 })
    const files: string[] = []
    try {
        await fs.mkdir(TMP_DIR(), { recursive: true })
        // подчистить забытые старше 10 минут
        for (const n of await fs.readdir(TMP_DIR())) {
            const st = await fs.stat(path.join(TMP_DIR(), n)).catch(() => null)
            if (st && Date.now() - st.mtimeMs > 600_000) await fs.rm(path.join(TMP_DIR(), n), { force: true })
        }
        const photos: PhotoInput[] = await Promise.all(blobs.map(async (b) => {
            const buf = Buffer.from(await b.arrayBuffer())
            if (!process.env.ANTHROPIC_BASE_URL) return { base64: buf.toString('base64') }
            const id = crypto.randomUUID()
            const file = path.join(TMP_DIR(), `${id}.jpg`)
            await fs.writeFile(file, buf)
            files.push(file)
            return { url: `${process.env.PUBLIC_URL}/api/tmp-photo/${id}` }
        }))
        let a = await analyzePhoto(photos)
        // быстрая модель не разобрала — пробуем модель посильнее
        if (!a.ok || !a.face_shape) a = await analyzePhoto(photos, 'claude-sonnet-5-5')
        return NextResponse.json(a)
    } catch (e) {
        console.error('consult/analyze', e)
        return NextResponse.json({ error: 'ai' }, { status: 502 })
    } finally {
        await Promise.all(files.map((f) => fs.rm(f, { force: true })))
    }
}
