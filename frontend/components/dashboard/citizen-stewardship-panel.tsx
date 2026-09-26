"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Award, Heart, Leaf, RefreshCw, TreePine } from "lucide-react";
import { citizen, type StewardshipTree } from "@/lib/citizen-api";
import { showToast } from "@/components/toast";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";

function TreeCard({
  tree,
  actionLabel,
  onAction,
  busy,
}: {
  tree: StewardshipTree;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
}) {
  const t = useTranslations("stewardshipPanel");

  return (
    <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{tree.nickname || tree.species_text || t("treeFallback")}</p>
          <p className="font-mono text-xs text-stone-500">{tree.public_code}</p>
          {tree.owner_name ? (
            <p className="mt-1 text-xs text-stone-500">{t("plantedBy", { name: tree.owner_name })}</p>
          ) : null}
        </div>
        {tree.next_checkin_due ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            {t("checkInDue")}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
            {t("onTrack")}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
        {tree.days_since_planted != null ? (
          <span>{t("daysOld", { days: tree.days_since_planted })}</span>
        ) : null}
        <span>{t("checkIns", { count: tree.stewardship_checkins })}</span>
        {tree.survival_status ? <span className="capitalize">{tree.survival_status}</span> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/trees/${tree.id}`} className="btn-secondary text-xs">
          {t("viewTree")}
        </Link>
        {tree.next_checkin_due ? (
          <Link href={`/trees/${tree.id}?checkin=1`} className="btn-primary text-xs">
            {t("checkIn")}
          </Link>
        ) : null}
        {actionLabel && onAction ? (
          <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CitizenStewardshipPanel({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("stewardshipPanel");
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["citizen-profile"], queryFn: () => citizen.profile() });
  const stewardshipQ = useQuery({ queryKey: ["citizen-stewardship"], queryFn: () => citizen.stewardship() });
  const adoptableQ = useQuery({
    queryKey: ["citizen-adoptable"],
    queryFn: () => citizen.adoptable({ page_size: compact ? 3 : 6 }),
    enabled: !compact || (profileQ.data?.trees_owned ?? 0) > 0,
  });

  const adopt = useMutation({
    mutationFn: (treeId: string) => citizen.adoptTree(treeId),
    onSuccess: (result) => {
      showToast(
        result.new_badges.length
          ? t("adoptedBadgeToast", { badge: result.new_badges[0]?.label ?? "" })
          : t("adoptedToast"),
      );
      qc.invalidateQueries({ queryKey: ["citizen-profile"] });
      qc.invalidateQueries({ queryKey: ["citizen-stewardship"] });
      qc.invalidateQueries({ queryKey: ["citizen-adoptable"] });
    },
    onError: (err) => showToast(errorMessage(err)),
  });

  const profile = profileQ.data;
  const stewardship = stewardshipQ.data;

  if (profileQ.isLoading || stewardshipQ.isLoading) {
    return <p className="text-sm text-stone-500">{t("loading")}</p>;
  }

  return (
    <div className="space-y-4">
      {profile ? (
        <div className={cn("grid gap-3", compact ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
          <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
            <p className="text-xs uppercase tracking-wide text-stone-500">{t("points")}</p>
            <p className="mt-1 text-2xl font-semibold text-forest-800">{profile.points}</p>
          </div>
          <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
            <p className="text-xs uppercase tracking-wide text-stone-500">{t("streak")}</p>
            <p className="mt-1 text-2xl font-semibold">{profile.stewardship_streak} wk</p>
          </div>
          <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
            <p className="text-xs uppercase tracking-wide text-stone-500">{t("badges")}</p>
            <p className="mt-1 text-2xl font-semibold">{profile.badges.length}</p>
          </div>
          {!compact ? (
            <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
              <p className="text-xs uppercase tracking-wide text-stone-500">{t("dueCheckIns")}</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{stewardship?.due_count ?? 0}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {profile && profile.badges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {profile.badges.map((badge) => (
            <span
              key={badge.id}
              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-900"
              title={badge.description}
            >
              <Award className="h-3.5 w-3.5" />
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}

      {stewardship && stewardship.due_count > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20">
          <RefreshCw className="mr-1 inline h-4 w-4" />
          {t("dueAlert", { count: stewardship.due_count })}
        </div>
      ) : null}

      {!compact ? (
        <>
          <section>
            <div className="mb-3 flex items-center gap-2">
              <TreePine className="h-5 w-5 text-forest-700" />
              <h3 className="font-semibold">{t("yourGrove")}</h3>
            </div>
            {!stewardship?.owned.length ? (
              <p className="text-sm text-stone-500">{t("noTreesYet")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {stewardship.owned.map((tree) => (
                  <TreeCard key={tree.id} tree={tree} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-600" />
              <h3 className="font-semibold">{t("treesYouSteward")}</h3>
            </div>
            {!stewardship?.adopted.length ? (
              <p className="text-sm text-stone-500">{t("noAdopted")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {stewardship.adopted.map((tree) => (
                  <TreeCard key={tree.id} tree={tree} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">{t("adoptTree")}</h3>
            </div>
            {!adoptableQ.data?.items.length ? (
              <p className="text-sm text-stone-500">{t("noAdoptable")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {adoptableQ.data.items.map((tree) => (
                  <TreeCard
                    key={tree.id}
                    tree={tree}
                    actionLabel={t("adopt")}
                    busy={adopt.isPending}
                    onAction={() => adopt.mutate(tree.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
