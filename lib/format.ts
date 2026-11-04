export const dateRu = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
export const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

// Телефон: всегда «+7 916 099 19 97». 8… и 9… превращаем в +7…; чужие коды (не 7) оставляем просто цифрами с плюсом.
export function formatPhone(s: string) {
    let d = s.replace(/\D/g, '')
    if (!d) return ''
    // Поле уже подставляет «+7», а по привычке набирают 8 или 7: лишняя цифра видна только на 12-й.
    if (d.length === 12 && (d.startsWith('78') || d.startsWith('77'))) d = '7' + d.slice(2)
    if (d[0] === '8') d = '7' + d.slice(1)
    else if (d[0] === '9') d = '7' + d
    if (d[0] !== '7') return '+' + d.slice(0, 15)
    const r = d.slice(1, 11)
    return ['+7', r.slice(0, 3), r.slice(3, 6), r.slice(6, 8), r.slice(8, 10)].filter(Boolean).join(' ')
}

// Откуда узнали о студии: спрашиваем каждого нового клиента, чтобы решать про каналы по цифрам.
export const SOURCES: { id: string; label: string }[] = [
    { id: 'yandex', label: 'Яндекс Карты' },
    { id: '2gis', label: '2ГИС' },
    { id: 'friend', label: 'Посоветовали' },
    { id: 'passby', label: 'Шёл мимо' },
    { id: 'vk', label: 'VK' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'other', label: 'Другое' },
]
export const sourceLabel = (id: string) => SOURCES.find((s) => s.id === id)?.label ?? 'Не спросили'

export const FACE_SHAPES = ['Овальное', 'Круглое', 'Квадратное', 'Прямоугольное', 'Треугольное', 'Ромбовидное', 'Сердцевидное']
export const HAIR_DENSITY = ['Густые', 'Средние', 'Редкие']
export const HAIR_THICK = ['Тонкие', 'Средние', 'Жёсткие']
export const HAIR_TEXTURE = ['Прямые', 'Волнистые', 'Кудрявые']

// Срок обновления по стрижке: фейд — 3 недели, классика — 4–5.
export const REFRESH_WEEKS = [3, 4, 5, 6]

export const hairLine = (c: { hair_density: string; hair_thick: string; hair_texture: string }) =>
    [c.hair_density, c.hair_thick, c.hair_texture].filter(Boolean).map((s) => s.toLowerCase()).join(', ')
export const lengthsLine = (v: { len_top: number | null; len_crown: number | null; len_sides: number | null; len_nape: number | null }) =>
    ([['верх', v.len_top], ['макушка', v.len_crown], ['бока', v.len_sides], ['затылок', v.len_nape]] as [string, number | null][])
        .filter(([, n]) => n != null).map(([k, n]) => `${k} ${n} мм`).join(' · ')
