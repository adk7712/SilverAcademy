// Pushes shared numeric constants into CSS variables so CSS never repeats them.
import { MIN_TOUCH_TARGET_PX } from '@silveracademy/shared';

export function applyTokens(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--touch-min', `${MIN_TOUCH_TARGET_PX}px`);
}
