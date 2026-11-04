// Прозрачный прокси в fal.run для примерки стрижки (lib/hair-image.ts). Пропускает только POST на FLUX Kontext.
// Ключ в Worker не кладём: его шлёт наш сервер. Адрес воркера — FAL_API_BASE в .env на сервере.
// Деплой: npx -y wrangler@4 deploy cloudflare-worker/fal-proxy.js --name fal-proxy --compatibility-date 2026-10-01
export default {
    async fetch(request) {
        const url = new URL(request.url)
        if (request.method !== 'POST' || url.pathname !== '/fal-ai/flux-pro/kontext') return new Response('Forbidden', { status: 403 })
        const res = await fetch('https://fal.run' + url.pathname, { method: 'POST', headers: request.headers, body: request.body })
        return new Response(res.body, { status: res.status, headers: res.headers })
    },
}
