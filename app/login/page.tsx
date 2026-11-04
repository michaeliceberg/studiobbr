import { redirect } from 'next/navigation'
import { isAuthed } from '@/lib/auth'

// Обычная форма (работает даже без JS): POST /api/login.
export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
    if (isAuthed()) redirect('/')
    return (
        <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
            <h1 className="text-center text-3xl font-black tracking-wide text-brass">BBR Studio</h1>
            <form action="/api/login" method="post" className="card flex flex-col gap-3 p-5">
                <label className="label" htmlFor="password">Пароль мастера</label>
                <input id="password" name="password" type="password" autoComplete="current-password" className="input" autoFocus required />
                {searchParams.error && <p className="text-sm font-semibold text-danger">Неверный пароль</p>}
                <button className="btn-primary w-full">Войти</button>
            </form>
        </main>
    )
}
