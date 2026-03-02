export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                indigo: {
                    600: '#4f46e5',
                    500: '#6366f1',
                }
            }
        },
    },
    plugins: [],
}
