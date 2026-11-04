import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

// ИИ-подбор в два шага. Шаг 1: фото → форма лица и ПРЕДПОЛОЖЕНИЕ о волосах. Шаг 2: параметры, которые мастер
// подтвердил руками → варианты стрижек. На шаг 2 фото не уходит: нейросеть рисует красивое, а не реальное,
// поэтому варианты строятся только от проверенных данных. Ответы строго по схеме через tool use.
// Сервер в России ходит к Anthropic через прокси (ANTHROPIC_BASE_URL в .env), SDK подхватывает его сам.
export type PhotoInput = { url: string } | { base64: string }
export type Analysis = {
    ok: boolean; note: string
    face_shape: string; face_why: string
    hair_density: string; hair_thick: string; hair_texture: string; hair_growth: string
}
export type Cut = {
    name: string; term: string; match: number; why: string
    lengths: { top: number; crown: number; sides: number; nape: number }
    brief: string[]; styling: string; refresh_weeks: number
}
export type Suggestion = { cuts: Cut[]; avoid: { name: string; why: string }[] }
export type Prefs = { length: string; style: string; care: string; beard: string; wish: string }
export type Hair = { face_shape: string; hair_density: string; hair_thick: string; hair_texture: string; hair_growth: string }

const ANALYZE: Anthropic.Tool = {
    name: 'save_analysis',
    description: 'Сохранить разбор фото клиента',
    input_schema: {
        type: 'object',
        properties: {
            ok: { type: 'boolean', description: 'false, если на фото нет лица, лиц несколько или волос не видно' },
            note: { type: 'string', description: 'что мешает анализу и как переснять, иначе пусто' },
            face_shape: { type: 'string', enum: ['Овальное', 'Круглое', 'Квадратное', 'Прямоугольное', 'Треугольное', 'Ромбовидное', 'Сердцевидное', ''] },
            face_why: { type: 'string', description: 'одно предложение, почему такая форма' },
            hair_density: { type: 'string', enum: ['Густые', 'Средние', 'Редкие', ''] },
            hair_thick: { type: 'string', enum: ['Тонкие', 'Средние', 'Жёсткие', ''] },
            hair_texture: { type: 'string', enum: ['Прямые', 'Волнистые', 'Кудрявые', ''] },
            hair_growth: { type: 'string', description: 'вихры, линия роста, залысины, если видно, иначе пусто' },
        },
        required: ['ok', 'note', 'face_shape', 'face_why', 'hair_density', 'hair_thick', 'hair_texture', 'hair_growth'],
    },
}

const SUGGEST: Anthropic.Tool = {
    name: 'save_cuts',
    description: 'Сохранить варианты стрижек',
    input_schema: {
        type: 'object',
        properties: {
            cuts: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'русское название' },
                        term: { type: 'string', description: 'международный термин' },
                        match: { type: 'number', description: 'насколько подходит, 0–100' },
                        why: { type: 'string', description: 'почему подходит именно этому лицу и этим волосам, 1–2 предложения' },
                        lengths: {
                            type: 'object',
                            properties: { top: { type: 'number' }, crown: { type: 'number' }, sides: { type: 'number' }, nape: { type: 'number' } },
                            required: ['top', 'crown', 'sides', 'nape'],
                        },
                        brief: { type: 'array', items: { type: 'string' }, description: '4–7 шагов техзадания' },
                        styling: { type: 'string', description: 'как укладывать дома и чем' },
                        refresh_weeks: { type: 'number', description: 'через сколько недель обновлять: фейд 3, классика 4–5' },
                    },
                    required: ['name', 'term', 'match', 'why', 'lengths', 'brief', 'styling', 'refresh_weeks'],
                },
            },
            avoid: {
                type: 'array',
                items: { type: 'object', properties: { name: { type: 'string' }, why: { type: 'string' } }, required: ['name', 'why'] },
            },
        },
        required: ['cuts', 'avoid'],
    },
}

const toolInput = <T,>(res: Anthropic.Message) => {
    const b = res.content.find((x) => x.type === 'tool_use')
    if (!b || b.type !== 'tool_use') throw new Error('no tool_use')
    return b.input as T
}
const imageBlock = (p: PhotoInput): Anthropic.ImageBlockParam => ({
    type: 'image',
    source: 'url' in p ? { type: 'url', url: p.url } : { type: 'base64', media_type: 'image/jpeg', data: p.base64 },
})

export async function analyzePhoto(photos: PhotoInput[], model = 'claude-haiku-5-5'): Promise<Analysis> {
    const res = await new Anthropic().messages.create({
        model, max_tokens: 800,
        system: 'Ты опытный барбер-стилист. По фото клиента определи форму лица и прикинь параметры волос. Мастер потом проверит волосы руками, поэтому если не видно, оставь поле пустым, а не угадывай. Не делай выводов о национальности, здоровье и других чувствительных признаках: только то, что важно для стрижки.',
        tools: [ANALYZE], tool_choice: { type: 'tool', name: 'save_analysis' },
        messages: [{ role: 'user', content: [...photos.map(imageBlock), { type: 'text', text: photos.length > 1 ? 'Первое фото анфас, второе в профиль.' : 'Фото анфас.' }] }],
    })
    return toolInput<Analysis>(res)
}

export async function suggestCuts(hair: Hair, prefs: Prefs): Promise<Suggestion> {
    const res = await new Anthropic().messages.create({
        model: 'claude-sonnet-5-5', max_tokens: 3000,
        system: `Ты опытный барбер-стилист на консультации в барбершопе. Параметры волос проверил мастер руками, они точные: не предлагай то, что на таких волосах не получится (например, густые кудри на тонких волосах).
Подбери ровно 3 мужские стрижки, лучшую первой, и 1–3 пункта, чего избегать. Пиши по-русски, коротко и профессионально, как мастер мастеру.
В техзадании указывай длины в мм и номера насадок с мм (насадка 1 = 3 мм, 2 = 6 мм, 3 = 9 мм, 4 = 12 мм), тип и высоту фейда, длину верха, текстурирование, окантовку, как обойти вихры.`,
        tools: [SUGGEST], tool_choice: { type: 'tool', name: 'save_cuts' },
        messages: [{
            role: 'user',
            content: [
                `Форма лица: ${hair.face_shape}`,
                `Волосы: густота ${hair.hair_density}, толщина ${hair.hair_thick}, тип ${hair.hair_texture}`,
                hair.hair_growth && `Вихры и линия роста: ${hair.hair_growth}`,
                `Длина: ${prefs.length}. Стиль: ${prefs.style}. Укладка дома: ${prefs.care}. Борода: ${prefs.beard}.`,
                prefs.wish && `Пожелания: ${prefs.wish.slice(0, 800)}`,
            ].filter(Boolean).join('\n'),
        }],
    })
    return toolInput<Suggestion>(res)
}
