import 'server-only'
import type { Cut, Hair } from './ai'

// Примерка: FLUX Kontext на fal.ai меняет на фото только причёску. sync_mode: картинка приходит прямо в ответе
// и не сохраняется в истории запросов сервиса. fal.run с сервера доступен напрямую; FAL_API_BASE — для тестов.
const ENDPOINT = '/fal-ai/flux-pro/kontext'

const TEXTURE: Record<string, string> = { 'Прямые': 'straight', 'Волнистые': 'wavy', 'Кудрявые': 'curly' }
const DENSITY: Record<string, string> = { 'Густые': 'thick, dense', 'Средние': 'medium density', 'Редкие': 'thin, sparse' }
const THICK: Record<string, string> = { 'Тонкие': 'fine', 'Средние': 'medium', 'Жёсткие': 'coarse' }

// Миллиметры модель не понимает (проверено 04.11.2026: «6 mm» оставляло длинную укладку), поэтому длины описываем словами.
const lengthWord = (mm: number) => mm <= 3 ? 'clipped very close to the skin' : mm <= 12 ? 'buzzed very short' : mm <= 40 ? 'short' : mm <= 80 ? 'medium length' : 'long'

// В запросе — проверенные мастером волосы: иначе нейросеть нарисует густую шевелюру там, где её не будет.
export const hairPrompt = (cut: Pick<Cut, 'term' | 'lengths'>, hair: Hair) =>
    `Give this man a new haircut: ${cut.term}. The hair on top is ${lengthWord(cut.lengths.top)}, the sides are ${lengthWord(cut.lengths.sides)}, the back is ${lengthWord(cut.lengths.nape)}. ` +
    `The hair must look clearly different from the original photo, like after a real barber visit. ` +
    `The new hair is ${DENSITY[hair.hair_density] ?? ''} ${THICK[hair.hair_thick] ?? ''} ${TEXTURE[hair.hair_texture] ?? ''}, in the same natural color, with the same hairline. ` +
    `Only the hair on the head changes. The face, identity, expression, skin, beard, clothes, pose, lighting and background stay exactly the same. Photorealistic if the photo is a photo, no text.`

export async function generateHairPreview(imageUrl: string, prompt: string) {
    const res = await fetch(`${process.env.FAL_API_BASE || 'https://fal.run'}${ENDPOINT}`, {
        method: 'POST',
        headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_url: imageUrl, aspect_ratio: '3:4', num_images: 1, output_format: 'jpeg', safety_tolerance: '2', sync_mode: true }),
        signal: AbortSignal.timeout(90_000),
    })
    if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const j = await res.json() as { images?: { url?: string }[]; has_nsfw_concepts?: boolean[] }
    const url = j.images?.[0]?.url
    if (!url || j.has_nsfw_concepts?.[0]) throw new Error('fal: no image')
    return url
}
