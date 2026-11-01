// UC #2-1 tile map maths: fits OpenStreetMap raster tiles and pins into a fixed-size view (Web Mercator, no SDK).
import type { LatLng } from '../../logic/geo';

export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const TILE_SIZE = 256;
const MIN_ZOOM = 10;
const MAX_ZOOM = 16;
/** Pixels kept clear around the outermost pins so they are not clipped. */
const PIN_PADDING = 32;

export interface Tile {
  key: string;
  url: string;
  left: number;
  top: number;
}

export interface PlacedPin<T> {
  item: T;
  x: number;
  y: number;
}

export interface TileView<T> {
  zoom: number;
  tiles: Tile[];
  pins: PlacedPin<T>[];
}

/** World pixel position at `zoom` (Web Mercator, as used by OSM tiles). */
export function worldPx({ lat, lng }: LatLng, zoom: number): { x: number; y: number } {
  const size = TILE_SIZE * 2 ** zoom;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size,
  };
}

/** Highest zoom that fits every pin inside width x height, then the tiles covering the view. Null if nothing to show. */
export function fitTileView<T extends LatLng>(
  items: readonly T[],
  width: number,
  height: number,
): TileView<T> | null {
  if (items.length === 0 || width <= 0 || height <= 0) return null;
  let zoom = MAX_ZOOM;
  for (; zoom > MIN_ZOOM; zoom--) {
    const px = items.map((p) => worldPx(p, zoom));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const fitsX = Math.max(...xs) - Math.min(...xs) <= Math.max(0, width - 2 * PIN_PADDING);
    const fitsY = Math.max(...ys) - Math.min(...ys) <= Math.max(0, height - 2 * PIN_PADDING);
    if (fitsX && fitsY) break;
  }
  const px = items.map((p) => worldPx(p, zoom));
  const xs = px.map((p) => p.x);
  const ys = px.map((p) => p.y);
  // Whole pixels so tiles meet without hairline seams.
  const left = Math.round((Math.min(...xs) + Math.max(...xs)) / 2 - width / 2);
  const top = Math.round((Math.min(...ys) + Math.max(...ys)) / 2 - height / 2);
  const n = 2 ** zoom;
  const tiles: Tile[] = [];
  for (let ty = Math.floor(top / TILE_SIZE); ty * TILE_SIZE < top + height; ty++) {
    for (let tx = Math.floor(left / TILE_SIZE); tx * TILE_SIZE < left + width; tx++) {
      if (ty < 0 || ty >= n) continue;
      const wx = ((tx % n) + n) % n;
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        url: OSM_TILE_URL.replace('{z}', String(zoom))
          .replace('{x}', String(wx))
          .replace('{y}', String(ty)),
        left: tx * TILE_SIZE - left,
        top: ty * TILE_SIZE - top,
      });
    }
  }
  return {
    zoom,
    tiles,
    pins: items.map((item, i) => ({ item, x: px[i]!.x - left, y: px[i]!.y - top })),
  };
}
