export type MapHrefOptions = {
  projectId?: string | null;
  treeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export const TREE_FOCUS_MAP_ZOOM = 16;

export function mapHref(opts?: MapHrefOptions): string {
  const params = new URLSearchParams();

  if (opts?.projectId) {
    params.set("project", opts.projectId);
  }
  if (opts?.treeId) {
    params.set("tree", opts.treeId);
  }
  if (opts?.lat != null && Number.isFinite(opts.lat)) {
    params.set("lat", String(opts.lat));
  }
  if (opts?.lng != null && Number.isFinite(opts.lng)) {
    params.set("lng", String(opts.lng));
  }

  const query = params.toString();
  return query ? `/map?${query}` : "/map";
}

export function mapHrefForTree(tree: {
  id: string;
  project_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  return mapHref({
    treeId: tree.id,
    projectId: tree.project_id,
    lat: tree.latitude,
    lng: tree.longitude,
  });
}
