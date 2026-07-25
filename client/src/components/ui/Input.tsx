import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-ink">{label}</label>
      )}
      <input
        ref={ref}
        className={`border rounded-lg px-3 py-2 text-sm bg-surface text-ink outline-none transition-colors
          ${error ? 'border-danger focus:ring-danger/30' : 'border-line focus:border-accent-violet focus:ring-accent-violet/30'}
          focus:ring-2 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
