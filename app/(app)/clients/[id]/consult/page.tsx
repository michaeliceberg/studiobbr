import { notFound } from 'next/navigation'
import { ConsultFlow } from '@/components/consult-flow'
import { getClient } from '@/lib/data'
import { Beha } from '@/components/beha'

export default async function ConsultPage({ params }: { params: { id: string } }) {
    const c = await getClient(Number(params.id))
    if (!c) notFound()
    const { face_shape, hair_density, hair_thick, hair_texture, hair_growth } = c
    return (
        <>
            <header className="relative isolate flex items-center gap-3">
                <span aria-hidden className="magic-halo" />
                <Beha pose="mirror" size={84} className="shrink-0" />
                <div className="min-w-0">
                    <h1 className="inline-block bg-gradient-to-r from-brass via-[#F2A35B] to-mint bg-clip-text text-[28px] font-black leading-tight text-transparent">Примерка стрижек</h1>
                    <p className="text-sm text-muted">{c.name}</p>
                    <p className="text-xs text-muted">ИИ покажет стрижки прямо на фото клиента</p>
                </div>
            </header>
            <ConsultFlow clientId={c.id} hasConsent={!!c.pd_consent_at} saved={{ face_shape, hair_density, hair_thick, hair_texture, hair_growth }} />
        </>
    )
}
