// UC #2-1 tile map maths: fits OpenStreetMap raster tiles and pins into a fixed-size view (Web Mercator, no SDK).
import type { LatLng } from '../../logic/geo';

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const TILE_SIZE = 256;
const MIN_ZOOM = 10;
const MAX_ZOOM = 16;
/** Pixels kept clear around the outermost pins so they are not clipped. */
const PIN_PADDING = 32;

/** World pixel position at `zoom` (Web Mercator, as used by OSM tiles). */
export function worldPx({ lat, lng }: LatLng, zoom: number): { x: number; y: number } {
  const size = TILE_SIZE * 2 ** zoom;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size,
  };
}

/** Highest zoom that fits every pin in width x height, the tiles covering it, and pin positions. Null if nothing to show. */
export function fitTileView<T extends LatLng>(items: readonly T[], width: number, height: number) {
  if (items.length === 0 || width <= 0 || height <= 0) return null;
  const bounds = (zoom: number) => {
    const px = items.map((p) => worldPx(p, zoom));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    return {
      px,
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      y0: Math.min(...ys),
      y1: Math.max(...ys),
    };
  };
  let zoom = MAX_ZOOM;
  let b = bounds(zoom);
  const room = (n: number) => Math.max(0, n - 2 * PIN_PADDING);
  while (zoom > MIN_ZOOM && (b.x1 - b.x0 > room(width) || b.y1 - b.y0 > room(height)))
    b = bounds(--zoom);
  // Whole pixels so tiles meet without hairline seams.
  const left = Math.round((b.x0 + b.x1 - width) / 2);
  const top = Math.round((b.y0 + b.y1 - height) / 2);
  const tiles = [];
  for (let ty = Math.floor(top / TILE_SIZE); ty * TILE_SIZE < top + height; ty++)
    for (let tx = Math.floor(left / TILE_SIZE); tx * TILE_SIZE < left + width; tx++)
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
        left: tx * TILE_SIZE - left,
        top: ty * TILE_SIZE - top,
      });
  const pins = items.map((item, i) => ({ item, x: b.px[i]!.x - left, y: b.px[i]!.y - top }));
  return { zoom, tiles, pins };
}
