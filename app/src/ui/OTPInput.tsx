'use client';
import { useRef, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import clsx from 'clsx';

export interface OTPInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
}

export function OTPInput({
  value, onChange, length = 6, disabled, error, autoFocus,
  'aria-label': ariaLabel = 'One-time passcode',
}: OTPInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  const setChar = (i: number, c: string) => {
    const next = (value + ' '.repeat(length)).slice(0, length).split('');
    next[i] = c;
    onChange(next.join('').trim());
  };

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 1);
    setChar(i, v);
    if (v && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!txt) return;
    e.preventDefault();
    onChange(txt);
    refs.current[Math.min(txt.length, length - 1)]?.focus();
  };

  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-2 justify-center" dir="ltr">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={c}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={handleChange(i)}
          onKeyDown={handleKey(i)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1} of ${length}`}
          className={clsx(
            'w-11 h-13 text-center text-xl font-semibold rounded-md border bg-bg',
            error ? 'border-danger' : 'border-border-input focus:border-accent',
            'tabular-nums',
          )}
        />
      ))}
    </div>
  );
}
