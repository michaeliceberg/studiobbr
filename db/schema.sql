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
