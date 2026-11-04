import 'server-only'
import type { Cut, Hair } from './ai'

// Примерка: FLUX Kontext на fal.ai меняет на фото только причёску. sync_mode: картинка приходит прямо в ответе
// и не сохраняется в истории запросов сервиса. fal.run с сервера доступен напрямую; FAL_API_BASE — для тестов.
const ENDPOINT = '/fal-ai/flux-pro/kontext'

const TEXTURE: Record<string, string> = { 'Прямые': 'straight', 'Волнистые': 'wavy', 'Кудрявые': 'curly' }
const DENSITY: Record<string, string> = { 'Густые': 'thick, dense', 'Средние': 'medium density', 'Редкие': 'thin, sparse' }
const THICK: Record<string, string> = { 'Тонкие': 'fine', 'Средние': 'medium', 'Жёсткие': 'coarse' }

// В запросе — проверенные мастером волосы: иначе нейросеть нарисует густую шевелюру там, где её не будет.
export const hairPrompt = (cut: Pick<Cut, 'term' | 'lengths'>, hair: Hair) =>
    `Change only the hairstyle of this man to a realistic ${cut.term} men's haircut: top ${cut.lengths.top} mm, crown ${cut.lengths.crown} mm, sides ${cut.lengths.sides} mm, nape ${cut.lengths.nape} mm. ` +
    `Keep his real hair: ${DENSITY[hair.hair_density] ?? ''} ${THICK[hair.hair_thick] ?? ''} ${TEXTURE[hair.hair_texture] ?? ''} hair, same natural color, same hairline, do not add volume he does not have. ` +
    `Keep exactly the same face, identity, expression, skin, beard, clothes, pose, lighting and background. Photorealistic, natural result, no text.`

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
