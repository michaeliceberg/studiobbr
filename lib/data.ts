import 'server-only'
import { sql } from './db'

export type Client = {
    id: number; name: string; phone: string; notes: string; source: string; birthday: string | null
    face_shape: string; hair_density: string; hair_thick: string; hair_texture: string; hair_growth: string
    hair_checked_at: Date | null; pd_consent_at: Date | null
}
export type Visit = {
    id: number; client_id: number; visit_date: string; master: string; cut_name: string
    len_top: number | null; len_crown: number | null; len_sides: number | null; len_nape: number | null
    brief: string; notes: string; refresh_weeks: number; next_date: string | null
}

// Даты отдаём строкой YYYY-MM-DD: так их не сдвигает часовой пояс.
const VISIT = sql`id, client_id, visit_date::text, master, cut_name, len_top, len_crown, len_sides, len_nape, brief, notes, refresh_weeks, next_date::text`

export async function searchClients(q: string) {
    const like = `%${q.trim().toLowerCase()}%`
    const digits = q.replace(/\D/g, '')
    return sql<(Client & { last_visit: string | null; last_cut: string | null })[]>`
        SELECT c.*, c.birthday::text, v.visit_date::text AS last_visit, v.cut_name AS last_cut
        FROM clients c
        LEFT JOIN LATERAL (SELECT visit_date, cut_name FROM visits WHERE client_id = c.id ORDER BY visit_date DESC, id DESC LIMIT 1) v ON true
        WHERE ${q.trim() ? sql`lower(c.name) LIKE ${like} OR (${digits.length >= 3} AND regexp_replace(c.phone, '\D', '', 'g') LIKE ${'%' + digits + '%'})` : sql`true`}
        ORDER BY v.visit_date DESC NULLS LAST, c.id DESC LIMIT 100`
}
export async function getClient(id: number) {
    const [c] = await sql<Client[]>`SELECT *, birthday::text FROM clients WHERE id = ${id}`
    return c ?? null
}
export const getVisits = (clientId: number) =>
    sql<Visit[]>`SELECT ${VISIT} FROM visits WHERE client_id = ${clientId} ORDER BY visit_date DESC, id DESC`
export async function getVisit(id: number) {
    const [v] = await sql<Visit[]>`SELECT ${VISIT} FROM visits WHERE id = ${id}`
    return v ?? null
}
export const getPhotos = (visitId: number) => sql<{ id: number }[]>`SELECT id FROM photos WHERE visit_id = ${visitId} ORDER BY id`
export const getMasters = async () =>
    (await sql<{ master: string }[]>`SELECT DISTINCT master FROM visits WHERE master <> '' ORDER BY master`).map((m) => m.master)

// «Пора обновить»: у кого по последнему визиту срок наступает в ближайшие 3 дня или уже прошёл.
export const getDue = () => sql<{ id: number; name: string; phone: string; next_date: string; cut_name: string }[]>`
    SELECT c.id, c.name, c.phone, v.next_date::text, v.cut_name
    FROM clients c
    JOIN LATERAL (SELECT next_date, cut_name FROM visits WHERE client_id = c.id ORDER BY visit_date DESC, id DESC LIMIT 1) v ON true
    WHERE v.next_date <= current_date + 3
    ORDER BY v.next_date`

export const getSourceStats = () => sql<{ source: string; n: number; month: number }[]>`
    SELECT source, count(*)::int AS n, (count(*) FILTER (WHERE created_at > now() - interval '30 days'))::int AS month
    FROM clients GROUP BY source ORDER BY n DESC`
