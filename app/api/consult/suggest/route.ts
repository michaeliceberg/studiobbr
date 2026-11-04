import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { suggestCuts, type Hair, type Prefs } from '@/lib/ai'

// Шаг 2 подбора: только после того, как мастер подтвердил форму лица и волосы. Фото сюда не приходит.
export async function POST(req: Request) {
    if (!isAuthed()) return NextResponse.json({ error: 'auth' }, { status: 401 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'no-ai' }, { status: 503 })
    const { hair, prefs } = (await req.json()) as { hair: Hair; prefs: Prefs }
    if (!hair?.face_shape || !hair.hair_density || !hair.hair_thick || !hair.hair_texture) return NextResponse.json({ error: 'not-confirmed' }, { status: 400 })
    try {
        return NextResponse.json(await suggestCuts(hair, prefs))
    } catch (e) {
        console.error('consult/suggest', e)
        return NextResponse.json({ error: 'ai' }, { status: 502 })
    }
}
