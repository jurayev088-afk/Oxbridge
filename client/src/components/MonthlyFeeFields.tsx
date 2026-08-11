import { AmountInput } from './AmountInput';
import { parseAmountDigits, parseAmountNumber } from '../lib/formatInputs';

interface MonthlyFeeFieldsProps {
  value: string;
  onChange: (value: string) => void;
}

export function resolveMonthlyFee(value: string | number | null | undefined) {
  return parseAmountNumber(value);
}

export function MonthlyFeeFields({ value, onChange }: MonthlyFeeFieldsProps) {
  return (
    <label className="modal-field">
      <span>Oylik to&apos;lov summasi</span>
      <AmountInput
        value={parseAmountDigits(value)}
        onChange={onChange}
      />
    </label>
  );
}
