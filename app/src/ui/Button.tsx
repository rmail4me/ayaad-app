import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
  'transition-colors duration-fast ease-out-brand ' +
  'disabled:opacity-50 disabled:cursor-not-allowed select-none';

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-13 px-5 text-lg',
};

const variants: Record<Variant, string> = {
  primary:     'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active',
  secondary:   'bg-surface text-text border border-border hover:bg-surface-muted',
  ghost:       'bg-transparent text-accent hover:bg-accent-subtle',
  destructive: 'bg-danger text-on-danger hover:opacity-90',
  link:        'bg-transparent text-accent underline-offset-4 hover:underline h-auto p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={clsx(base, sizes[size], variants[variant], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading && (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden />
      )}
      {children}
    </button>
  );
});
