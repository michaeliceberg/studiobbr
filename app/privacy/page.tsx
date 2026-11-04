import type { Metadata } from 'next'
import Link from 'next/link'
import { OPERATOR, POLICY_VERSION } from '@/lib/legal'

export const metadata: Metadata = { title: 'Политика обработки персональных данных — BBR Studio' }

const v = (s: string) => s || 'уточняется'
const dateRu = new Date(POLICY_VERSION + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// Черновик по образцу Garaggio: перед запуском показать юристу, особенно разделы про фото лица и передачу за границу.
export default function PrivacyPage() {
    return (
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 pb-12 text-[15px] leading-relaxed">
            <Link href="/book" className="text-sm text-muted">← Запись</Link>
            <h1 className="text-2xl font-black">Политика обработки персональных данных</h1>
            <p className="text-sm text-muted">Редакция от {dateRu}</p>
            <Block title="1. Кто обрабатывает данные">
                <p>Оператор: {v(OPERATOR.name)}{OPERATOR.status && `, ${OPERATOR.status}`}{OPERATOR.inn && `, ИНН ${OPERATOR.inn}`}. Адрес: {OPERATOR.address}. Телефон: {v(OPERATOR.phone)}. Сайт: {OPERATOR.site}.</p>
            </Block>
            <Block title="2. Какие данные">
                <ul className="list-disc pl-5">
                    <li>имя и номер телефона, запись на услугу, ваш комментарий;</li>
                    <li>история визитов: стрижка, длины, заметки мастера, день рождения, если вы его сообщили;</li>
                    <li>параметры волос и форма лица, которые оценил мастер;</li>
                    <li>фото результата стрижки — только с вашего согласия;</li>
                    <li>фото лица при подборе стрижки — только с вашего согласия, на время подбора, не сохраняется.</li>
                </ul>
            </Block>
            <Block title="3. Зачем">
                <p>Записать вас, напомнить о записи, повторить вашу стрижку, подобрать новую. Рекламные рассылки мы не делаем и данные для рекламы не передаём.</p>
            </Block>
            <Block title="4. Основания">
                <p>Ваше согласие и исполнение договора на оказание услуги (п. 1 и п. 5 ч. 1 ст. 6 152-ФЗ).</p>
            </Block>
            <Block title="5. Кому передаются">
                <ul className="list-disc pl-5">
                    <li>хостинг-провайдер в России: база данных хранится на сервере в России;</li>
                    <li>Anthropic PBC (США): фото лица для разбора формы лица и волос, только при подборе в студии;</li>
                    <li>Features and Labels Inc. (fal.ai, США): фото лица для примерки стрижки, только если вы согласились;</li>
                    <li>Cloudflare, Inc. (США): технический канал связи с этими сервисами.</li>
                </ul>
                <p>Эта передача трансграничная. Если вы не согласны, скажите мастеру: подбор пройдёт без фото.</p>
            </Block>
            <Block title="6. Сколько храним">
                <p>Пока вы к нам ходите и 3 года после последнего визита. Заявки без визита — до 1 года. По вашему запросу удалим раньше, если нет законных оснований хранить.</p>
            </Block>
            <Block title="7. Как защищаем">
                <p>Защищённое соединение, вход в рабочую часть только по паролю, личные ссылки на записи со случайным кодом, ежедневное резервное копирование.</p>
            </Block>
            <Block title="8. Ваши права">
                <p>Вы можете узнать, какие данные у нас есть, исправить или удалить их, отозвать согласие. Позвоните {v(OPERATOR.phone)} или скажите мастеру. Ответим в течение 10 рабочих дней. Вы также можете обратиться в Роскомнадзор.</p>
            </Block>
        </main>
    )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="flex flex-col gap-2"><h2 className="text-lg font-black">{title}</h2>{children}</section>
}
