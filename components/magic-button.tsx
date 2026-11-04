import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

const SPARKS = [12, 34, 58, 80, 94]
const Inner = ({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) => (
    <>
        {SPARKS.map((left, i) => <span key={left} aria-hidden className="magic-spark" style={{ left: `${left}%`, animationDelay: `${i * 0.37}s` }} />)}
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(27,20,7,0.16)', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.45)' }}>
            {icon ?? <Sparkles className="magic-icon h-6 w-6" strokeWidth={2.4} />}
        </span>
        <span className="min-w-0 flex-1 text-left">
            <span className="block text-[17px] font-black leading-tight">{title}</span>
            {subtitle && <span className="block text-xs font-bold leading-snug opacity-80">{subtitle}</span>}
        </span>
        <ChevronRight className="h-6 w-6 shrink-0" strokeWidth={3} />
    </>
)
const style = { minHeight: 68, padding: '12px 16px', borderRadius: '1rem', gap: '0.75rem', justifyContent: 'flex-start' } as const

// «Волшебная» кнопка (стиль .btn-magic в globals.css) — ссылкой или обычной кнопкой.
export const MagicLink = (p: { href: string; title: string; subtitle?: string }) => (
    <Link href={p.href} className="btn-magic w-full" style={style}><Inner {...p} /></Link>
)
export const MagicButton = (p: { title: string; subtitle?: string; busy?: boolean; disabled?: boolean; onClick: () => void; icon?: ReactNode }) => (
    <button type="button" className="btn-magic w-full" style={style} data-state={p.busy ? 'busy' : undefined} disabled={p.disabled || p.busy} onClick={p.onClick}><Inner {...p} /></button>
)
