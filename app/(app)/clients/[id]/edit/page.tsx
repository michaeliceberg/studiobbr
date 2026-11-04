import { notFound } from 'next/navigation'
import { ClientForm } from '@/components/client-form'
import { ConfirmButton } from '@/components/confirm-button'
import { deleteClient } from '@/app/actions'
import { getClient } from '@/lib/data'

export default async function EditClient({ params }: { params: { id: string } }) {
    const client = await getClient(Number(params.id))
    if (!client) notFound()
    return (
        <>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <ClientForm client={client} />
            <form action={deleteClient.bind(null, client.id)}>
                <ConfirmButton message="Удалить клиента со всей историей и фото?" className="btn-danger w-full">Удалить клиента</ConfirmButton>
            </form>
        </>
    )
}
