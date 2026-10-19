// Theme context: tokens + scaled type styles + persisted text-size preference (NFR 2.1).
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
import type { TextStyle } from 'react-native';
import { STORAGE_KEYS } from '../config/storageKeys';
import { readStored, writeStored } from '../services/storage';
import { colors, radius, sizes, spacing, typeScale, type TextVariant } from './tokens';
import { DEFAULT_FONT_SCALE, hydratedFontScale, scaleSize, type FontScale } from './fontScale';

export interface Theme {
  colors: typeof colors;
  spacing: typeof spacing;
  radius: typeof radius;
  sizes: typeof sizes;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  /** Text style for a variant with the current font scale applied. */
  text: (variant: TextVariant) => TextStyle;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [fontScale, setScale] = useState<FontScale>(DEFAULT_FONT_SCALE);

  const userChanged = useRef(false);

  useEffect(() => {
    let active = true;
    void readStored<number>(STORAGE_KEYS.fontScale).then((stored) => {
      if (active) setScale((cur) => hydratedFontScale(cur, stored, userChanged.current));
    });
    return () => {
      active = false;
    };
  }, []);

  const setFontScale = useCallback((scale: FontScale) => {
    userChanged.current = true;
    setScale(scale);
    void writeStored(STORAGE_KEYS.fontScale, scale);
  }, []);

  const theme = useMemo<Theme>(
    () => ({
      colors,
      spacing,
      radius,
      sizes,
      fontScale,
      setFontScale,
      text: (variant) => {
        const base = typeScale[variant];
        return {
          fontSize: scaleSize(base.fontSize, fontScale),
          lineHeight: scaleSize(base.lineHeight, fontScale),
          fontWeight: base.fontWeight,
          color: colors.text,
        };
      },
    }),
    [fontScale, setFontScale],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
