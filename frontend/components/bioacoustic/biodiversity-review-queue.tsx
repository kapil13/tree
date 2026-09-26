"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { bioacoustic, errorMessage, type ReviewQueueItem } from "@/lib/api";

export function BiodiversityReviewQueue({
  items,
  onReviewed,
}: {
  items: ReviewQueueItem[];
  onReviewed?: () => void;
}) {
  const qc = useQueryClient();
  const reviewMut = useMutation({
    mutationFn: ({
      recordingId,
      scientificName,
      decision,
    }: {
      recordingId: string;
      scientificName: string;
      decision: "confirmed" | "rejected" | "indeterminate";
    }) => bioacoustic.submitReview(recordingId, { scientific_name: scientificName, decision }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bio-review-queue"] });
      qc.invalidateQueries({ queryKey: ["bioacoustic-recordings"] });
      onReviewed?.();
    },
  });

  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-500">No detections awaiting expert review.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.slice(0, 20).map((item) => (
        <li
          key={`${item.recording_id}-${item.scientific_name}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/40"
        >
          <div>
            <span className="font-medium">{item.common_name ?? item.scientific_name}</span>
            <span className="ml-2 italic text-stone-500">{item.scientific_name}</span>
            <div className="text-xs text-stone-500">
              {item.iucn_status} · {item.detection_tier} ·{" "}
              {item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "—"}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-900 hover:bg-green-200 disabled:opacity-50"
              disabled={reviewMut.isPending}
              onClick={() =>
                reviewMut.mutate({
                  recordingId: item.recording_id,
                  scientificName: item.scientific_name!,
                  decision: "confirmed",
                })
              }
            >
              <Check className="h-3.5 w-3.5" />
              Confirm
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-900 hover:bg-rose-200 disabled:opacity-50"
              disabled={reviewMut.isPending}
              onClick={() =>
                reviewMut.mutate({
                  recordingId: item.recording_id,
                  scientificName: item.scientific_name!,
                  decision: "rejected",
                })
              }
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
          {reviewMut.isError && (
            <p className="w-full text-xs text-rose-700">{errorMessage(reviewMut.error)}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
