// UC #1-3 Ex2, NFR 7.4: typed MAP_UNAVAILABLE error the UI catches to fall back to the list view.
import { AppError, isAppError } from '../../errors';

export const mapUnavailable = (reason: string): AppError =>
  new AppError('MAP_UNAVAILABLE', `Map service unavailable: ${reason}`);

/** True when the UI should switch to list view (map service down/timeout). */
export const isMapUnavailable = (e: unknown): boolean =>
  isAppError(e) && e.code === 'MAP_UNAVAILABLE';
