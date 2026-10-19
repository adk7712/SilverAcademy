// Design tokens: high-contrast colours, spacing, type scale, sizes (NFR 2.1 large text, NFR 2.2 44px targets).
import { MIN_TOUCH_TARGET_PX } from '@silveracademy/shared';

/** All text/background pairs below meet WCAG AA (most AAA) contrast. */
export const colors = {
  background: '#FFFFFF',
  surface: '#F2F5FA',
  text: '#0F1623',
  textMuted: '#3A4558',
  border: '#5B667A',
  primary: '#0B3D91',
  onPrimary: '#FFFFFF',
  secondaryBg: '#E1ECFB',
  onSecondary: '#0B3D91',
  danger: '#A31515',
  onDanger: '#FFFFFF',
  dangerBg: '#FDE8E8',
  successBg: '#DDF3E1',
  onSuccess: '#0F4D22',
  warningBg: '#FFF1C2',
  onWarning: '#5E3B00',
  infoBg: '#E1ECFB',
  onInfo: '#0B3D91',
  neutralBg: '#E4E8EF',
  onNeutral: '#0F1623',
  focusRing: '#FFB000',
  scrim: 'rgba(15, 22, 35, 0.6)',
  /** Pure black on white for the QR ticket screen (architecture: high-contrast QR). */
  qrForeground: '#000000',
  qrBackground: '#FFFFFF',
} as const;

export type ColorName = keyof typeof colors;

export const spacing = { xs: 4, sm: 8, smd: 12, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const sizes = {
  /** Never go below this for anything pressable. */
  minTouchTarget: MIN_TOUCH_TARGET_PX,
  controlHeight: 56,
  iconButton: 48,
  listItemMinHeight: 64,
  borderWidth: 1,
  focusBorderWidth: 3,
  headerMinHeight: 64,
  toastMaxWidth: 560,
} as const;

/** Base sizes in dp at font scale 1; multiplied by the user's text-size preference. */
export const typeScale = {
  caption: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  body: { fontSize: 18, lineHeight: 26, fontWeight: '400' },
  bodyStrong: { fontSize: 18, lineHeight: 26, fontWeight: '700' },
  button: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  display: { fontSize: 34, lineHeight: 42, fontWeight: '800' },
} as const;

export type TextVariant = keyof typeof typeScale;

export const TOAST_DURATION_MS = 4000;
export const LOADING_SPINNER_SIZE = 'large';
