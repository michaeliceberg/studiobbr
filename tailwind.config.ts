import type { Config } from 'tailwindcss'

const config: Config = {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Палитра BBR: тёмная зелень зеркала + латунь инструмента (та же, что в прототипе «Стрижка по фото»)
                bg: '#111614',
                card: '#19201D',
                line: '#2C3531',
                muted: '#9AA59F',
                mint: '#6CC0A8', // главные действия
                brass: '#D4B06A', // акценты
                danger: '#F08A7E', // только ошибки и «пора»
            },
        },
    },
    plugins: [],
}
export default config
