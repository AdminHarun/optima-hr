/** @type {import('tailwindcss').Config} */
module.exports = {
  // MUI ile cakismayi onlemek icin prefix
  prefix: 'tw-',

  // Preflight'i devre disi birak (MUI CssBaseline ile cakisir)
  corePlugins: {
    preflight: false,
  },

  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],

  theme: {
    extend: {
      // MUI ile ortak renk paleti (CSS Variables kullanarak)
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
          50: '#e3f0fc',
          100: '#b8d9f7',
          200: '#8ac1f2',
          300: '#5ca8ed',
          400: '#3d95e9',
          500: '#1c61ab', // Ana renk
          600: '#1a589a',
          700: '#164b83',
          800: '#123e6c',
          900: '#0d2d4e',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: '#a5d062',
          dark: '#6f9438',
          50: '#f4f9e9',
          100: '#e3f0c8',
          200: '#d1e7a5',
          300: '#bfde82',
          400: '#b1d768',
          500: '#8bb94a', // Ana accent
          600: '#7daa42',
          700: '#6b9638',
          800: '#5a822f',
          900: '#3e5e1f',
        },
        // Chat icin ozel renkler
        chat: {
          own: 'var(--chat-own-bg)',
          other: 'var(--chat-other-bg)',
          system: 'var(--chat-system-bg)',
        },
        // Presence renkleri
        presence: {
          online: '#22c55e',
          offline: '#94a3b8',
          away: '#f59e0b',
          busy: '#ef4444',
          dnd: '#dc2626',
        },
      },

      // Glassmorphism icin ozel degerler
      backdropBlur: {
        glass: '20px',
        'glass-heavy': '30px',
      },

      backgroundColor: {
        glass: 'var(--glass-bg)',
        'glass-dark': 'var(--glass-bg-dark)',
        'glass-card': 'rgba(255, 255, 255, 0.25)',
      },

      borderColor: {
        glass: 'var(--glass-border)',
      },

      boxShadow: {
        glass: 'var(--shadow-glass)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.15)',
        'message': '0 1px 2px rgba(0, 0, 0, 0.08)',
        'message-own': '0 1px 2px rgba(28, 97, 171, 0.15)',
      },

      // Chat baloncuklari icin border radius
      borderRadius: {
        'bubble': '1.125rem',
        'bubble-own': '1.125rem 1.125rem 0.25rem 1.125rem',
        'bubble-other': '1.125rem 1.125rem 1.125rem 0.25rem',
      },

      // Animasyonlar
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
        'typing-bounce': 'typingBounce 1.4s ease-in-out infinite',
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
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
        },
        typingBounce: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
      },

      // Chat icin ozel spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },

      // Max genislikler
      maxWidth: {
        'message': '70%',
        'message-sm': '85%',
      },

      // Font ailesi
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },

      // Z-index
      zIndex: {
        'modal': '1300', // MUI modal ile uyumlu
        'drawer': '1200',
        'tooltip': '1500',
        'notification': '1600',
      },
    },
  },

  plugins: [],
};
