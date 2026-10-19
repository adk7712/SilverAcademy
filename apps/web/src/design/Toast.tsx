// Toast notifications: useToast().show(...) from anywhere under <ToastProvider>.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert } from './Alert';

type ToastTone = 'info' | 'success' | 'warning' | 'danger';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const TOAST_DURATION_MS = 6000;

interface ToastApi {
  show(message: string, tone?: ToastTone): void;
}
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) => setItems((cur) => cur.filter((t) => t.id !== id)),
    [],
  );
  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++;
      setItems((cur) => [...cur, { id, tone, message }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className="toast">
            <Alert tone={t.tone} onDismiss={() => dismiss(t.id)}>
              {t.message}
            </Alert>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
