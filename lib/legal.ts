// Оператор персональных данных — Бэха (решение 04.11.2026).
export const OPERATOR = {
    name: 'Бэха', // TODO до настоящих клиентов: полное ФИО, политика требует настоящие данные оператора
    status: 'самозанятый',
    inn: '', // TODO: ИНН пришлёт пользователь
    address: 'Московская обл., г. Королёв, Октябрьский бульвар, 26, 2-й этаж',
    phone: '+7 926 686 69 68',
    site: 'studiobbr.ru',
}
// Клиенты сейчас записываются через Dikidi. Включить, когда своя запись проверена, есть напоминания и полное ФИО оператора.
export const BOOKING_OPEN = false
export const POLICY_VERSION = '2026-11-04'

// Пока своя запись закрыта (BOOKING_OPEN = false), клиентов с примерки ведём в Dikidi.
export const DIKIDI_URL = 'https://dikidi.net/978356'
export const bookingUrl = () => (BOOKING_OPEN ? '/book' : DIKIDI_URL)
