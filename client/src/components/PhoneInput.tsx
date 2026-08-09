import type { InputHTMLAttributes } from 'react';
import { UZ_PHONE_PREFIX, formatUzPhoneDisplay, normalizeUzPhone } from '../lib/formatInputs';

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export function PhoneInput({
  value,
  onChange,
  className = 'edit-input',
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: PhoneInputProps) {
  const displayValue = value ? formatUzPhoneDisplay(value) : '';

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (!value) {
      onChange(UZ_PHONE_PREFIX);
    }
    onFocus?.(e);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (value === UZ_PHONE_PREFIX) {
      onChange('');
    }
    onBlur?.(e);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(normalizeUzPhone(e.target.value));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const pos = e.currentTarget.selectionStart ?? 0;
    if (e.key === 'Backspace' && pos <= 5) {
      e.preventDefault();
    }
    onKeyDown?.(e);
  }

  return (
    <input
      className={className}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="+998 90 123 45 67"
      {...rest}
    />
  );
}
