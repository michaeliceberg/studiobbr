import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'BBR Studio',
    description: 'Карточки клиентов и ИИ-подбор стрижки для барбершопа BBR Studio.',
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: 'BBR Studio', statusBarStyle: 'black-translucent' },
}
export const viewport: Viewport = { themeColor: '#111614', width: 'device-width', initialScale: 1, maximumScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru">
            <body className="min-h-screen font-sans antialiased">{children}</body>
        </html>
    )
}
