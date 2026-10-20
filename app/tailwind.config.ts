import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        'surface-muted': 'var(--color-surface-muted)',
        border: 'var(--color-border)',
        'border-input': 'var(--color-border-input)',
        'focus-ring': 'var(--color-focus-ring)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        'text-subtle': 'var(--color-text-subtle)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          active: 'var(--color-accent-active)',
          subtle: 'var(--color-accent-subtle)',
        },
        'on-accent': 'var(--color-on-accent)',
        'accent-2': { DEFAULT: 'var(--color-accent-2)', hover: 'var(--color-accent-2-hover)' },
        'on-accent-2': 'var(--color-on-accent-2)',
        danger: { DEFAULT: 'var(--color-danger)', subtle: 'var(--color-danger-subtle)' },
        'on-danger': 'var(--color-on-danger)',
        success: { DEFAULT: 'var(--color-success)', subtle: 'var(--color-success-subtle)' },
        warning: { DEFAULT: 'var(--color-warning)', subtle: 'var(--color-warning-subtle)' },
        info: { DEFAULT: 'var(--color-info)', subtle: 'var(--color-info-subtle)' },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        'sans-ar': ['Noto Sans Arabic', 'Dubai', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
        focus: 'var(--shadow-focus)',
      },
    },
  },
  plugins: [],
};
export default config;
