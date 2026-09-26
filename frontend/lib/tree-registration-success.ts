import { showToast } from "@/components/toast";
import { mapHrefForTree } from "@/lib/map-links";

type RegisteredTree = {
  id: string;
  public_code?: string;
  project_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function notifyTreeRegistered(tree: RegisteredTree) {
  showToast(tree.public_code ? `${tree.public_code} registered.` : "Tree registered.", {
    action: {
      label: "View on map",
      href: mapHrefForTree(tree),
    },
    durationMs: 8000,
  });
}
