import 'server-only'
import type { Cut, Hair } from './ai'

// Примерка: FLUX Kontext на fal.ai меняет на фото только причёску. aspect_ratio не задаём: с ним искажается лицо и кадр. sync_mode: картинка приходит прямо в ответе
// и не сохраняется в истории запросов сервиса. fal.run с сервера доступен напрямую; FAL_API_BASE — для тестов.
const ENDPOINT = '/fal-ai/flux-pro/kontext'

const TEXTURE: Record<string, string> = { 'Прямые': 'straight', 'Волнистые': 'wavy', 'Кудрявые': 'curly' }
const DENSITY: Record<string, string> = { 'Густые': 'thick, dense', 'Средние': 'medium density', 'Редкие': 'thin, sparse' }
const THICK: Record<string, string> = { 'Тонкие': 'fine', 'Средние': 'medium', 'Жёсткие': 'coarse' }

// Миллиметры модель не понимает (проверено 04.11.2026: «6 mm» оставляло длинную укладку), поэтому длины описываем словами.
const lengthWord = (mm: number) => mm <= 3 ? 'clipped very close to the skin' : mm <= 12 ? 'buzzed very short' : mm <= 40 ? 'short' : mm <= 80 ? 'medium length' : 'long'

// В запросе — проверенные мастером волосы: иначе нейросеть нарисует густую шевелюру там, где её не будет.
export const hairPrompt = (cut: Pick<Cut, 'term' | 'lengths'>, hair: Hair) =>
    `Change only the hair on this man's head to this haircut: ${cut.term}. Follow the named style precisely. ` +
    `The hair on top is ${lengthWord(cut.lengths.top)}, the sides are ${lengthWord(cut.lengths.sides)}, the back is ${lengthWord(cut.lengths.nape)}. ` +
    `Natural realistic hair: ${DENSITY[hair.hair_density] ?? ''} ${THICK[hair.hair_thick] ?? ''} ${TEXTURE[hair.hair_texture] ?? ''}. Keep exactly the same hair color as in the original photo. Keep the same hairline. ` +
    `Do not change anything else: the same person, the same face shape and facial features, same skin, same facial hair, same body exactly as in the photo, same pose, same camera framing, same lighting, same background. Do not add clothes. No text.`

export async function generateHairPreview(imageUrl: string, prompt: string) {
    const res = await fetch(`${process.env.FAL_API_BASE || 'https://fal.run'}${ENDPOINT}`, {
        method: 'POST',
        headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_url: imageUrl, num_images: 1, output_format: 'jpeg', safety_tolerance: '2', sync_mode: true }),
        signal: AbortSignal.timeout(90_000),
    })
    if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const j = await res.json() as { images?: { url?: string }[]; has_nsfw_concepts?: boolean[] }
    const url = j.images?.[0]?.url
    if (!url || j.has_nsfw_concepts?.[0]) throw new Error('fal: no image')
    return url
}
