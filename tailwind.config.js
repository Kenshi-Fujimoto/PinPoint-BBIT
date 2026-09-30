/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#F8F9FA',
          dark: '#0B0D13',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#141721',
          darkMuted: '#1A1E2C',
        },
        stone: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
        pastel: {
          mint: {
            light: '#ECFDF5',
            DEFAULT: '#A7F3D0',
            dark: '#059669',
            border: '#6EE7B7',
            darkBg: '#064E3B',
            darkText: '#A7F3D0',
          },
          peach: {
            light: '#FFF7ED',
            DEFAULT: '#FED7AA',
            dark: '#EA580C',
            border: '#FDBA74',
            darkBg: '#7C2D12',
            darkText: '#FED7AA',
          },
          lavender: {
            light: '#F5F3FF',
            DEFAULT: '#DDD6FE',
            dark: '#7C3AED',
            border: '#C4B5FD',
            darkBg: '#4C1D95',
            darkText: '#DDD6FE',
          },
          butter: {
            light: '#FEFCE8',
            DEFAULT: '#FEF08A',
            dark: '#CA8A04',
            border: '#FDE047',
            darkBg: '#713F12',
            darkText: '#FEF08A',
          },
          sky: {
            light: '#F0F9FF',
            DEFAULT: '#BAE6FD',
            dark: '#0284C7',
            border: '#7DD3FC',
            darkBg: '#0C4A6E',
            darkText: '#BAE6FD',
          },
          rose: {
            light: '#FFF1F2',
            DEFAULT: '#FECDD3',
            dark: '#E11D48',
            border: '#FDA4AF',
            darkBg: '#881337',
            darkText: '#FECDD3',
          }
        },
        brand: {
          primary: '#5B5BE6',
          primaryHover: '#4B4BC7',
          accent: '#10B981',
          gold: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'card': '0 2px 8px -1px rgba(0, 0, 0, 0.06), 0 1px 3px -1px rgba(0, 0, 0, 0.03)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 12px 28px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04)',
        'glow-amber': '0 0 20px -2px rgba(245, 158, 11, 0.25)',
        'glow-indigo': '0 0 20px -2px rgba(91, 91, 230, 0.25)',
        'glow-emerald': '0 0 20px -2px rgba(16, 185, 129, 0.25)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
