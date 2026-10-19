// Design system: transient message (success/error/info). `useToast().show(message, tone)`; announced politely.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { TOAST_DURATION_MS } from '../tokens';
import { AppText } from './AppText';

export type ToastTone = 'success' | 'error' | 'info';
interface ToastState {
  message: string;
  tone: ToastTone;
}
interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors, spacing, radius, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo(() => ({ show }), [show]);
  const bg =
    toast?.tone === 'error'
      ? colors.danger
      : toast?.tone === 'success'
        ? colors.onSuccess
        : colors.primary;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            left: spacing.md,
            right: spacing.md,
            bottom: insets.bottom + spacing.lg,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              maxWidth: sizes.toastMaxWidth,
              minHeight: sizes.minTouchTarget,
              justifyContent: 'center',
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: bg,
            }}
          >
            <AppText variant="bodyStrong" color="onPrimary">
              {toast.message}
            </AppText>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}
