'use client'

import { useState } from 'react'

// Выбор одного значения кнопками. В форме уходит скрытым полем name; повторное нажатие снимает выбор.
export function Chips({ name, label, options, defaultValue = '', value, onChange }: {
    name?: string; label: string; options: { id: string; label: string }[] | string[]; defaultValue?: string
    value?: string; onChange?: (v: string) => void
}) {
    const [own, setOwn] = useState(defaultValue)
    const cur = value ?? own
    const opts = options.map((o) => (typeof o === 'string' ? { id: o, label: o } : o))
    return (
        <div>
            <span className="label">{label}</span>
            {name && <input type="hidden" name={name} value={cur} />}
            <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
                {opts.map((o) => (
                    <button key={o.id} type="button" aria-pressed={cur === o.id} className={`chip ${cur === o.id ? 'chip-on' : ''}`}
                        onClick={() => { const v = cur === o.id ? '' : o.id; setOwn(v); onChange?.(v) }}>{o.label}</button>
                ))}
            </div>
        </div>
    )
}
