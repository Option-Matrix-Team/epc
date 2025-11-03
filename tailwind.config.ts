import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/**/*.{ts,tsx,js,jsx}',
        './src/app/**/*.{ts,tsx,js,jsx}',
        './components/**/*.{ts,tsx,js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
            },
            boxShadow: {
                soft: '0 1px 2px 0 rgba(0,0,0,0.05), 0 1px 3px 0 rgba(0,0,0,0.1)'
            }
        },
    },
}
export default config
