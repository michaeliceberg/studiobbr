import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { sql } from '@/lib/db'
import { anglesGridPrompt, cutsGridPrompt, generateHairGrid, TRY_SETS } from '@/lib/hair-image'
import { removeTmpPhotos, saveTmpPhoto } from '@/lib/tmp-photo'

// Публичная примерка для будущих клиентов (страница /try). Открыта всем, поэтому строгие лимиты на расходы:
// не больше PER_IP картинок в сутки с одного адреса и PUBLIC_DAILY на всех. Фото и результат не храним.
const PER_IP = 3
const PUBLIC_DAILY = 60 // около $2,4 в сутки

export async function POST(req: Request) {
    if (!process.env.FAL_KEY) return NextResponse.json({ error: 'off' }, { status: 503 })
    const form = await req.formData()
    if (form.get('website')) return NextResponse.json({ error: 'bad' }, { status: 400 }) // поле-ловушка для ботов
    if (form.get('consent') !== '1') return NextResponse.json({ error: 'consent' }, { status: 400 })
    const set = TRY_SETS[String(form.get('vibe'))]
    const photo = form.get('photo')
    if (!set || !(photo instanceof Blob) || photo.size === 0 || photo.size > 8_000_000) return NextResponse.json({ error: 'bad' }, { status: 400 })
    const cutIdx = form.get('cut') === null ? null : Number(form.get('cut'))
    if (cutIdx !== null && !(cutIdx >= 0 && cutIdx < set.cuts.length)) return NextResponse.json({ error: 'bad' }, { status: 400 })

    const ip = headers().get('x-real-ip') ?? 'local'
    const [{ mine, all }] = await sql<{ mine: number; all: number }[]>`
        SELECT count(*) FILTER (WHERE ip = ${ip})::int AS mine, count(*)::int AS all
        FROM ai_images WHERE kind = 'public' AND created_at > now() - interval '1 day'`
    if (mine >= PER_IP) return NextResponse.json({ error: 'limit-me' }, { status: 429 })
    if (all >= PUBLIC_DAILY) return NextResponse.json({ error: 'limit-all' }, { status: 429 })

    const buf = Buffer.from(await photo.arrayBuffer())
    const files: string[] = []
    try {
        let imageUrl = `data:image/jpeg;base64,${buf.toString('base64')}`
        if (process.env.FAL_API_BASE) { const t = await saveTmpPhoto(buf); files.push(t.file); imageUrl = t.url }
        const prompt = cutIdx === null ? cutsGridPrompt(set.cuts) : anglesGridPrompt(set.cuts[cutIdx])
        const image = await generateHairGrid(imageUrl, prompt)
        await sql`INSERT INTO ai_images (kind, ip) VALUES ('public', ${ip})`
        return NextResponse.json({ image, left: PER_IP - mine - 1 })
    } catch (e) {
        console.error('try', e)
        return NextResponse.json({ error: 'ai' }, { status: 502 })
    } finally {
        await removeTmpPhotos(files)
    }
}
