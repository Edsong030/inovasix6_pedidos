import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Identidade Inovasix6 - Tema escuro premium
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c0d0ff',
          // 300–700 vêm de variáveis CSS para a cor de destaque das Configurações.
          // Padrão (globals.css): os mesmos valores Inovasix #93b0ff…#1f2de0.
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: '#1e27b5',
          900: '#1d248e',
          950: '#141660',
        },
        surface: {
          DEFAULT: '#0f1117',
          50:  '#1a1d2e',
          100: '#151828',
          200: '#0f1117',
          300: '#0a0c12',
        },
        card: {
          DEFAULT: '#1a1d2e',
          hover:   '#1e2234',
          border:  '#2a2d3e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.35)',
        glow: '0 0 20px rgba(61,94,255,0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        pulse2: 'pulse2 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
      },
    },
  },
  plugins: [],
}

export default config
