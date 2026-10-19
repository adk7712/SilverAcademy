// Form fields: label + hint + error wired with aria-describedby; inputs are 44px high.
import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { strings } from '../strings';

interface FieldShellProps {
  label: string;
  hint?: string;
  /** Message from zod fieldErrors / fieldErrorsOf(). */
  error?: string;
  required?: boolean;
}

interface Wired {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

function Shell({
  label,
  hint,
  error,
  required,
  wired,
  children,
}: FieldShellProps & { wired: Wired; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={wired.id}>
        {label}
        {required && <span className="sr-only"> ({strings.common.required})</span>}
      </label>
      {children}
      {hint && (
        <span className="field__hint" id={`${wired.id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={`${wired.id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

function useWired({ hint, error, required }: FieldShellProps, given?: string): Wired {
  const generated = useId();
  const id = given ?? generated;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return {
    id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-required': required ? true : undefined,
  };
}

type TextFieldProps = FieldShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'required'>;

export function TextField({ label, hint, error, required, id, ...rest }: TextFieldProps) {
  const wired = useWired({ label, hint, error, required }, id);
  return (
    <Shell label={label} hint={hint} error={error} required={required} wired={wired}>
      <input className="input" {...wired} {...rest} />
    </Shell>
  );
}

type TextAreaProps = FieldShellProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'required'>;

export function TextAreaField({ label, hint, error, required, id, ...rest }: TextAreaProps) {
  const wired = useWired({ label, hint, error, required }, id);
  return (
    <Shell label={label} hint={hint} error={error} required={required} wired={wired}>
      <textarea className="input" {...wired} {...rest} />
    </Shell>
  );
}

type SelectProps = FieldShellProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'required'>;

export function SelectField({ label, hint, error, required, id, children, ...rest }: SelectProps) {
  const wired = useWired({ label, hint, error, required }, id);
  return (
    <Shell label={label} hint={hint} error={error} required={required} wired={wired}>
      <select className="input" {...wired} {...rest}>
        {children}
      </select>
    </Shell>
  );
}

export function CheckboxField({
  label,
  ...rest
}: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className="check">
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}
