import { redirect } from "next/navigation";

/** Legacy route — replaced by sync queue (P0). */
export default function OfflineTreesRedirectPage() {
  redirect("/field-ops/sync-queue");
}
