-- BBR Studio: схема базы. Применяется скриптом scripts/db-init.mjs (безопасно перезапускать), только добавочные изменения.
CREATE TABLE IF NOT EXISTS clients (
    id           serial PRIMARY KEY,
    name         text NOT NULL DEFAULT '',
    phone        text NOT NULL DEFAULT '',
    notes        text NOT NULL DEFAULT '',
    source       text NOT NULL DEFAULT '',          -- откуда узнал: yandex, 2gis, friend, passby, vk, telegram, instagram, other
    birthday     date,
    -- параметры волос, ПОДТВЕРЖДЁННЫЕ мастером руками (см. CLAUDE.md: ИИ их только предлагает)
    face_shape   text NOT NULL DEFAULT '',
    hair_density text NOT NULL DEFAULT '',
    hair_thick   text NOT NULL DEFAULT '',
    hair_texture text NOT NULL DEFAULT '',
    hair_growth  text NOT NULL DEFAULT '',          -- вихры, линия роста, залысины
    hair_checked_at timestamptz,
    pd_consent_at timestamptz,                      -- согласие на обработку данных и фото
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clients_phone_idx ON clients (phone);

CREATE TABLE IF NOT EXISTS visits (
    id            serial PRIMARY KEY,
    client_id     int NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    visit_date    date NOT NULL DEFAULT current_date,
    master        text NOT NULL DEFAULT '',
    cut_name      text NOT NULL DEFAULT '',
    len_top       int,                              -- длины в мм: верх, макушка, виски и бока, затылок
    len_crown     int,
    len_sides     int,
    len_nape      int,
    brief         text NOT NULL DEFAULT '',         -- техзадание: насадки, фейд, окантовка, как обойти вихры
    notes         text NOT NULL DEFAULT '',
    refresh_weeks int NOT NULL DEFAULT 4,           -- через сколько недель обновить именно эту стрижку
    next_date     date,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visits_client_idx ON visits (client_id, visit_date DESC);

CREATE TABLE IF NOT EXISTS photos (
    id         serial PRIMARY KEY,
    visit_id   int NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    file       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_visit_idx ON photos (visit_id);

-- Онлайн-запись (своя вместо Dikidi). Пока один мастер и одно расписание.
CREATE TABLE IF NOT EXISTS services (
    id           serial PRIMARY KEY,
    name         text NOT NULL,
    duration_min int NOT NULL DEFAULT 60,
    price        int NOT NULL DEFAULT 0,
    sort         int NOT NULL DEFAULT 0,
    active       boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS work_hours (
    weekday   int PRIMARY KEY,                      -- 0 воскресенье … 6 суббота
    is_open   boolean NOT NULL DEFAULT true,
    open_min  int NOT NULL DEFAULT 600,             -- минуты от полуночи по Москве
    close_min int NOT NULL DEFAULT 1260
);
INSERT INTO work_hours (weekday) VALUES (0), (1), (2), (3), (4), (5), (6) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS closed_days (day date PRIMARY KEY);

CREATE TABLE IF NOT EXISTS appointments (
    id          serial PRIMARY KEY,
    token       uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,  -- личная ссылка клиента на запись
    client_id   int REFERENCES clients(id) ON DELETE CASCADE,
    service_id  int REFERENCES services(id) ON DELETE SET NULL,
    service_name text NOT NULL DEFAULT '',          -- как называлась услуга на момент записи
    name        text NOT NULL DEFAULT '',
    phone       text NOT NULL DEFAULT '',
    comment     text NOT NULL DEFAULT '',
    starts_at   timestamptz NOT NULL,
    ends_at     timestamptz NOT NULL,
    status      text NOT NULL DEFAULT 'booked',     -- booked, cancelled
    source      text NOT NULL DEFAULT 'online',     -- online, master
    consent_at  timestamptz,                        -- согласие на обработку данных при онлайн-записи
    created_at  timestamptz NOT NULL DEFAULT now(),
    -- два клиента на одно время физически не запишутся, даже если нажмут одновременно
    EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'booked')
);
CREATE INDEX IF NOT EXISTS appointments_starts_idx ON appointments (starts_at);
CREATE INDEX IF NOT EXISTS appointments_phone_idx ON appointments (phone);

-- Счётчик картинок примерки: только время, чтобы держать дневной лимит расходов. Сами фото не храним.
CREATE TABLE IF NOT EXISTS ai_images (id serial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());

-- Два мастера: у каждого свои услуги и своя занятость. Часы работы и выходные пока общие на студию.
CREATE TABLE IF NOT EXISTS staff (
    id     int PRIMARY KEY,
    name   text NOT NULL,
    title  text NOT NULL DEFAULT '',
    sort   int NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true
);
INSERT INTO staff (id, name, title, sort) VALUES (1, 'Бэха', 'Главный лесничий', 1), (2, 'Влад', 'Младший лесник', 2) ON CONFLICT DO NOTHING;
ALTER TABLE services ADD COLUMN IF NOT EXISTS staff_id int NOT NULL DEFAULT 1 REFERENCES staff(id);
ALTER TABLE services ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS staff_id int NOT NULL DEFAULT 1 REFERENCES staff(id);
-- Пересечения запрещены только у одного мастера. int4range вместо равенства: не нужно расширение btree_gist.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_tstzrange_excl;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_staff_time_excl') THEN
        ALTER TABLE appointments ADD CONSTRAINT appointments_staff_time_excl
            EXCLUDE USING gist (int4range(staff_id, staff_id, '[]') WITH &&, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'booked');
    END IF;
END $$;

-- Telegram-бот @studiobbr_bot: мастера получают заявки и отмены; клиент, записавшийся из бота, получает подтверждение.
CREATE TABLE IF NOT EXISTS tg_masters (
    chat_id    bigint PRIMARY KEY,
    name       text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tg_chat_id bigint;

-- Публичная примерка /try: считаем отдельно от мастера и по адресу, чтобы держать расходы (фото не храним).
ALTER TABLE ai_images ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'master';
ALTER TABLE ai_images ADD COLUMN IF NOT EXISTS ip text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS ai_images_kind_idx ON ai_images (kind, created_at);

-- Напоминания клиентам ботом (как в Garaggio): один раз на запись и вид напоминания, ответ клиента «Приеду / Перенести».
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_confirm text;
CREATE TABLE IF NOT EXISTS reminder_log (
    id         serial PRIMARY KEY,
    ref        text NOT NULL UNIQUE,
    appt_id    int,
    chat_id    bigint,
    text       text NOT NULL DEFAULT '',
    sent_at    timestamptz NOT NULL DEFAULT now()
);
