import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { sql } from '@/lib/db'
import { getClient } from '@/lib/data'
import type { Cut, Hair } from '@/lib/ai'
import { generateHairPreview, hairPrompt } from '@/lib/hair-image'
import { removeTmpPhotos, saveTmpPhoto } from '@/lib/tmp-photo'

const DAILY_LIMIT = 40 // около $1,6 в день: защита от случайных расходов

// Примерка выбранной стрижки. Только после того, как мастер подтвердил волосы, и только с согласия клиента. Фото и результат не храним.
export async function POST(req: Request) {
    if (!isAuthed()) return NextResponse.json({ error: 'auth' }, { status: 401 })
    if (!process.env.FAL_KEY) return NextResponse.json({ error: 'no-image-ai' }, { status: 503 })
    const form = await req.formData()
    const client = await getClient(Number(form.get('client_id')))
    if (!client) return NextResponse.json({ error: 'bad' }, { status: 400 })
    if (!client.pd_consent_at) return NextResponse.json({ error: 'no-consent' }, { status: 403 })
    const photo = form.get('photo')
    if (!(photo instanceof Blob) || photo.size === 0 || photo.size > 8_000_000) return NextResponse.json({ error: 'bad' }, { status: 400 })
    const cut = JSON.parse(String(form.get('cut') ?? '{}')) as Pick<Cut, 'term' | 'lengths'>
    const hair = JSON.parse(String(form.get('hair') ?? '{}')) as Hair
    if (!cut.term || !cut.lengths) return NextResponse.json({ error: 'bad' }, { status: 400 })
    if (!hair.hair_density || !hair.hair_thick || !hair.hair_texture) return NextResponse.json({ error: 'not-confirmed' }, { status: 400 })
    const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM ai_images WHERE created_at > now() - interval '1 day'`
    if (n >= DAILY_LIMIT) return NextResponse.json({ error: 'limit' }, { status: 429 })
    const buf = Buffer.from(await photo.arrayBuffer())
    const files: string[] = []
    try {
        let imageUrl = `data:image/jpeg;base64,${buf.toString('base64')}`
        if (process.env.FAL_API_BASE) {
            const t = await saveTmpPhoto(buf)
            files.push(t.file)
            imageUrl = t.url
        }
        const image = await generateHairPreview(imageUrl, hairPrompt(cut, hair))
        await sql`INSERT INTO ai_images DEFAULT VALUES`
        return NextResponse.json({ image })
    } catch (e) {
        console.error('consult/preview', e)
        return NextResponse.json({ error: 'ai' }, { status: 502 })
    } finally {
        await removeTmpPhotos(files)
    }
}
