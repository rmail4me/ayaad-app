import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

type Base = { label?: string; help?: string; error?: string; required?: boolean };

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, Base {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, help, error, required, className, id, ...rest }, ref,
) {
  const inputId = id || rest.name || Math.random().toString(36).slice(2);
  const helpId = help ? `${inputId}-help` : undefined;
  const errId  = error ? `${inputId}-err`  : undefined;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text">
          {label}{required && <span className="text-danger ms-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={clsx(helpId, errId) || undefined}
        className={clsx(
          'w-full h-11 px-3 rounded-md bg-bg text-text placeholder:text-text-subtle',
          'border transition-colors duration-fast',
          error ? 'border-danger' : 'border-border-input focus:border-accent',
          className,
        )}
        {...rest}
      />
      {help && !error && <p id={helpId} className="mt-1 text-sm text-text-muted">{help}</p>}
      {error && <p id={errId} className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, Base {}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, help, error, required, className, id, rows = 3, ...rest }, ref,
) {
  const tId = id || rest.name || Math.random().toString(36).slice(2);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={tId} className="mb-1.5 block text-sm font-medium text-text">
          {label}{required && <span className="text-danger ms-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref} id={tId} rows={rows}
        aria-invalid={!!error || undefined}
        className={clsx(
          'w-full min-h-[88px] px-3 py-2 rounded-md bg-bg text-text placeholder:text-text-subtle',
          'border transition-colors duration-fast resize-y',
          error ? 'border-danger' : 'border-border-input focus:border-accent',
          className,
        )}
        {...rest}
      />
      {help && !error && <p className="mt-1 text-sm text-text-muted">{help}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
});
