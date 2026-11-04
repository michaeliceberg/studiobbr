import { notFound } from 'next/navigation'
import { ConsultFlow } from '@/components/consult-flow'
import { getClient } from '@/lib/data'

export default async function ConsultPage({ params }: { params: { id: string } }) {
    const c = await getClient(Number(params.id))
    if (!c) notFound()
    const { face_shape, hair_density, hair_thick, hair_texture, hair_growth } = c
    return (
        <>
            <div>
                <h1 className="text-2xl font-bold">Подбор стрижки</h1>
                <p className="text-sm text-muted">{c.name}</p>
            </div>
            <ConsultFlow clientId={c.id} hasConsent={!!c.pd_consent_at} saved={{ face_shape, hair_density, hair_thick, hair_texture, hair_growth }} />
        </>
    )
}
