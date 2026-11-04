import { saveVisit } from '@/app/actions'
import { REFRESH_WEEKS } from '@/lib/format'
import { Chips } from './chips'

export type VisitDefaults = { cut_name?: string; len_top?: string; len_crown?: string; len_sides?: string; len_nape?: string; brief?: string; refresh_weeks?: string; master?: string }
const LENGTHS = [['len_top', 'Верх'], ['len_crown', 'Макушка'], ['len_sides', 'Виски, бока'], ['len_nape', 'Затылок']] as const

// Визит: что сделали, длины и насадки. Из этого складывается «паспорт стрижки», который повторит любой мастер.
export function VisitForm({ clientId, today, defaults, masters }: { clientId: number; today: string; defaults: VisitDefaults; masters: string[] }) {
    return (
        <form action={saveVisit.bind(null, clientId)} className="flex flex-col gap-4">
            <div className="card flex flex-col gap-4 p-4">
                <div>
                    <label className="label" htmlFor="cut_name">Стрижка</label>
                    <input id="cut_name" name="cut_name" defaultValue={defaults.cut_name} placeholder="Текстурный кроп с низким фейдом" className="input" required />
                </div>
                <div>
                    <span className="label">Длины, мм</span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {LENGTHS.map(([k, label]) => (
                            <label key={k} className="text-xs text-muted">{label}
                                <input name={k} inputMode="numeric" defaultValue={defaults[k]} className="input mt-1" />
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="label" htmlFor="brief">Техзадание: насадки, фейд, окантовка</label>
                    <textarea id="brief" name="brief" defaultValue={defaults.brief} rows={6} className="input" />
                </div>
                <Chips name="refresh_weeks" label="Обновить через, недель" options={REFRESH_WEEKS.map(String)} defaultValue={defaults.refresh_weeks ?? '4'} />
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="label" htmlFor="master">Мастер</label>
                        <input id="master" name="master" list="masters" defaultValue={defaults.master} className="input" autoComplete="off" />
                        <datalist id="masters">{masters.map((m) => <option key={m} value={m} />)}</datalist>
                    </div>
                    <div>
                        <label className="label" htmlFor="visit_date">Дата</label>
                        <input id="visit_date" name="visit_date" type="date" defaultValue={today} className="input" />
                    </div>
                </div>
                <div>
                    <label className="label" htmlFor="notes">Заметки</label>
                    <textarea id="notes" name="notes" rows={2} className="input" />
                </div>
            </div>
            <button className="btn-primary w-full">Сохранить визит</button>
        </form>
    )
}
