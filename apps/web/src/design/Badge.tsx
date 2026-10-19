// Status badge; colour is never the only cue, the text carries the meaning.
import type { ReactNode } from 'react';

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge tone--${tone}`}>{children}</span>;
}
