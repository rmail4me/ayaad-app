// Tailwind theme mapped to Ayaad design tokens.
import type { Config } from 'tailwindcss';

export const theme: Config['theme'] = {
  extend: {
    colors: {
      bg:              'var(--color-bg)',
      surface:         'var(--color-surface)',
      'surface-raised':'var(--color-surface-raised)',
      'surface-muted': 'var(--color-surface-muted)',
      border:          'var(--color-border)',
      'border-input':  'var(--color-border-input)',
      'focus-ring':    'var(--color-focus-ring)',
      text:            'var(--color-text)',
      'text-muted':    'var(--color-text-muted)',
      'text-subtle':   'var(--color-text-subtle)',
      accent: {
        DEFAULT: 'var(--color-accent)',
        hover:   'var(--color-accent-hover)',
        active:  'var(--color-accent-active)',
        subtle:  'var(--color-accent-subtle)',
      },
      'on-accent':     'var(--color-on-accent)',
      'accent-2': {
        DEFAULT: 'var(--color-accent-2)',
        hover:   'var(--color-accent-2-hover)',
      },
      'on-accent-2':   'var(--color-on-accent-2)',
      danger: { DEFAULT: 'var(--color-danger)', subtle: 'var(--color-danger-subtle)' },
      'on-danger':     'var(--color-on-danger)',
      success: { DEFAULT: 'var(--color-success)', subtle: 'var(--color-success-subtle)' },
      warning: { DEFAULT: 'var(--color-warning)', subtle: 'var(--color-warning-subtle)' },
      info:    { DEFAULT: 'var(--color-info)',    subtle: 'var(--color-info-subtle)' },
    },
    fontFamily: {
      sans:     ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      'sans-ar':['Noto Sans Arabic', 'Dubai', 'Tajawal', 'system-ui', 'sans-serif'],
      mono:     ['JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      xs:      ['12px', { lineHeight: '16px', fontWeight: 500 }],
      sm:      ['14px', { lineHeight: '20px', fontWeight: 400 }],
      base:    ['16px', { lineHeight: '24px', fontWeight: 400 }],
      lg:      ['18px', { lineHeight: '28px', fontWeight: 500 }],
      xl:      ['20px', { lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.01em' }],
      '2xl':   ['24px', { lineHeight: '32px', fontWeight: 700, letterSpacing: '-0.015em' }],
      '3xl':   ['30px', { lineHeight: '36px', fontWeight: 700, letterSpacing: '-0.02em' }],
      display: ['40px', { lineHeight: '44px', fontWeight: 800, letterSpacing: '-0.025em' }],
    },
    spacing: {
      0: '0', 0.5: '2px', 1: '4px', 1.5: '6px', 2: '8px', 3: '12px',
      4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px',
      12: '48px', 16: '64px', 20: '80px', 24: '96px', 32: '128px',
    },
    borderRadius: {
      none: '0', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', full: '9999px',
    },
    boxShadow: {
      sm:   'var(--shadow-sm)',
      card: 'var(--shadow-card)',
      pop:  'var(--shadow-pop)',
      focus:'var(--shadow-focus)',
    },
    transitionTimingFunction: {
      brand: 'var(--ease)', 'out-brand': 'var(--ease-out)', 'in-brand': 'var(--ease-in)',
    },
    transitionDuration: { fast: '150ms', base: '200ms', slow: '300ms' },
    maxWidth: { container: '1200px', prose: '680px' },
    screens:  { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    zIndex:   { base: '0', sticky: '10', dropdown: '20', overlay: '40', modal: '50', toast: '60', tooltip: '70' },
  },
};
