// Оператор персональных данных — Бэха (решение 04.11.2026). Пока не заполнены имя и телефон, страница записи закрыта для клиентов.
export const OPERATOR = {
    name: '', // ФИО полностью
    status: '', // например «самозанятый» или «ИП»
    inn: '',
    address: 'Московская обл., г. Королёв, Октябрьский бульвар, 26, 2-й этаж',
    phone: '',
    site: 'studiobbr.ru',
}
export const LEGAL_READY = Boolean(OPERATOR.name && OPERATOR.phone)
export const POLICY_VERSION = '2026-11-04'
