// UC #2-1 tests for the OSM tile view maths.
import { TILE_SIZE, fitTileView, worldPx } from './osmTiles';

const AYER_RAJAH = { lat: 1.32096, lng: 103.7477 };
const BEDOK = { lat: 1.3236, lng: 103.93 };

it('projects the equator and prime meridian to the world centre', () => {
  expect(worldPx({ lat: 0, lng: 0 }, 1)).toEqual({ x: TILE_SIZE, y: TILE_SIZE });
});

it('returns null with no pins or no size', () => {
  expect(fitTileView([], 300, 200)).toBeNull();
  expect(fitTileView([AYER_RAJAH], 0, 200)).toBeNull();
});

it('centres one pin at max zoom and covers the view with tiles', () => {
  const v = fitTileView([AYER_RAJAH], 300, 200)!;
  expect(v.zoom).toBe(16);
  expect(v.pins[0]!.x).toBeCloseTo(150, 0);
  expect(v.pins[0]!.y).toBeCloseTo(100, 0);
  expect(v.tiles.every((t) => Number.isInteger(t.left) && Number.isInteger(t.top))).toBe(true);
  expect(fitTileView([AYER_RAJAH], 50, 50)!.zoom).toBe(16);
  expect(v.tiles[0]!.url).toMatch(/^https:\/\/tile\.openstreetmap\.org\/16\/\d+\/\d+\.png$/);
  expect(Math.min(...v.tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
  expect(Math.max(...v.tiles.map((t) => t.left + TILE_SIZE))).toBeGreaterThanOrEqual(300);
  expect(Math.max(...v.tiles.map((t) => t.top + TILE_SIZE))).toBeGreaterThanOrEqual(200);
});

it('zooms out until every pin is inside the padded view', () => {
  const v = fitTileView([AYER_RAJAH, BEDOK], 360, 260)!;
  expect(v.zoom).toBeLessThan(16);
  for (const p of v.pins) {
    expect(p.x).toBeGreaterThanOrEqual(32);
    expect(p.x).toBeLessThanOrEqual(360 - 32);
  }
});
