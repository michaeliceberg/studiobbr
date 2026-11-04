import { saveClient } from '@/app/actions'
import { FACE_SHAPES, HAIR_DENSITY, HAIR_TEXTURE, HAIR_THICK, SOURCES } from '@/lib/format'
import type { Client } from '@/lib/data'
import { Chips } from './chips'
import { PhoneInput } from './phone-input'

// Карточка клиента. «Откуда узнали» спрашиваем у каждого нового: по этим цифрам решаем про каналы.
export function ClientForm({ client }: { client?: Client }) {
    return (
        <form action={saveClient.bind(null, client?.id ?? null)} className="flex flex-col gap-4">
            <div className="card flex flex-col gap-4 p-4">
                <div>
                    <label className="label" htmlFor="name">Имя</label>
                    <input id="name" name="name" defaultValue={client?.name} className="input" required autoComplete="off" />
                </div>
                <PhoneInput defaultValue={client?.phone} />
                <Chips name="source" label="Откуда узнали о нас" options={SOURCES} defaultValue={client?.source} />
                <div>
                    <label className="label" htmlFor="birthday">День рождения</label>
                    <input id="birthday" name="birthday" type="date" defaultValue={client?.birthday ?? ''} className="input" />
                </div>
                <div>
                    <label className="label" htmlFor="notes">Заметки</label>
                    <textarea id="notes" name="notes" defaultValue={client?.notes} rows={2} className="input" />
                </div>
                <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" name="consent" defaultChecked={!!client?.pd_consent_at} className="mt-1 h-5 w-5 accent-[#6CC0A8]" />
                    Клиент согласен на обработку данных и съёмку
                </label>
            </div>
            <div className="card flex flex-col gap-4 p-4">
                <h2 className="font-bold text-brass">Волосы (проверено руками)</h2>
                <Chips name="face_shape" label="Форма лица" options={FACE_SHAPES} defaultValue={client?.face_shape} />
                <Chips name="hair_density" label="Густота" options={HAIR_DENSITY} defaultValue={client?.hair_density} />
                <Chips name="hair_thick" label="Толщина" options={HAIR_THICK} defaultValue={client?.hair_thick} />
                <Chips name="hair_texture" label="Тип" options={HAIR_TEXTURE} defaultValue={client?.hair_texture} />
                <div>
                    <label className="label" htmlFor="hair_growth">Вихры, линия роста</label>
                    <input id="hair_growth" name="hair_growth" defaultValue={client?.hair_growth} placeholder="Вихор на макушке слева" className="input" />
                </div>
            </div>
            <button className="btn-primary w-full">Сохранить</button>
        </form>
    )
}
