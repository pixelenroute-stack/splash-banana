/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Atlantis theme
        'lantean-blue': '#00e5ff',
        'deep-space': '#050b14',
        'gold-accent': '#d4af37',
        // App colors
        background: '#0f172a',
        surface: '#1e293b',
        'surface-hover': '#334155',
        border: '#334155',
        muted: '#94a3b8',
        primary: {
          DEFAULT: '#00e5ff',
          foreground: '#050b14',
        },
        accent: {
          DEFAULT: '#d4af37',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#22c55e',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 15px rgba(0, 229, 255, 0.3)',
        'glow-lg': '0 0 30px rgba(0, 229, 255, 0.4)',
        'glow-gold': '0 0 15px rgba(212, 175, 55, 0.3)',
      },
      animation: {
        'spin-slow': 'spin 60s linear infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'drift': 'drift 200s linear infinite',
        'float': 'float 20s ease-in-out infinite',
        'float-reverse': 'float 25s ease-in-out infinite reverse',
        'ship-hover': 'shipHover 8s ease-in-out infinite',
        'pulse-water': 'pulseWater 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        drift: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '1000px 500px' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shipHover: {
          '0%, 100%': { transform: 'translateX(0) rotate(1deg)' },
          '50%': { transform: 'translateX(10px) rotate(-1deg)' },
        },
        pulseWater: {
          '0%': { opacity: '0.7', transform: 'scale(0.98)' },
          '50%': { opacity: '0.9', transform: 'scale(1.02)' },
          '100%': { opacity: '0.7', transform: 'scale(0.98)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
