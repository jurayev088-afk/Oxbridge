import type { InputHTMLAttributes } from 'react';
import { formatAmountDisplay, parseAmountDigits } from '../lib/formatInputs';

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
}

export function AmountInput({
  value,
  onChange,
  className = 'edit-input',
  ...rest
}: AmountInputProps) {
  return (
    <input
      className={`amount-input ${className ?? ''}`.trim()}
      inputMode="numeric"
      value={formatAmountDisplay(value)}
      onChange={(e) => onChange(parseAmountDigits(e.target.value))}
      {...rest}
    />
  );
}
