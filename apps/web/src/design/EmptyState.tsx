// Empty list placeholder with optional action.
import type { ReactNode } from 'react';
import { strings } from '../strings';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  title = strings.empty.title,
  description = strings.empty.description,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <h2 className="empty__title">{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
