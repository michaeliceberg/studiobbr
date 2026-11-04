import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { getClient } from '@/lib/data'
import { analyzePhoto, type PhotoInput } from '@/lib/ai'
import { removeTmpPhotos, saveTmpPhoto } from '@/lib/tmp-photo'

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
        const photos: PhotoInput[] = await Promise.all(blobs.map(async (b) => {
            const buf = Buffer.from(await b.arrayBuffer())
            if (!process.env.ANTHROPIC_BASE_URL) return { base64: buf.toString('base64') }
            const t = await saveTmpPhoto(buf)
            files.push(t.file)
            return { url: t.url }
        }))
        let a = await analyzePhoto(photos)
        // быстрая модель не разобрала — пробуем модель посильнее
        if (!a.ok || !a.face_shape) a = await analyzePhoto(photos, 'claude-sonnet-5-5')
        return NextResponse.json(a)
    } catch (e) {
        console.error('consult/analyze', e)
        return NextResponse.json({ error: 'ai' }, { status: 502 })
    } finally {
        await removeTmpPhotos(files)
    }
}
