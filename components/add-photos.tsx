'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { compressPhoto } from '@/lib/photo-client'

// Фото результата к визиту: выбрал — сразу сжалось и загрузилось.
export function AddPhotos({ visitId }: { visitId: number }) {
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState(false)
    const send = async (files: File[]) => {
        setError(false)
        try {
            for (let i = 0; i < files.length; i++) {
                setBusy(`Загружаем ${i + 1} из ${files.length}…`)
                const f = new FormData()
                f.append('file', await compressPhoto(files[i]), 'photo.jpg')
                if (!(await fetch(`/api/visits/${visitId}/photos`, { method: 'POST', body: f })).ok) throw new Error('upload')
            }
            router.refresh()
        } catch { setError(true) }
        setBusy(null)
    }
    return (
        <div className="flex flex-col gap-2">
            <label className="btn-ghost w-full cursor-pointer">
                {busy ?? 'Добавить фото результата'}
                <input type="file" accept="image/*" multiple className="hidden" disabled={!!busy}
                    onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ''; if (fs.length) send(fs) }} />
            </label>
            {error && <p className="text-sm font-semibold text-danger">Не получилось загрузить. Проверьте интернет.</p>}
        </div>
    )
}
