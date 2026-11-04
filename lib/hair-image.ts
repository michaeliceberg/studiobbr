import 'server-only'
import type { Cut, Hair } from './ai'

// Примерка: Nano Banana (Gemini 2.5 Flash Image) на fal.ai. Одна картинка — сетка 2×2: четыре стрижки сразу или одна стрижка с четырёх сторон.
// Проба 04.11.2026: лицо, борода и цвет волос держатся во всех клетках; FLUX Kontext менял стрижку слабо, Seedream рисовал других людей.
// Цена одна и та же за сетку (~$0.04), то есть ~1 цент за клетку. sync_mode: картинка приходит в ответе, у сервиса не хранится.
const ENDPOINT = '/fal-ai/nano-banana/edit'

const TEXTURE: Record<string, string> = { 'Прямые': 'straight', 'Волнистые': 'wavy', 'Кудрявые': 'curly' }
const DENSITY: Record<string, string> = { 'Густые': 'thick, dense', 'Средние': 'medium density', 'Редкие': 'thin, sparse' }
const THICK: Record<string, string> = { 'Тонкие': 'fine', 'Средние': 'medium', 'Жёсткие': 'coarse' }

// Миллиметры модель не понимает (проверено 04.11.2026: «6 mm» оставляло длинную укладку), поэтому длины описываем словами.
const lengthWord = (mm: number) => mm <= 3 ? 'clipped very close to the skin' : mm <= 12 ? 'buzzed very short' : mm <= 40 ? 'short' : mm <= 80 ? 'medium length' : 'long'

// В запросе — проверенные мастером волосы: иначе нейросеть нарисует густую шевелюру там, где её не будет.
const hairWords = (hair?: Hair) => (hair ? `${DENSITY[hair.hair_density] ?? ''} ${THICK[hair.hair_thick] ?? ''} ${TEXTURE[hair.hair_texture] ?? ''}`.replace(/\s+/g, ' ').trim() : '') || 'his own natural'
const cutWords = (cut: Pick<Cut, 'term' | 'lengths'>) =>
    `${cut.term} (top ${lengthWord(cut.lengths.top)}, sides ${lengthWord(cut.lengths.sides)}, back ${lengthWord(cut.lengths.nape)})`
const SAME = 'Every tile shows THE SAME man from the reference photo: identical face, eyes, nose, skin, age, the same facial hair and exactly the same hair color. ' +
    'Head and shoulders, neutral light grey studio background, photorealistic barbershop catalog photo, sharp focus, natural realistic hair'

export const TILE_ORDER = ['вверху слева', 'вверху справа', 'внизу слева', 'внизу справа']
export const ANGLES = ['Спереди', 'Сбоку', 'Вполоборота', 'Затылок']

// Сетка 2×2: четыре разные стрижки спереди, по порядку слева направо, сверху вниз.
export const cutsGridPrompt = (cuts: Pick<Cut, 'term' | 'lengths'>[], hair?: Hair) =>
    `Create one image: a clean 2x2 grid of 4 square photo tiles with thin white gaps. ${SAME} (${hairWords(hair)} hair). ` +
    `Front view in every tile. Only the haircut differs, one per tile, left to right, top to bottom: ` +
    cuts.map((c, i) => `${i + 1}) ${cutWords(c)}`).join('; ') + '. Make the four haircuts clearly different from each other. Keep the same hairline. No text, no captions, no numbers.'

// Сетка 2×2: одна стрижка с четырёх сторон.
export const anglesGridPrompt = (cut: Pick<Cut, 'term' | 'lengths'>, hair?: Hair) =>
    `Create one image: a clean 2x2 grid of 4 square photo tiles with thin white gaps. ${SAME} (${hairWords(hair)} hair), ` +
    `with the same haircut in every tile: ${cutWords(cut)}. Tiles: 1) front view, 2) left side profile, 3) right three-quarter view, 4) back of the head. ` +
    'Keep the same hairline. No text, no captions, no numbers.'

export async function generateHairGrid(imageUrl: string, prompt: string) {
    const res = await fetch(`${process.env.FAL_API_BASE || 'https://fal.run'}${ENDPOINT}`, {
        method: 'POST',
        headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_urls: [imageUrl], num_images: 1, output_format: 'jpeg', aspect_ratio: '1:1', sync_mode: true }),
        signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const j = await res.json() as { images?: { url?: string }[] }
    const url = j.images?.[0]?.url
    if (!url) throw new Error('fal: no image')
    return url
}

// Публичная примерка /try: волосы мастер не проверял, поэтому вместо подбора ИИ — готовые наборы по настроению клиента.
type PublicCut = { name: string; term: string; lengths: Cut['lengths'] }
const L = (top: number, sides: number, nape = sides) => ({ top, crown: top, sides, nape })
export const TRY_SETS: Record<string, { title: string; emoji: string; cuts: PublicCut[] }> = {
    short: { title: 'Коротко и чётко', emoji: '⚡', cuts: [
        { name: 'Текстурный кроп', term: 'textured crop with a low skin fade', lengths: L(30, 2) },
        { name: 'Кроп Цезарь', term: 'Caesar cut with a mid fade', lengths: L(20, 3) },
        { name: 'Бокс', term: 'classic short boxing haircut', lengths: L(15, 3) },
        { name: 'Базз-кат', term: 'buzz cut with a sharp line-up', lengths: L(6, 3) },
    ] },
    classic: { title: 'Классика', emoji: '🎩', cuts: [
        { name: 'Боковой пробор', term: 'classic side part with a taper', lengths: L(60, 9) },
        { name: 'Айви Лиг', term: 'Ivy League cut', lengths: L(45, 9) },
        { name: 'Помпадур', term: 'short pompadour with tapered sides', lengths: L(80, 6) },
        { name: 'Зачёс назад', term: 'slicked back hair with a low taper', lengths: L(80, 9) },
    ] },
    bold: { title: 'Смело и модно', emoji: '🔥', cuts: [
        { name: 'Квифф', term: 'quiff with a high skin fade', lengths: L(70, 2) },
        { name: 'Французский кроп', term: 'French crop with a textured fringe and drop fade', lengths: L(35, 2) },
        { name: 'Андеркат', term: 'disconnected undercut', lengths: L(90, 3) },
        { name: 'Месси-топ', term: 'messy textured top with a taper fade', lengths: L(55, 6) },
    ] },
    long: { title: 'Подлиннее', emoji: '🌊', cuts: [
        { name: 'Флоу', term: 'medium length flow hairstyle', lengths: L(110, 60) },
        { name: 'Шторки', term: 'curtain hairstyle with a middle part', lengths: L(100, 40) },
        { name: 'Кудрявый верх', term: 'curly textured top with a low taper', lengths: L(70, 9) },
        { name: 'Удлинённый пробор', term: 'long side part hairstyle', lengths: L(110, 30) },
    ] },
}
