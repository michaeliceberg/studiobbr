// Персонаж студии. Картинки — public/beha, исходники — docs/beha/originals.
export type BehaPose = 'approve' | 'armchair' | 'bed' | 'book' | 'coffee' | 'cut' | 'cut-dog' | 'door' | 'gift' | 'hello' | 'hello-2' | 'kiss' | 'kiss-2' | 'mirror' | 'oops' | 'sleep' | 'strict' | 'surprised' | 'surprised-2' | 'think' | 'tools' | 'with-son'

export function Beha({ pose, size = 160, className = '' }: { pose: BehaPose; size?: number; className?: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/beha/beha-${pose}.webp`} alt="" width={size} height={size} className={`select-none ${className}`} draggable={false} />
}

// Пометка о персонаже: на страницах, которые видят клиенты.
export const BehaNote = () => null
