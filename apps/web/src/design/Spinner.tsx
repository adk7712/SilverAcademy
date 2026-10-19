// Loading indicator announced to screen readers.
import { strings } from '../strings';

export function Spinner({ label = strings.common.loading }: { label?: string }) {
  return (
    <span className="spinner-block" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
