/** Compute map viewport bounds from tree coordinates. */

export type MapPoint = { latitude: number; longitude: number };

export type LatLngBoundsLiteral = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export const MAP_FIT_PADDING = 48;
export const SINGLE_TREE_MAP_ZOOM = 15;
export const MAP_MIN_ZOOM = 5;
export const MAP_BOOTSTRAP_PAGE_SIZE = 150;

export function hasValidCoords(point: MapPoint): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

export function treesWithValidCoords<T extends MapPoint>(trees: T[]): T[] {
  return trees.filter(hasValidCoords);
}

export function boundsFromTrees(trees: MapPoint[]): LatLngBoundsLiteral | null {
  const valid = treesWithValidCoords(trees);
  if (!valid.length) return null;

  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;

  for (const tree of valid) {
    north = Math.max(north, tree.latitude);
    south = Math.min(south, tree.latitude);
    east = Math.max(east, tree.longitude);
    west = Math.min(west, tree.longitude);
  }

  return { north, south, east, west };
}

export function centroidFromTrees(trees: MapPoint[]): { lat: number; lng: number } | null {
  const valid = treesWithValidCoords(trees);
  if (!valid.length) return null;

  const lat = valid.reduce((sum, tree) => sum + tree.latitude, 0) / valid.length;
  const lng = valid.reduce((sum, tree) => sum + tree.longitude, 0) / valid.length;
  return { lat, lng };
}

export function clampMapZoom(
  zoom: number | null | undefined,
  minZoom: number = MAP_MIN_ZOOM,
): number | null {
  if (zoom == null || !Number.isFinite(zoom)) return null;
  return Math.max(zoom, minZoom);
}

export function isBootstrapTruncated(total: number, pageSize: number = MAP_BOOTSTRAP_PAGE_SIZE): boolean {
  return total > pageSize;
}

export function mergeTreesById<T extends { id: string }>(...groups: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const group of groups) {
    for (const item of group) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}
